/**
 * VoiceChatService - Manages voice conversations with OpenAI Realtime API
 *
 * Adds handling for newer event cases:
 * - response.output_text.delta / response.output_text.done
 * - response.text.delta / response.text.done
 * - response.completed / response.in_progress / response.failed
 * - conversation.item.input_audio_transcription.delta
 * - conversation.item.input_audio_transcription.failed
 * - response.output_audio.done (compat)
 *
 * Keeps older handlers too:
 * - response.audio_transcript.delta/done
 * - response.audio.delta/done
 * - response.done
 */

const OPENAI_REALTIME_MODEL = 'gpt-realtime-mini'; // change as needed
const BACKEND_TOKEN_ENDPOINT = '/api/realtime/token';

export function createVoiceSession(systemPrompt, callbacks = {}) {
  let ws = null;
  let audioContext = null;
  let mediaStream = null;
  let audioWorkletNode = null;
  let sourceNode = null;
  let isRecording = false;
  let audioQueue = [];
  let isPlaying = false;
  let playbackContext = null;

  // Track assistant streaming text across multiple event types
  let assistantTextBuffer = '';

  const callbacksRef = {
    onTranscript: callbacks.onTranscript || (() => {}),
    onAudioResponse: callbacks.onAudioResponse || (() => {}),
    onError: callbacks.onError || (() => {}),
    onConnectionChange: callbacks.onConnectionChange || (() => {})
  };

  async function getEphemeralToken() {
    const response = await fetch(BACKEND_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OPENAI_REALTIME_MODEL,
        voice: 'alloy'
      })
    });

    if (!response.ok) throw new Error(`Failed to get token: ${response.status}`);
    const data = await response.json();
    return data.client_secret?.value || data.token;
  }

  async function connect() {
    callbacksRef.onConnectionChange('connecting');

    const token = await getEphemeralToken();
    if (!token) throw new Error('No token received from backend');

    const wsUrl = `wss://api.openai.com/v1/realtime?model=${OPENAI_REALTIME_MODEL}`;

    // Keep your existing browser-auth subprotocol pattern
    const protocols = [
      'realtime',
      `openai-insecure-api-key.${token}`,
      'openai-beta.realtime-v1'
    ];

    ws = new WebSocket(wsUrl, protocols);

    ws.onopen = () => {
      // Session config – leaving your original shape to minimize changes.
      // If your server rejects these fields, switch to the newer nested audio shape.
      ws.send(JSON.stringify({
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: systemPrompt,
          voice: 'alloy',
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          input_audio_transcription: { model: 'whisper-1' },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 700
          }
        }
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleRealtimeEvent(data);
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      callbacksRef.onError('Connection error');
      callbacksRef.onConnectionChange('error');
    };

    ws.onclose = () => {
      callbacksRef.onConnectionChange('disconnected');
      cleanup();
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Connection timeout')), 10000);

      const originalOnOpen = ws.onopen;
      ws.onopen = (event) => {
        clearTimeout(timeout);
        if (originalOnOpen) originalOnOpen(event);
        resolve();
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });
  }

  function emitAssistantDeltaText(delta) {
    if (!delta) return;
    assistantTextBuffer += delta;
    callbacksRef.onTranscript({ role: 'assistant', text: delta, isFinal: false });
  }

  function emitAssistantFinalText(finalText) {
    const text = finalText ?? assistantTextBuffer;
    if (text) {
      callbacksRef.onTranscript({ role: 'assistant', text, isFinal: true });
    }
    assistantTextBuffer = '';
  }

  function handleRealtimeEvent(event) {
    switch (event.type) {
      // --------------------
      // Session lifecycle
      // --------------------
      case 'session.created':
        callbacksRef.onConnectionChange('connected');
        break;

      case 'session.updated':
        // ok
        break;

      // --------------------
      // Input audio buffer / VAD
      // --------------------
      case 'input_audio_buffer.speech_started':
      case 'input_audio_buffer.speech_stopped':
      case 'input_audio_buffer.committed':
        // optional logging hooks
        break;

      // --------------------
      // User transcription (completed + delta + failed)
      // --------------------
      case 'conversation.item.input_audio_transcription.delta':
        // For some transcription models this can be incremental; for whisper-1 it may look “final-ish”.
        if (event.transcript) {
          callbacksRef.onTranscript({ role: 'user', text: event.transcript, isFinal: false });
        }
        break;

      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript) {
          callbacksRef.onTranscript({ role: 'user', text: event.transcript, isFinal: true });
        }
        break;

      case 'conversation.item.input_audio_transcription.failed':
        callbacksRef.onError(event.error?.message || 'Input audio transcription failed');
        break;

      // --------------------
      // Assistant text (newer event names)
      // --------------------
      case 'response.output_text.delta':
        // Newer streaming text event in the Responses-style stream. [web:26]
        emitAssistantDeltaText(event.delta);
        break;

      case 'response.output_text.done':
        // Some streams provide the final assembled text; some do not.
        // Try common fields, fall back to buffered deltas.
        emitAssistantFinalText(event.text);
        break;

      case 'response.text.delta':
        // Another variant used by some realtime stacks. [web:26]
        emitAssistantDeltaText(event.delta);
        break;

      case 'response.text.done':
        emitAssistantFinalText(event.text);
        break;

      // --------------------
      // Assistant text (older audio-transcript names)
      // --------------------
      case 'response.audio_transcript.delta':
        // Older streaming assistant text tied to audio output.
        emitAssistantDeltaText(event.delta);
        break;

      case 'response.audio_transcript.done':
        // Older final assistant transcript.
        emitAssistantFinalText(event.transcript);
        break;

      // --------------------
      // Assistant audio (PCM16 base64)
      // --------------------
      case 'response.audio.delta':
        if (event.delta) {
          const audioData = base64ToInt16Array(event.delta);
          audioQueue.push(audioData);
          if (!isPlaying) playAudioQueue();
        }
        break;

      case 'response.audio.done':
        callbacksRef.onAudioResponse({ complete: true });
        break;

      // Compatibility: some environments mention output_audio.done
      case 'response.output_audio.done':
        callbacksRef.onAudioResponse({ complete: true });
        break;

      // --------------------
      // Response lifecycle (newer)
      // --------------------
      case 'response.in_progress':
        // Response started generating. [web:29]
        break;

      case 'response.completed':
        // Official completion event in some streams. [web:29]
        // Ensure any buffered assistant text is finalized.
        emitAssistantFinalText(undefined);
        break;

      case 'response.failed':
        callbacksRef.onError(event.error?.message || 'Response failed');
        break;

      // --------------------
      // Response lifecycle (older)
      // --------------------
      case 'response.done':
        // Seen in some realtime guides/implementations.
        emitAssistantFinalText(undefined);
        break;

      // --------------------
      // General errors
      // --------------------
      case 'error':
        // Treat empty-commit as non-fatal
        if (event.error?.code === 'input_audio_buffer_commit_empty') break;
        callbacksRef.onError(event.error?.message || 'Unknown error');
        break;

      default:
        // ignore
        break;
    }
  }

  async function startRecording() {
    if (isRecording) return;

    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 24000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    audioContext = new AudioContext({ sampleRate: 24000 });
    if (audioContext.state === 'suspended') await audioContext.resume();

    sourceNode = audioContext.createMediaStreamSource(mediaStream);

    const workletUrl = createAudioWorkletProcessor();
    await audioContext.audioWorklet.addModule(workletUrl);
    URL.revokeObjectURL(workletUrl);

    audioWorkletNode = new AudioWorkletNode(audioContext, 'audio-processor', {
      processorOptions: { bufferSize: 4096 }
    });

    audioWorkletNode.port.onmessage = (event) => {
      if (ws && ws.readyState === WebSocket.OPEN && isRecording) {
        const audioBase64 = int16ArrayToBase64(new Int16Array(event.data.buffer));
        ws.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: audioBase64 }));
      }
    };

    sourceNode.connect(audioWorkletNode);
    isRecording = true;
  }

  function stopRecording() {
    if (!isRecording) return;
    isRecording = false;

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
    }

    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop());
      mediaStream = null;
    }

    if (sourceNode) {
      sourceNode.disconnect();
      sourceNode = null;
    }

    if (audioWorkletNode) {
      audioWorkletNode.disconnect();
      audioWorkletNode.port.close();
      audioWorkletNode = null;
    }

    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close();
      audioContext = null;
    }
  }

  async function playAudioQueue() {
    if (isPlaying || audioQueue.length === 0) return;
    isPlaying = true;

    if (!playbackContext || playbackContext.state === 'closed') {
      playbackContext = new AudioContext({ sampleRate: 24000 });
    }

    while (audioQueue.length > 0) {
      const pcmData = audioQueue.shift();
      await playPCM16Chunk(pcmData);
    }

    isPlaying = false;
  }

  function playPCM16Chunk(int16Data) {
    return new Promise((resolve) => {
      if (!playbackContext || playbackContext.state === 'closed') {
        playbackContext = new AudioContext({ sampleRate: 24000 });
      }

      const float32Data = new Float32Array(int16Data.length);
      for (let i = 0; i < int16Data.length; i++) float32Data[i] = int16Data[i] / 32768.0;

      const audioBuffer = playbackContext.createBuffer(1, float32Data.length, 24000);
      audioBuffer.getChannelData(0).set(float32Data);

      const source = playbackContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(playbackContext.destination);
      source.onended = resolve;
      source.start();
    });
  }

  function interrupt() {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'response.cancel' }));
    }
    audioQueue = [];
    isPlaying = false;
    assistantTextBuffer = '';
  }

  function sendTextMessage(text) {
    if (!(ws && ws.readyState === WebSocket.OPEN)) return;

    ws.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }]
      }
    }));

    ws.send(JSON.stringify({ type: 'response.create' }));
  }

  function cleanup() {
    isRecording = false;
    isPlaying = false;
    assistantTextBuffer = '';

    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      mediaStream = null;
    }

    if (sourceNode) {
      sourceNode.disconnect();
      sourceNode = null;
    }

    if (audioWorkletNode) {
      audioWorkletNode.disconnect();
      audioWorkletNode = null;
    }

    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close();
      audioContext = null;
    }

    if (playbackContext && playbackContext.state !== 'closed') {
      playbackContext.close();
      playbackContext = null;
    }

    audioQueue = [];
  }

  function disconnect() {
    stopRecording();

    if (ws) {
      if (ws.readyState === WebSocket.OPEN) ws.close(1000, 'Client disconnect');
      ws = null;
    }

    cleanup();
    callbacksRef.onConnectionChange('disconnected');
  }

  async function checkMicrophoneAvailable() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some(d => d.kind === 'audioinput');
    } catch {
      return false;
    }
  }

  function getConnectionState() {
    if (!ws) return 'disconnected';
    switch (ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'connected';
      case WebSocket.CLOSING: return 'disconnecting';
      case WebSocket.CLOSED: return 'disconnected';
      default: return 'unknown';
    }
  }

  return {
    connect,
    disconnect,
    startRecording,
    stopRecording,
    interrupt,
    sendTextMessage,
    isRecording: () => isRecording,
    isConnected: () => ws && ws.readyState === WebSocket.OPEN,
    getConnectionState,
    checkMicrophoneAvailable,

    set onTranscript(fn) { callbacksRef.onTranscript = fn; },
    set onConnectionChange(fn) { callbacksRef.onConnectionChange = fn; },
    set onError(fn) { callbacksRef.onError = fn; },
    set onAudioResponse(fn) { callbacksRef.onAudioResponse = fn; }
  };
}

// ============= Helper Functions =============

function base64ToInt16Array(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return new Int16Array(bytes.buffer);
}

function int16ArrayToBase64(int16Array) {
  const uint8Array = new Uint8Array(int16Array.buffer);
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) binary += String.fromCharCode(uint8Array[i]);
  return btoa(binary);
}

function createAudioWorkletProcessor() {
  const processorCode = `
    class AudioProcessor extends AudioWorkletProcessor {
      constructor(options) {
        super();
        this.bufferSize = options.processorOptions?.bufferSize || 4096;
        this.buffer = new Float32Array(this.bufferSize);
        this.bufferIndex = 0;
      }

      process(inputs) {
        const input = inputs[0];
        if (!input || !input[0]) return true;
        const inputChannel = input[0];

        for (let i = 0; i < inputChannel.length; i++) {
          this.buffer[this.bufferIndex++] = inputChannel[i];

          if (this.bufferIndex >= this.bufferSize) {
            const pcmData = new Int16Array(this.bufferSize);
            for (let j = 0; j < this.bufferSize; j++) {
              const sample = Math.max(-1, Math.min(1, this.buffer[j]));
              pcmData[j] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
            }
            this.port.postMessage({ buffer: pcmData.buffer }, [pcmData.buffer]);
            this.buffer = new Float32Array(this.bufferSize);
            this.bufferIndex = 0;
          }
        }
        return true;
      }
    }
    registerProcessor('audio-processor', AudioProcessor);
  `;
  const blob = new Blob([processorCode], { type: 'application/javascript' });
  return URL.createObjectURL(blob);
}

if (typeof window !== 'undefined') {
  window.AudioContext = window.AudioContext || window.webkitAudioContext;
}

export default createVoiceSession;
