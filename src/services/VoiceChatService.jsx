/**
 * VoiceChatService - Manages voice conversations with OpenAI Realtime API
 *
 * This service handles:
 * - WebSocket connection to OpenAI Realtime API via backend proxy
 * - Audio recording from microphone
 * - Real-time audio streaming and transcription
 * - Audio playback of AI responses using PCM16 format
 */

const OPENAI_REALTIME_MODEL = 'gpt-4o-realtime-preview-2024-12-17';

// Backend endpoint to get ephemeral token (you need to implement this)
const BACKEND_TOKEN_ENDPOINT = import.meta.env.VITE_BACKEND_URL || '/api/realtime/token';

/**
 * Creates a new voice chat session
 * @param {string} systemPrompt - System instructions for the AI
 * @param {Object} callbacks - Event callbacks
 * @returns {Object} - Voice session controller
 */
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

  // Use a mutable callbacks object so setters can update it
  const callbacksRef = {
    onTranscript: callbacks.onTranscript || (() => {}),
    onAudioResponse: callbacks.onAudioResponse || (() => {}),
    onError: callbacks.onError || (() => {}),
    onConnectionChange: callbacks.onConnectionChange || (() => {})
  };

  /**
   * Gets ephemeral token from backend
   */
  async function getEphemeralToken() {
    try {
      const response = await fetch(BACKEND_TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: OPENAI_REALTIME_MODEL,
          voice: 'alloy'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to get token: ${response.status}`);
      }

      const data = await response.json();
      return data.client_secret?.value || data.token;
    } catch (error) {
      console.error('Failed to get ephemeral token:', error);
      throw error;
    }
  }

  /**
   * Connects to OpenAI Realtime API via WebSocket
   */
  async function connect() {
    try {
      console.log('Connecting to OpenAI Realtime API...');
      callbacksRef.onConnectionChange('connecting');

      // Get ephemeral token from backend
      const token = await getEphemeralToken();

      if (!token) {
        throw new Error('No token received from backend');
      }

      const wsUrl = `wss://api.openai.com/v1/realtime?model=${OPENAI_REALTIME_MODEL}`;

      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected, authenticating...');

        // Authenticate with the token
        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: systemPrompt,
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 700
            }
          }
        }));
      };

      // Add authorization header via first message
      ws.addEventListener('open', () => {
        // For direct WebSocket, we need to send auth in a specific way
        // This depends on your backend implementation
      });

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

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        callbacksRef.onConnectionChange('disconnected');
        cleanup();
      };

      // Return a promise that resolves when connected
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);

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

    } catch (error) {
      console.error('Failed to connect:', error);
      callbacksRef.onError('Failed to connect to voice service');
      callbacksRef.onConnectionChange('error');
      throw error;
    }
  }

  /**
   * Alternative: Connect using direct API key (for development only!)
   * WARNING: Never use this in production - exposes your API key
   */
  async function connectDirect(apiKey) {
    if (!apiKey) {
      throw new Error('API key required for direct connection');
    }

    console.warn('⚠️ Using direct connection - DO NOT use in production!');
    callbacksRef.onConnectionChange('connecting');

    const wsUrl = `wss://api.openai.com/v1/realtime?model=${OPENAI_REALTIME_MODEL}`;

    return new Promise((resolve, reject) => {
      ws = new WebSocket(wsUrl, [
        'realtime',
        `openai-insecure-api-key.${apiKey}`,
        'openai-beta.realtime-v1'
      ]);

      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('Connection timeout'));
      }, 10000);

      ws.onopen = () => {
        clearTimeout(timeout);
        console.log('Connected to OpenAI Realtime API');
        callbacksRef.onConnectionChange('connected');

        // Configure session
        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: systemPrompt,
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 700
            }
          }
        }));

        resolve();
      };

      ws.onmessage = (event) => {
        try {
          handleRealtimeEvent(JSON.parse(event.data));
        } catch (e) {
          console.error('Failed to parse message:', e);
        }
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        console.error('WebSocket error:', error);
        callbacksRef.onError('Connection failed - check API key and network');
        callbacksRef.onConnectionChange('error');
        reject(error);
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        if (event.code === 1008) {
          callbacksRef.onError('Authentication failed - check API key');
        }
        callbacksRef.onConnectionChange('disconnected');
        cleanup();
      };
    });
  }

  /**
   * Handles events from OpenAI Realtime API
   */
  function handleRealtimeEvent(event) {
    // console.log('Realtime event:', event.type);

    switch (event.type) {
      case 'session.created':
        console.log('Session created:', event.session?.id);
        callbacksRef.onConnectionChange('connected');
        break;

      case 'session.updated':
        console.log('Session configured successfully');
        break;

      case 'conversation.item.created':
        // New conversation item
        break;

      case 'input_audio_buffer.speech_started':
        console.log('Speech detected');
        break;

      case 'input_audio_buffer.speech_stopped':
        console.log('Speech ended');
        break;

      case 'input_audio_buffer.committed':
        console.log('Audio buffer committed');
        break;

      case 'conversation.item.input_audio_transcription.completed':
        // User's speech transcription
        if (event.transcript) {
          callbacksRef.onTranscript({
            role: 'user',
            text: event.transcript,
            isFinal: true
          });
        }
        break;

      case 'response.audio_transcript.delta':
        // Streaming assistant text
        if (event.delta) {
          callbacksRef.onTranscript({
            role: 'assistant',
            text: event.delta,
            isFinal: false
          });
        }
        break;

      case 'response.audio_transcript.done':
        // Complete assistant transcription
        if (event.transcript) {
          callbacksRef.onTranscript({
            role: 'assistant',
            text: event.transcript,
            isFinal: true
          });
        }
        break;

      case 'response.audio.delta':
        // Audio chunk from assistant
        if (event.delta) {
          const audioData = base64ToInt16Array(event.delta);
          audioQueue.push(audioData);
          if (!isPlaying) {
            playAudioQueue();
          }
        }
        break;

      case 'response.audio.done':
        console.log('Audio response complete');
        callbacksRef.onAudioResponse({ complete: true });
        break;

      case 'response.done':
        console.log('Response complete');
        break;

      case 'error':
        console.error('Realtime API error:', event.error);

        // Handle empty audio buffer as warning, not error
        if (event.error?.code === 'input_audio_buffer_commit_empty') {
          console.warn('Empty audio buffer - user released mic too quickly');
          // Don't show error to user, just ignore
          break;
        }

        // For other errors, notify the user
        callbacksRef.onError(event.error?.message || 'Unknown error');
        break;

      default:
        // Log unhandled events for debugging
        // console.log('Unhandled event:', event.type);
        break;
    }
  }

  /**
   * Starts recording audio from microphone
   */
  async function startRecording() {
    if (isRecording) {
      console.warn('Already recording');
      return;
    }

    try {
      // Request microphone access
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 24000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Create audio context at 24kHz (required by OpenAI)
      audioContext = new AudioContext({ sampleRate: 24000 });

      // Resume if suspended
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      sourceNode = audioContext.createMediaStreamSource(mediaStream);

      // Create and load audio worklet
      const workletUrl = createAudioWorkletProcessor();
      await audioContext.audioWorklet.addModule(workletUrl);
      URL.revokeObjectURL(workletUrl);

      audioWorkletNode = new AudioWorkletNode(audioContext, 'audio-processor', {
        processorOptions: {
          bufferSize: 4096
        }
      });

      audioWorkletNode.port.onmessage = (event) => {
        if (ws && ws.readyState === WebSocket.OPEN && isRecording) {
          const audioBase64 = int16ArrayToBase64(new Int16Array(event.data.buffer));
          ws.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: audioBase64
          }));
        }
      };

      sourceNode.connect(audioWorkletNode);
      // Don't connect to destination to avoid feedback

      isRecording = true;
      console.log('Recording started');

    } catch (error) {
      console.error('Failed to start recording:', error);
      callbacksRef.onError('Microphone access denied or not available');
      throw error;
    }
  }

  /**
   * Stops recording audio
   */
  function stopRecording() {
    if (!isRecording) return;

    isRecording = false;

    // Commit the audio buffer to trigger processing
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'input_audio_buffer.commit'
      }));
    }

    // Stop media stream tracks
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      mediaStream = null;
    }

    // Disconnect audio nodes
    if (sourceNode) {
      sourceNode.disconnect();
      sourceNode = null;
    }

    if (audioWorkletNode) {
      audioWorkletNode.disconnect();
      audioWorkletNode.port.close();
      audioWorkletNode = null;
    }

    // Close recording audio context
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close();
      audioContext = null;
    }

    console.log('Recording stopped');
  }

  /**
   * Plays queued audio chunks
   */
  async function playAudioQueue() {
    if (isPlaying || audioQueue.length === 0) return;

    isPlaying = true;

    // Create playback context if needed
    if (!playbackContext || playbackContext.state === 'closed') {
      playbackContext = new AudioContext({ sampleRate: 24000 });
    }

    while (audioQueue.length > 0) {
      const pcmData = audioQueue.shift();
      await playPCM16Chunk(pcmData);
    }

    isPlaying = false;
  }

  /**
   * Plays a PCM16 audio chunk
   */
  function playPCM16Chunk(int16Data) {
    return new Promise((resolve) => {
      if (!playbackContext || playbackContext.state === 'closed') {
        playbackContext = new AudioContext({ sampleRate: 24000 });
      }

      // Convert Int16 to Float32 for Web Audio API
      const float32Data = new Float32Array(int16Data.length);
      for (let i = 0; i < int16Data.length; i++) {
        float32Data[i] = int16Data[i] / 32768.0;
      }

      // Create audio buffer
      const audioBuffer = playbackContext.createBuffer(1, float32Data.length, 24000);
      audioBuffer.getChannelData(0).set(float32Data);

      // Create and play source
      const source = playbackContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(playbackContext.destination);
      source.onended = resolve;
      source.start();
    });
  }

  /**
   * Interrupts current AI response
   */
  function interrupt() {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'response.cancel'
      }));
    }

    // Clear audio queue
    audioQueue = [];
    isPlaying = false;
  }

  /**
   * Sends a text message (for testing without voice)
   */
  function sendTextMessage(text) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [{
            type: 'input_text',
            text: text
          }]
        }
      }));

      ws.send(JSON.stringify({
        type: 'response.create'
      }));
    }
  }

  /**
   * Cleanup all resources
   */
  function cleanup() {
    isRecording = false;
    isPlaying = false;

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

  /**
   * Disconnects from the service
   */
  function disconnect() {
    stopRecording();

    if (ws) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1000, 'Client disconnect');
      }
      ws = null;
    }

    cleanup();
    callbacksRef.onConnectionChange('disconnected');
  }

  /**
   * Checks if microphone is available
   */
  async function checkMicrophoneAvailable() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some(device => device.kind === 'audioinput');
    } catch {
      return false;
    }
  }

  /**
   * Gets current connection state
   */
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

  // Public API
  return {
    connect,
    connectDirect,
    disconnect,
    startRecording,
    stopRecording,
    interrupt,
    sendTextMessage,
    isRecording: () => isRecording,
    isConnected: () => ws && ws.readyState === WebSocket.OPEN,
    getConnectionState,
    checkMicrophoneAvailable,

    // Callback setters for VoiceInterface
    set onTranscript(fn) { callbacksRef.onTranscript = fn; },
    set onConnectionChange(fn) { callbacksRef.onConnectionChange = fn; },
    set onError(fn) { callbacksRef.onError = fn; },
    set onAudioResponse(fn) { callbacksRef.onAudioResponse = fn; }
  };
}

// ============= Helper Functions =============

/**
 * Convert base64 to Int16Array (PCM16)
 */
function base64ToInt16Array(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Int16Array(bytes.buffer);
}

/**
 * Convert Int16Array to base64
 */
function int16ArrayToBase64(int16Array) {
  const uint8Array = new Uint8Array(int16Array.buffer);
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
}

/**
 * Creates audio worklet processor code as a blob URL
 */
function createAudioWorkletProcessor() {
  const processorCode = `
    class AudioProcessor extends AudioWorkletProcessor {
      constructor(options) {
        super();
        this.bufferSize = options.processorOptions?.bufferSize || 4096;
        this.buffer = new Float32Array(this.bufferSize);
        this.bufferIndex = 0;
      }

      process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (!input || !input[0]) return true;

        const inputChannel = input[0];

        for (let i = 0; i < inputChannel.length; i++) {
          this.buffer[this.bufferIndex++] = inputChannel[i];

          if (this.bufferIndex >= this.bufferSize) {
            // Convert float32 [-1, 1] to int16 PCM
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

// Browser compatibility
if (typeof window !== 'undefined') {
  window.AudioContext = window.AudioContext || window.webkitAudioContext;
}

export default createVoiceSession;