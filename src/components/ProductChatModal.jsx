import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import ChatInterface from './ChatInterface';
import { createConversation } from '../services/ChatService';
import { createProductPersonaPrompt, generateWelcomeMessage, validateProductData } from '../services/ProductPersonaService';
import '../styles/productChatModal.css';

/**
 * ProductChatModal - Modal wrapper for product chat
 *
 * Opens a chat interface where users can talk to the product
 */
function ProductChatModal({ productData, language, translations, isOpen, onClose }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);

  // Initialize conversation when modal opens
  useEffect(() => {
    if (isOpen && productData) {
      if (!validateProductData(productData)) {
        setError('Invalid product data');
        return;
      }

      const initializeChat = async () => {
        try {
          // Create system prompt
          const systemPrompt = createProductPersonaPrompt(productData, language);

          // Create conversation
          const newConversation = createConversation(systemPrompt);
          setConversation(newConversation);

          // Show loading message while generating story
          const loadingMessages = {
            IT: 'Sto preparando la mia storia...',
            EN: 'Preparing my story...',
            ES: 'Preparando mi historia...',
            FR: 'Je prépare mon histoire...'
          };

          setMessages([
            {
              role: 'assistant',
              content: loadingMessages[language] || loadingMessages.EN,
              isLoading: true
            }
          ]);

          // Generate AI-powered welcome story
          const welcomeStory = await generateWelcomeMessage(
            productData,
            language,
            (prompt) => newConversation.sendMessage(prompt)
          );

          // Replace loading message with actual story
          setMessages([
            {
              role: 'assistant',
              content: welcomeStory
            }
          ]);

          setError(null);
        } catch (err) {
          console.error('Error initializing chat:', err);
          setError('Failed to initialize chat');
        }
      };

      initializeChat();
    }
  }, [isOpen, productData, language]);

  // Handle sending messages
  const handleSendMessage = async (userMessage, onChunk) => {
    if (!conversation) return;

    try {
      // Add user message to display
      setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

      // Send to AI and get response
      const response = await conversation.sendMessage(userMessage, onChunk);

      // Add assistant response to display
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove the user message if send failed
      setMessages(prev => prev.slice(0, -1));
      throw error;
    }
  };

  // Handle clearing chat
  const handleClearChat = async () => {
    if (conversation) {
      conversation.reset();

      // Show loading message
      const loadingMessages = {
        IT: 'Sto preparando la mia storia...',
        EN: 'Preparing my story...',
        ES: 'Preparando mi historia...',
        FR: 'Je prépare mon histoire...'
      };

      setMessages([
        {
          role: 'assistant',
          content: loadingMessages[language] || loadingMessages.EN,
          isLoading: true
        }
      ]);

      try {
        // Generate new welcome story
        const welcomeStory = await generateWelcomeMessage(
          productData,
          language,
          (prompt) => conversation.sendMessage(prompt)
        );

        setMessages([
          {
            role: 'assistant',
            content: welcomeStory
          }
        ]);
      } catch (err) {
        console.error('Error regenerating welcome story:', err);
      }
    }
  };

  // Handle closing modal
  const handleClose = () => {
    setMessages([]);
    setConversation(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="chat-modal-overlay" onClick={handleClose}>
      <div className="chat-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="chat-modal-header">
          <h3 className="chat-modal-title">
            {translations[language]?.chat_title || 'Chat with Product'}
          </h3>
          <div className="chat-modal-actions">
            <button
              className="chat-action-button"
              onClick={handleClearChat}
              title={translations[language]?.chat_clear || 'Clear chat'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
              </svg>
            </button>
            <button
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

        {/* Content */}
        <div className="chat-modal-content">
          {error ? (
            <div className="chat-error-message">
              {error}
            </div>
          ) : conversation ? (
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
          )}
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
