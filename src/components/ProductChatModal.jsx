import { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import ChatInterface from './ChatInterface';
import VoiceInterface from './VoiceInterface';
import { createConversation } from '../services/ChatService';
import { createVoiceSession } from '../services/VoiceChatService';
import { createProductPersonaPrompt, generateWelcomeMessage, validateProductData } from '../services/ProductPersonaService';
import { MessageSquare, Mic } from 'lucide-react';
import '../styles/productChatModal.css';

const LOADING_MESSAGES = {
  IT: 'Sto preparando la mia storia...',
  EN: 'Preparing my story...',
  ES: 'Preparando mi historia...',
  FR: 'Je prépare mon histoire...'
};

/**
 * ProductChatModal - fa parlare il prodotto, a scelta per iscritto o a voce.
 */
function ProductChatModal({ productData, language, translations, isOpen, onClose }) {
  const [chatMode, setChatMode] = useState('text');
  const [conversation, setConversation] = useState(null);
  const [voiceSession, setVoiceSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);

  // Incrementato per forzare il rimontaggio della sessione vocale: le due
  // setChatMode consecutive verrebbero accorpate da React e l'effect non
  // rientrerebbe.
  const [voiceEpoch, setVoiceEpoch] = useState(0);

  // Le richieste in corso vanno annullate quando l'utente chiude il modal o
  // cambia modalita': senza questo lo streaming continuava (e si pagava) a
  // schermo chiuso.
  const abortRef = useRef(null);

  const withTimestamp = (message) => ({ ...message, timestamp: Date.now() });

  // --- Modalita' testo -----------------------------------------------------
  useEffect(() => {
    if (!isOpen || chatMode !== 'text' || !productData) return;

    if (!validateProductData(productData)) {
      setError('Dati prodotto non validi');
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    let cancelled = false;

    const newConversation = createConversation(createProductPersonaPrompt(productData, language));
    setConversation(newConversation);
    setError(null);
    setMessages([withTimestamp({
      role: 'assistant',
      content: LOADING_MESSAGES[language] || LOADING_MESSAGES.EN,
      isLoading: true
    })]);

    generateWelcomeMessage(
      productData,
      language,
      (prompt) => newConversation.sendMessage(prompt, null, { signal: controller.signal })
    )
      .then((welcomeStory) => {
        if (cancelled) return;
        setMessages([withTimestamp({ role: 'assistant', content: welcomeStory })]);
      })
      .catch((err) => {
        if (cancelled || err?.name === 'AbortError') return;
        console.error('Errore in apertura della chat:', err);
        setError(err?.message || 'Impossibile avviare la chat');
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [isOpen, productData, language, chatMode]);

  // --- Modalita' voce ------------------------------------------------------
  // L'effect non dipende da `voiceSession`: includerlo lo faceva rientrare a
  // ogni creazione, e la cleanup leggeva un `chatMode` di una render precedente.
  useEffect(() => {
    if (!isOpen || chatMode !== 'voice' || !productData) return;

    // 'voice' seleziona il blocco FORMATO parlato: niente elenchi, numeri per esteso.
    const session = createVoiceSession(createProductPersonaPrompt(productData, language, 'voice'));
    setVoiceSession(session);
    setError(null);

    let cancelled = false;
    session.connect().catch((err) => {
      if (cancelled) return;
      console.error('Errore di connessione vocale:', err);
      setError(err?.message || 'Impossibile avviare la chat vocale');
    });

    return () => {
      cancelled = true;
      session.disconnect();
      setVoiceSession(null);
    };
  }, [isOpen, chatMode, productData, language, voiceEpoch]);

  const handleModeSwitch = (mode) => {
    if (mode === chatMode) return;
    // La cleanup dell'effect smonta la modalita' uscente: qui basta annullare
    // l'eventuale streaming testuale ancora aperto.
    abortRef.current?.abort();
    setError(null);
    setChatMode(mode);
  };

  const handleSendMessage = useCallback(async (userMessage, onChunk) => {
    if (!conversation) return;

    setMessages(prev => [...prev, withTimestamp({ role: 'user', content: userMessage })]);

    try {
      const response = await conversation.sendMessage(userMessage, onChunk, {
        signal: abortRef.current?.signal
      });
      setMessages(prev => [...prev, withTimestamp({ role: 'assistant', content: response })]);
    } catch (err) {
      // Il messaggio dell'utente torna indietro: la domanda non e' stata posta.
      setMessages(prev => prev.slice(0, -1));
      throw err;
    }
  }, [conversation]);

  const handleClearChat = async () => {
    if (chatMode === 'voice') {
      // Ricreare la peer connection lo fa la cleanup dell'effect: qui basta
      // cambiare la sua chiave di rimontaggio.
      setVoiceEpoch(n => n + 1);
      return;
    }

    if (!conversation) return;

    conversation.reset();
    setMessages([withTimestamp({
      role: 'assistant',
      content: LOADING_MESSAGES[language] || LOADING_MESSAGES.EN,
      isLoading: true
    })]);

    try {
      const welcomeStory = await generateWelcomeMessage(
        productData,
        language,
        (prompt) => conversation.sendMessage(prompt, null, { signal: abortRef.current?.signal })
      );
      setMessages([withTimestamp({ role: 'assistant', content: welcomeStory })]);
    } catch (err) {
      if (err?.name !== 'AbortError') {
        console.error('Errore nel rigenerare la storia:', err);
        setError(err?.message || 'Impossibile rigenerare la storia');
      }
    }
  };

  const handleClose = () => {
    abortRef.current?.abort();
    setMessages([]);
    setConversation(null);
    setError(null);
    setChatMode('text');
    onClose();
  };

  // Chiusura con Esc: il modal e' a schermo pieno su mobile.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  if (!isOpen) return null;

  return (
    <div className="chat-modal-overlay" onClick={handleClose}>
      <div className="chat-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="chat-modal-header">
          <h3 className="chat-modal-title">
            {translations[language]?.chat_title || 'Chat with Product'}
          </h3>
          <div className="chat-modal-actions">
            <button
              type="button"
              className="chat-action-button"
              onClick={handleClearChat}
              title={translations[language]?.chat_clear || 'Clear chat'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
              </svg>
            </button>
            <button
              type="button"
              className="chat-close-button"
              onClick={handleClose}
              title={translations[language]?.chat_close || 'Close'}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="chat-modal-content">
          {error ? (
            <div className="chat-error-message">{error}</div>
          ) : chatMode === 'text' ? (
            conversation ? (
              <ChatInterface
                conversation={messages}
                onSendMessage={handleSendMessage}
                language={language}
                translations={translations}
              />
            ) : (
              <div className="chat-loading">
                <div className="spinner"></div>
                <p>{translations[language]?.loading_text || 'Loading...'}</p>
              </div>
            )
          ) : (
            voiceSession ? (
              <VoiceInterface
                voiceSession={voiceSession}
                language={language}
                translations={translations}
              />
            ) : (
              <div className="chat-loading">
                <div className="spinner"></div>
                <p>{translations[language]?.voice_connecting || 'Connecting...'}</p>
              </div>
            )
          )}
        </div>

        <div className="chat-mode-switcher">
          <button
            type="button"
            className={`chat-mode-tab ${chatMode === 'text' ? 'active' : ''}`}
            onClick={() => handleModeSwitch('text')}
          >
            <MessageSquare size={18} />
            <span>{translations[language]?.chat_mode_text || 'Text'}</span>
          </button>
          <button
            type="button"
            className={`chat-mode-tab ${chatMode === 'voice' ? 'active' : ''}`}
            onClick={() => handleModeSwitch('voice')}
          >
            <Mic size={18} />
            <span>{translations[language]?.chat_mode_voice || 'Voice'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

ProductChatModal.propTypes = {
  productData: PropTypes.object.isRequired,
  language: PropTypes.string.isRequired,
  translations: PropTypes.object.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired
};

export default ProductChatModal;
