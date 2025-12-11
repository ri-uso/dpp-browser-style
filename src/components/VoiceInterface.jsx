import { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Mic, MicOff, Loader2, AlertCircle, Volume2 } from 'lucide-react';
import '../styles/voiceInterface.css';

/**
 * VoiceInterface - Voice chat component with tap-to-speak
 *
 * Displays real-time transcription and audio visualization
 */
function VoiceInterface({ voiceSession, language = 'EN', translations = {} }) {
  const [isRecording, setIsRecording] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [transcripts, setTranscripts] = useState([]);
  const [currentTranscript, setCurrentTranscript] = useState({ role: null, text: '' });
  const [errorMessage, setErrorMessage] = useState(null);
  const [isAISpeaking, setIsAISpeaking] = useState(false);

  const messagesEndRef = useRef(null);
  const isRecordingRef = useRef(false);

  // Keep ref in sync with state
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Auto-scroll to bottom when new transcripts arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts, currentTranscript]);

  // Handle transcript updates
  const handleTranscript = useCallback(({ role, text, isFinal }) => {
    if (isFinal && text) {
      // Add to permanent transcript list
      setTranscripts(prev => {
        // Avoid duplicate entries
        const lastEntry = prev[prev.length - 1];
        if (lastEntry?.role === role && lastEntry?.text === text) {
          return prev;
        }
        return [...prev, { role, text, timestamp: Date.now() }];
      });
      // Clear current streaming transcript
      setCurrentTranscript({ role: null, text: '' });
    } else if (text) {
      // Update current streaming transcript
      setCurrentTranscript(prev => {
        if (prev.role === role) {
          // Same role - append text
          return { role, text: prev.text + text };
        } else {
          // Different role - start fresh
          return { role, text };
        }
      });
    }
  }, []);

  // Handle connection status changes
  const handleConnectionChange = useCallback((status) => {
    console.log('Connection status:', status);
    setConnectionStatus(status);

    if (status === 'connected') {
      setErrorMessage(null);
    } else if (status === 'error') {
      setIsRecording(false);
    }
  }, []);

  // Handle errors
  const handleError = useCallback((error) => {
    console.error('Voice chat error:', error);
    setErrorMessage(typeof error === 'string' ? error : error.message || 'Unknown error');
    setConnectionStatus('error');
    setIsRecording(false);
  }, []);

  // Handle audio response events
  const handleAudioResponse = useCallback(({ complete }) => {
    if (complete) {
      setIsAISpeaking(false);
    } else {
      setIsAISpeaking(true);
    }
  }, []);

  // Setup voice session callbacks
  useEffect(() => {
    if (!voiceSession) return;

    // Set callbacks on the voice session
    voiceSession.onTranscript = handleTranscript;
    voiceSession.onConnectionChange = handleConnectionChange;
    voiceSession.onError = handleError;
    voiceSession.onAudioResponse = handleAudioResponse;

    // Cleanup function
    return () => {
      // Only cleanup if we're unmounting, not just re-rendering
    };
  }, [voiceSession, handleTranscript, handleConnectionChange, handleError, handleAudioResponse]);

  // Handle mic button press
  const handleMicPress = useCallback(async (e) => {
    e.preventDefault();

    if (connectionStatus !== 'connected') {
      setErrorMessage(getTranslation('voice_not_connected', 'Not connected'));
      return;
    }

    if (isRecordingRef.current) return;

    try {
      setErrorMessage(null);
      await voiceSession.startRecording();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      handleError(getTranslation('voice_mic_error', 'Failed to access microphone'));
    }
  }, [connectionStatus, voiceSession, handleError]);

  // Handle mic button release
  const handleMicRelease = useCallback((e) => {
    e.preventDefault();

    if (isRecordingRef.current && voiceSession) {
      voiceSession.stopRecording();
      setIsRecording(false);
    }
  }, [voiceSession]);

  // Handle keyboard accessibility
  const handleKeyDown = useCallback((e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleMicPress(e);
    }
  }, [handleMicPress]);

  const handleKeyUp = useCallback((e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleMicRelease(e);
    }
  }, [handleMicRelease]);

  // Translation helper
  const getTranslation = (key, fallback) => {
    return translations[language]?.[key] || translations['EN']?.[key] || fallback;
  };

  // Get status message
  const getStatusMessage = () => {
    const messages = {
      disconnected: getTranslation('voice_disconnected', 'Not connected'),
      connecting: getTranslation('voice_connecting', 'Connecting...'),
      connected: getTranslation('voice_ready', 'Ready to speak'),
      error: errorMessage || getTranslation('voice_error', 'Connection error')
    };
    return messages[connectionStatus];
  };

  // Get instruction message
  const getInstructionMessage = () => {
    if (connectionStatus === 'connecting') {
      return getTranslation('voice_please_wait', 'Please wait...');
    }
    if (connectionStatus !== 'connected') {
      return getTranslation('voice_connect_first', 'Connect to start');
    }
    if (isRecording) {
      return ''; // Don't show message while recording
    }
    if (isAISpeaking) {
      return getTranslation('voice_ai_speaking', 'AI is speaking...');
    }
    return getTranslation('voice_tap_to_speak', 'Press to start conversation');
  };

  // Get status icon
  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connecting':
        return <Loader2 className="voice-status-icon spinning" size={16} />;
      case 'error':
        return <AlertCircle className="voice-status-icon error" size={16} />;
      default:
        return <span className="voice-status-dot"></span>;
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString(
      language === 'IT' ? 'it-IT' : 'en-US',
      { hour: '2-digit', minute: '2-digit' }
    );
  };

  // Clear error after 5 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  return (
    <div className="voice-interface">
      {/* Transcripts container */}
      <div className="voice-transcripts">
        {transcripts.length === 0 && connectionStatus === 'connected' && !isRecording && !isAISpeaking && (
          <div className="voice-empty-state">
            {/* Empty state - no message needed */}
          </div>
        )}

        {transcripts.map((transcript, index) => (
          <div
            key={`${transcript.timestamp}-${index}`}
            className={`voice-message ${
              transcript.role === 'user' ? 'voice-user-message' : 'voice-assistant-message'
            }`}
          >
            <div className="voice-message-content">
              {transcript.text}
            </div>
            <div className="voice-message-timestamp">
              {formatTime(transcript.timestamp)}
            </div>
          </div>
        ))}

        {/* Current streaming transcript */}
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

      {/* Voice control area */}
      <div className="voice-control-area">
        {/* Status indicator */}
        <div className={`voice-status ${connectionStatus}`}>
          {getStatusIcon()}
          <span className="voice-status-text">{getStatusMessage()}</span>
        </div>

        {/* Mic button */}
        <div className="voice-mic-container">
          <button
            className={`voice-mic-button ${isRecording ? 'recording' : ''} ${
              connectionStatus !== 'connected' ? 'disabled' : ''
            } ${isAISpeaking ? 'ai-speaking' : ''}`}
            onMouseDown={handleMicPress}
            onMouseUp={handleMicRelease}
            onMouseLeave={handleMicRelease}
            onTouchStart={handleMicPress}
            onTouchEnd={handleMicRelease}
            onTouchCancel={handleMicRelease}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            disabled={connectionStatus !== 'connected'}
            aria-label={isRecording ? 'Recording - release to send' : 'Hold to speak'}
            aria-pressed={isRecording}
          >
            {/* Ripple effects for recording */}
            {isRecording && (
              <>
                <div className="voice-ripple"></div>
                <div className="voice-ripple" style={{ animationDelay: '0.3s' }}></div>
                <div className="voice-ripple" style={{ animationDelay: '0.6s' }}></div>
              </>
            )}

            {/* AI speaking indicator */}
            {isAISpeaking && !isRecording && (
              <div className="voice-speaking-indicator">
                <Volume2 size={20} className="voice-volume-icon" />
              </div>
            )}

            {/* Mic icon */}
            {connectionStatus === 'connecting' ? (
              <Loader2 size={40} className="voice-mic-icon spinning" />
            ) : isRecording ? (
              <Mic size={40} className="voice-mic-icon active" />
            ) : (
              <MicOff size={40} className="voice-mic-icon" />
            )}
          </button>

          {/* Instruction text */}
          <p className="voice-instruction">
            {getInstructionMessage()}
          </p>
        </div>

        {/* Error toast */}
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
      voice_recording: 'Release to send...',
      voice_tap_to_speak: 'Press to start conversation',
      voice_not_connected: 'Not connected',
      voice_mic_error: 'Failed to access microphone',
      voice_please_wait: 'Please wait...',
      voice_connect_first: 'Connect to start',
      voice_ai_speaking: 'AI is speaking...',
      voice_start_conversation: 'Hold the microphone button to start speaking'
    },
    IT: {
      voice_disconnected: 'Non connesso',
      voice_connecting: 'Connessione...',
      voice_ready: 'Pronto per parlare',
      voice_error: 'Errore di connessione',
      voice_recording: 'Rilascia per inviare...',
      voice_tap_to_speak: 'Premi per avviare la conversazione',
      voice_not_connected: 'Non connesso',
      voice_mic_error: 'Impossibile accedere al microfono',
      voice_please_wait: 'Attendere...',
      voice_connect_first: 'Connetti per iniziare',
      voice_ai_speaking: 'L\'AI sta parlando...',
      voice_start_conversation: 'Premi il pulsante del microfono per iniziare a parlare'
    }
  }
};

export default VoiceInterface;