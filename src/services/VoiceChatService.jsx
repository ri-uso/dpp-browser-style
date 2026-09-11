/**
 * VoiceChatService - conversazione vocale con il prodotto (Realtime API GA).
 *
 * Usa WebRTC, il trasporto che OpenAI raccomanda per il browser: la cattura del
 * microfono, il jitter buffer e la riproduzione li gestisce il browser stesso.
 * La versione precedente faceva tutto a mano via WebSocket (AudioWorklet,
 * conversione PCM16, coda di riproduzione chunk-per-chunk) ed e' stata rimossa:
 * era la fonte dei click tra un chunk e l'altro e della latenza a ogni ripresa.
 *
 * Flusso:
 *   1. il nostro backend conia una chiave effimera `ek_...` (/api/realtime/token)
 *      con il system prompt gia' dentro la sessione;
 *   2. il browser crea una RTCPeerConnection e scambia l'SDP con
 *      POST https://api.openai.com/v1/realtime/calls;
 *   3. l'audio del modello arriva su una media track, gli eventi JSON sul data
 *      channel "oai-events".
 */

const BACKEND_TOKEN_ENDPOINT = '/api/realtime/token';
const OPENAI_CALLS_ENDPOINT = 'https://api.openai.com/v1/realtime/calls';

/** @see api/realtime/token.js - il backend ignora valori non ammessi. */
const VOICE = 'marin';

const CONNECT_TIMEOUT_MS = 15_000;

/**
 * Ogni quanti turni dell'assistente ri-affermare le istruzioni di sessione.
 *
 * Nella chat scritta il system prompt viaggia in ogni richiesta, quindi la
 * persona resta sempre alla stessa distanza dalla risposta. Qui invece le
 * istruzioni vengono messe una volta sola nella chiave effimera e poi
 * arretrano man mano che i turni audio si accumulano: il modello finiva per
 * appoggiarsi alla conversazione recente e uscire di personaggio. Un
 * `session.update` periodico le riporta in primo piano.
 *
 * Quattro turni sono un compromesso: abbastanza spesso da contenere la deriva,
 * abbastanza raro da non pesare sul contesto a ogni scambio.
 */
const REASSERT_INSTRUCTIONS_EVERY = 4;

export function createVoiceSession(systemPrompt, callbacks = {}) {
  let pc = null;
  let dataChannel = null;
  let micStream = null;
  let micTrack = null;
  let audioElement = null;
  let connectionState = 'disconnected';

  // Il transcript dell'assistente arriva a pezzi: lo accumuliamo per poter
  // emettere una versione finale anche quando l'evento di chiusura non porta
  // il testo completo.
  let assistantBuffer = '';

  // Di quale evento ci stiamo fidando per il testo della risposta in corso.
  // La sessione puo' emettere sia `response.output_audio_transcript.delta` sia
  // `response.output_text.delta` per lo stesso contenuto: trattandoli entrambi
  // il testo compariva due volte di fila a schermo. Vince il primo che arriva.
  let deltaSource = null;

  // Il saluto di apertura si chiede una volta sola per sessione: se il data
  // channel si riaprisse, un secondo `response.create` lo farebbe ripetere.
  let greetingRequested = false;

  // Turni gia' pronunciati dall'assistente, per scandire il ri-ancoraggio.
  let assistantTurns = 0;

  const handlers = {
    onTranscript: callbacks.onTranscript || (() => {}),
    onAudioResponse: callbacks.onAudioResponse || (() => {}),
    onError: callbacks.onError || (() => {}),
    onConnectionChange: callbacks.onConnectionChange || (() => {})
  };

  function setState(state) {
    if (connectionState === state) return;
    connectionState = state;
    handlers.onConnectionChange(state);
  }

  function fail(message) {
    handlers.onError(message);
  }

  async function getEphemeralToken() {
    const response = await fetch(BACKEND_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voice: VOICE, instructions: systemPrompt })
    });

    if (!response.ok) {
      const detail = await response.json().catch(() => null);
      throw new Error(detail?.error || `Impossibile ottenere il token (${response.status})`);
    }

    const { token } = await response.json();
    if (!token) throw new Error('Il backend non ha restituito un token');
    return token;
  }

  async function connect() {
    if (pc) disconnect();
    setState('connecting');

    try {
      const token = await getEphemeralToken();

      pc = new RTCPeerConnection();

      // L'audio del modello: basta agganciare lo stream remoto a un <audio>.
      audioElement = new Audio();
      audioElement.autoplay = true;
      pc.ontrack = (event) => {
        audioElement.srcObject = event.streams[0];
      };

      micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      micTrack = micStream.getAudioTracks()[0];
      // Si parte a microfono chiuso: e' l'utente a decidere quando parlare.
      micTrack.enabled = false;
      pc.addTrack(micTrack, micStream);

      dataChannel = pc.createDataChannel('oai-events');

      // Senza questo il prodotto resta muto finche' non parla l'utente, che si
      // ritrova davanti un microfono e nessun contesto. Il saluto di apertura
      // e' gia' descritto nelle istruzioni di sessione (una frase sola), quindi
      // qui basta chiedere una risposta: nessun override, la persona resta.
      dataChannel.onopen = () => {
        if (greetingRequested) return;
        greetingRequested = true;
        send({ type: 'response.create' });
      };

      dataChannel.onmessage = (event) => {
        try {
          handleServerEvent(JSON.parse(event.data));
        } catch (e) {
          console.error('Evento realtime non parsabile:', e);
        }
      };

      pc.onconnectionstatechange = () => {
        if (!pc) return;
        if (pc.connectionState === 'connected') {
          setState('connected');
        } else if (pc.connectionState === 'failed') {
          // Diversamente dalla versione WebSocket, qui l'handler resta attivo
          // per tutta la durata della sessione: gli errori a meta' conversazione
          // arrivano davvero alla UI.
          fail('Connessione audio interrotta');
          setState('error');
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
          setState('disconnected');
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Il modello e la configurazione di sessione viaggiano gia' dentro la
      // chiave effimera: qui serve solo l'SDP, come corpo grezzo.
      const sdpResponse = await fetch(OPENAI_CALLS_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/sdp'
        },
        body: offer.sdp,
        signal: AbortSignal.timeout(CONNECT_TIMEOUT_MS)
      });

      if (!sdpResponse.ok) {
        const detail = await sdpResponse.text();
        throw new Error(`Scambio SDP fallito (${sdpResponse.status}): ${detail.slice(0, 200)}`);
      }

      await pc.setRemoteDescription({
        type: 'answer',
        sdp: await sdpResponse.text()
      });
    } catch (error) {
      cleanup();
      setState('error');
      throw error;
    }
  }

  function send(event) {
    if (dataChannel?.readyState === 'open') {
      dataChannel.send(JSON.stringify(event));
      return true;
    }
    return false;
  }

  /**
   * Rimette le istruzioni in primo piano senza toccare il resto della sessione.
   *
   * `session.update` e' un merge parziale: cambiano solo i campi indicati, e
   * voce e modello restano quelli fissati alla creazione della chiave effimera
   * (non sarebbero comunque modificabili a sessione avviata).
   */
  function reassertInstructions() {
    if (!systemPrompt) return;
    send({
      type: 'session.update',
      session: { type: 'realtime', instructions: systemPrompt }
    });
  }

  function emitDelta(role, text) {
    if (!text) return;
    if (role === 'assistant') assistantBuffer += text;
    handlers.onTranscript({ role, text, isFinal: false });
  }

  /**
   * Accetta i delta dell'assistente da una sola sorgente per risposta.
   * @param {string} source - il tipo di evento che porta il delta
   */
  function emitAssistantDelta(source, text) {
    if (deltaSource === null) deltaSource = source;
    if (deltaSource !== source) return;
    emitDelta('assistant', text);
  }

  function emitFinal(role, text) {
    const finalText = text || (role === 'assistant' ? assistantBuffer : '');
    if (finalText) handlers.onTranscript({ role, text: finalText, isFinal: true });
    if (role === 'assistant') {
      assistantBuffer = '';
      // La risposta e' chiusa: la prossima ricomincia a scegliere la sorgente.
      deltaSource = null;
    }
  }

  function handleServerEvent(event) {
    switch (event.type) {
      case 'session.created':
      case 'session.updated':
        setState('connected');
        break;

      // --- Trascrizione di cio' che dice l'utente ---
      case 'conversation.item.input_audio_transcription.delta':
        emitDelta('user', event.delta);
        break;

      case 'conversation.item.input_audio_transcription.completed':
        emitFinal('user', event.transcript);
        break;

      case 'conversation.item.input_audio_transcription.failed':
        fail(event.error?.message || 'Trascrizione non riuscita');
        break;

      // --- Testo dell'assistente (nomi eventi GA) ---
      // Una nuova risposta riparte da zero, sorgente dei delta compresa.
      case 'response.created':
        assistantBuffer = '';
        deltaSource = null;
        break;

      case 'response.output_audio_transcript.delta':
        emitAssistantDelta('audio_transcript', event.delta);
        break;

      case 'response.output_text.delta':
        emitAssistantDelta('text', event.delta);
        break;

      case 'response.output_audio_transcript.done':
        // Chiude solo la sorgente che ha effettivamente alimentato il testo,
        // altrimenti la risposta verrebbe consegnata due volte alla UI.
        if (deltaSource !== 'text') emitFinal('assistant', event.transcript);
        break;

      case 'response.output_text.done':
        if (deltaSource !== 'audio_transcript') emitFinal('assistant', event.text);
        break;

      // --- L'utente ha iniziato a parlare: il VAD del server taglia da solo
      // la risposta in corso, alla UI basta saperlo. ---
      case 'input_audio_buffer.speech_started':
        handlers.onAudioResponse({ speaking: false });
        break;

      // --- Il modello sta parlando (eventi specifici di WebRTC) ---
      case 'output_audio_buffer.started':
        handlers.onAudioResponse({ speaking: true });
        break;

      case 'output_audio_buffer.stopped':
      case 'output_audio_buffer.cleared':
        handlers.onAudioResponse({ speaking: false });
        break;

      case 'response.done':
        emitFinal('assistant', null);
        if (event.response?.status === 'failed') {
          fail(event.response?.status_details?.error?.message || 'Risposta non riuscita');
        } else {
          // A risposta conclusa, mai durante: aggiornare la sessione mentre il
          // modello sta parlando non e' garantito che abbia effetto sul turno
          // in corso.
          assistantTurns += 1;
          if (assistantTurns % REASSERT_INSTRUCTIONS_EVERY === 0) {
            reassertInstructions();
          }
        }
        break;

      case 'error':
        fail(event.error?.message || 'Errore sconosciuto');
        break;

      default:
        break;
    }
  }

  /** Apre il microfono. Con il VAD semantico il turno lo chiude il server. */
  function startRecording() {
    if (!micTrack) throw new Error('Microfono non disponibile');
    micTrack.enabled = true;
  }

  /** Chiude il microfono senza smontare la sessione. */
  function stopRecording() {
    if (micTrack) micTrack.enabled = false;
  }

  /** Interrompe la risposta in corso (barge-in manuale). */
  function interrupt() {
    send({ type: 'response.cancel' });
    assistantBuffer = '';
    handlers.onAudioResponse({ speaking: false });
  }

  function sendTextMessage(text) {
    const queued = send({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }]
      }
    });
    if (queued) send({ type: 'response.create' });
    return queued;
  }

  function cleanup() {
    assistantBuffer = '';
    deltaSource = null;
    greetingRequested = false;
    assistantTurns = 0;

    if (micStream) {
      micStream.getTracks().forEach(track => track.stop());
      micStream = null;
    }
    micTrack = null;

    if (dataChannel) {
      dataChannel.onopen = null;
      dataChannel.onmessage = null;
      dataChannel.close();
      dataChannel = null;
    }

    if (pc) {
      pc.onconnectionstatechange = null;
      pc.ontrack = null;
      pc.close();
      pc = null;
    }

    if (audioElement) {
      audioElement.pause();
      audioElement.srcObject = null;
      audioElement = null;
    }
  }

  function disconnect() {
    cleanup();
    setState('disconnected');
  }

  async function checkMicrophoneAvailable() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some(d => d.kind === 'audioinput');
    } catch {
      return false;
    }
  }

  return {
    connect,
    disconnect,
    startRecording,
    stopRecording,
    interrupt,
    sendTextMessage,
    checkMicrophoneAvailable,
    isRecording: () => Boolean(micTrack?.enabled),
    isConnected: () => connectionState === 'connected',
    getConnectionState: () => connectionState,

    set onTranscript(fn) { handlers.onTranscript = fn; },
    set onConnectionChange(fn) { handlers.onConnectionChange = fn; },
    set onError(fn) { handlers.onError = fn; },
    set onAudioResponse(fn) { handlers.onAudioResponse = fn; }
  };
}

export default createVoiceSession;
