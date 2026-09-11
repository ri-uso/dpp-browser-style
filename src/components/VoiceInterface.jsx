import { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Mic, MicOff, Loader2, AlertCircle, Volume2, Square } from 'lucide-react';
import '../styles/voiceInterface.css';

/**
 * VoiceInterface - conversazione vocale con il prodotto.
 *
 * Il microfono e' un interruttore, non un pulsante da tenere premuto: la
 * Realtime API usa il VAD semantico lato server, che decide da solo quando il
 * turno dell'utente e' finito. Tenere premuto avrebbe significato due
 * meccanismi di turno in conflitto.
 */
function VoiceInterface({ voiceSession, language = 'EN', translations = {} }) {
  const [micOpen, setMicOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [transcripts, setTranscripts] = useState([]);
  const [currentTranscript, setCurrentTranscript] = useState({ role: null, text: '' });
  const [errorMessage, setErrorMessage] = useState(null);
  const [isAISpeaking, setIsAISpeaking] = useState(false);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts, currentTranscript]);

  const handleTranscript = useCallback(({ role, text, isFinal }) => {
    if (!text) return;

    if (isFinal) {
      setTranscripts(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === role && last?.text === text) return prev;
        return [...prev, { role, text, timestamp: Date.now() }];
      });
      setCurrentTranscript({ role: null, text: '' });
      return;
    }

    setCurrentTranscript(prev => (
      prev.role === role ? { role, text: prev.text + text } : { role, text }
    ));
  }, []);

  const handleConnectionChange = useCallback((status) => {
    setConnectionStatus(status);
    if (status === 'connected') {
      setErrorMessage(null);
    } else if (status !== 'connecting') {
      setMicOpen(false);
      setIsAISpeaking(false);
    }
  }, []);

  const handleError = useCallback((error) => {
    console.error('Errore chat vocale:', error);
    setErrorMessage(typeof error === 'string' ? error : error?.message || 'Errore sconosciuto');
    setMicOpen(false);
  }, []);

  const handleAudioResponse = useCallback(({ speaking }) => {
    setIsAISpeaking(Boolean(speaking));
  }, []);

  useEffect(() => {
    if (!voiceSession) return;
    voiceSession.onTranscript = handleTranscript;
    voiceSession.onConnectionChange = handleConnectionChange;
    voiceSession.onError = handleError;
    voiceSession.onAudioResponse = handleAudioResponse;
  }, [voiceSession, handleTranscript, handleConnectionChange, handleError, handleAudioResponse]);

  const getTranslation = useCallback((key, fallback) => (
    translations[language]?.[key] || translations.EN?.[key] || fallback
  ), [translations, language]);

  const toggleMic = useCallback(() => {
    if (connectionStatus !== 'connected') {
      setErrorMessage(getTranslation('voice_not_connected', 'Non connesso'));
      return;
    }

    try {
      setErrorMessage(null);
      if (micOpen) {
        voiceSession.stopRecording();
        setMicOpen(false);
      } else {
        voiceSession.startRecording();
        setMicOpen(true);
      }
    } catch (err) {
      console.error('Microfono non disponibile:', err);
      handleError(getTranslation('voice_mic_error', 'Impossibile accedere al microfono'));
    }
  }, [connectionStatus, micOpen, voiceSession, handleError, getTranslation]);

  const handleInterrupt = useCallback(() => {
    voiceSession.interrupt();
    setIsAISpeaking(false);
  }, [voiceSession]);

  const getStatusMessage = () => ({
    disconnected: getTranslation('voice_disconnected', 'Non connesso'),
    connecting: getTranslation('voice_connecting', 'Connessione...'),
    connected: getTranslation('voice_ready', 'Pronto per parlare'),
    error: errorMessage || getTranslation('voice_error', 'Errore di connessione')
  }[connectionStatus]);

  const getInstructionMessage = () => {
    if (connectionStatus === 'connecting') return getTranslation('voice_please_wait', 'Attendere...');
    if (connectionStatus !== 'connected') return getTranslation('voice_connect_first', 'Connetti per iniziare');
    if (isAISpeaking) return getTranslation('voice_ai_speaking', 'Il prodotto sta parlando...');
    if (micOpen) return getTranslation('voice_listening', 'Ti ascolto, parla pure');
    return getTranslation('voice_tap_to_speak', 'Tocca per aprire il microfono');
  };

  const getStatusIcon = () => {
    if (connectionStatus === 'connecting') {
      return <Loader2 className="voice-status-icon spinning" size={16} />;
    }
    if (connectionStatus === 'error') {
      return <AlertCircle className="voice-status-icon error" size={16} />;
    }
    return <span className="voice-status-dot"></span>;
  };

  const formatTime = (timestamp) => new Date(timestamp).toLocaleTimeString(
    language === 'IT' ? 'it-IT' : 'en-US',
    { hour: '2-digit', minute: '2-digit' }
  );

  useEffect(() => {
    if (!errorMessage) return;
    const timer = setTimeout(() => setErrorMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [errorMessage]);

  return (
    <div className="voice-interface">
      <div className="voice-transcripts">
        {transcripts.map((transcript) => (
          <div
            key={`${transcript.role}-${transcript.timestamp}`}
            className={`voice-message ${
              transcript.role === 'user' ? 'voice-user-message' : 'voice-assistant-message'
            }`}
          >
            <div className="voice-message-content">{transcript.text}</div>
            <div className="voice-message-timestamp">{formatTime(transcript.timestamp)}</div>
          </div>
        ))}

        {currentTranscript.role && currentTranscript.text && (
          <div
            className={`voice-message ${
              currentTranscript.role === 'user' ? 'voice-user-message' : 'voice-assistant-message'
            } streaming`}
          >
            <div className="voice-message-content">
              {currentTranscript.text}
              <span className="typing-cursor">|</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="voice-control-area">
        <div className={`voice-status ${connectionStatus}`}>
          {getStatusIcon()}
          <span className="voice-status-text">{getStatusMessage()}</span>
        </div>

        <div className="voice-mic-container">
          <button
            type="button"
            className={`voice-mic-button ${micOpen ? 'recording' : ''} ${
              connectionStatus !== 'connected' ? 'disabled' : ''
            } ${isAISpeaking ? 'ai-speaking' : ''}`}
            onClick={toggleMic}
            disabled={connectionStatus !== 'connected'}
            aria-label={micOpen
              ? getTranslation('voice_mic_close', 'Chiudi il microfono')
              : getTranslation('voice_mic_open', 'Apri il microfono')}
            aria-pressed={micOpen}
          >
            {micOpen && (
              <>
                <div className="voice-ripple"></div>
                <div className="voice-ripple" style={{ animationDelay: '0.3s' }}></div>
                <div className="voice-ripple" style={{ animationDelay: '0.6s' }}></div>
              </>
            )}

            {isAISpeaking && !micOpen && (
              <div className="voice-speaking-indicator">
                <Volume2 size={20} className="voice-volume-icon" />
              </div>
            )}

            {connectionStatus === 'connecting' ? (
              <Loader2 size={40} className="voice-mic-icon spinning" />
            ) : micOpen ? (
              <Mic size={40} className="voice-mic-icon active" />
            ) : (
              <MicOff size={40} className="voice-mic-icon" />
            )}
          </button>

          <p className="voice-instruction">{getInstructionMessage()}</p>

          {isAISpeaking && (
            <button type="button" className="voice-interrupt-button" onClick={handleInterrupt}>
              <Square size={14} />
              <span>{getTranslation('voice_interrupt', 'Interrompi')}</span>
            </button>
          )}
        </div>

        {errorMessage && connectionStatus !== 'error' && (
          <div className="voice-error-toast">
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}

VoiceInterface.propTypes = {
  voiceSession: PropTypes.shape({
    startRecording: PropTypes.func.isRequired,
    stopRecording: PropTypes.func.isRequired,
    interrupt: PropTypes.func.isRequired,
    // Setter di sola scrittura: la sessione li espone per ricevere i callback.
    onTranscript: PropTypes.func,
    onConnectionChange: PropTypes.func,
    onError: PropTypes.func,
    onAudioResponse: PropTypes.func
  }).isRequired,
  language: PropTypes.string,
  translations: PropTypes.object
};

VoiceInterface.defaultProps = {
  language: 'EN',
  translations: {
    EN: {
      voice_disconnected: 'Not connected',
      voice_connecting: 'Connecting...',
      voice_ready: 'Ready to speak',
      voice_error: 'Connection error',
      voice_listening: "I'm listening, go ahead",
      voice_tap_to_speak: 'Tap to open the microphone',
      voice_not_connected: 'Not connected',
      voice_mic_error: 'Failed to access microphone',
      voice_mic_open: 'Open the microphone',
      voice_mic_close: 'Close the microphone',
      voice_please_wait: 'Please wait...',
      voice_connect_first: 'Connect to start',
      voice_ai_speaking: 'The product is speaking...',
      voice_interrupt: 'Interrupt'
    },
    IT: {
      voice_disconnected: 'Non connesso',
      voice_connecting: 'Connessione...',
      voice_ready: 'Pronto per parlare',
      voice_error: 'Errore di connessione',
      voice_listening: 'Ti ascolto, parla pure',
      voice_tap_to_speak: 'Tocca per aprire il microfono',
      voice_not_connected: 'Non connesso',
      voice_mic_error: 'Impossibile accedere al microfono',
      voice_mic_open: 'Apri il microfono',
      voice_mic_close: 'Chiudi il microfono',
      voice_please_wait: 'Attendere...',
      voice_connect_first: 'Connetti per iniziare',
      voice_ai_speaking: 'Il prodotto sta parlando...',
      voice_interrupt: 'Interrompi'
    }
  }
};

export default VoiceInterface;
