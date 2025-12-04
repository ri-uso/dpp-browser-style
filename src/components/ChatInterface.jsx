import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import '../styles/chatInterface.css';

/**
 * ChatInterface - Text-based chat component
 *
 * Displays conversation history and allows users to send messages
 */
function ChatInterface({ conversation, onSendMessage, language, translations }) {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation.length, streamingMessage]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsLoading(true);
    setStreamingMessage('');

    try {
      // Stream the response
      await onSendMessage(userMessage, (chunk) => {
        setStreamingMessage(prev => prev + chunk);
      });

      setStreamingMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      // Show error to user
      alert(translations[language]?.chat_error || 'Error sending message. Please try again.');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="chat-interface">
      {/* Messages container */}
      <div className="chat-messages">
        {conversation.map((message, index) => (
          <div
            key={index}
            className={`chat-message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
          >
            <div className="message-content">
              {message.content}
            </div>
            <div className="message-timestamp">
              {new Date().toLocaleTimeString(language === 'IT' ? 'it-IT' : 'en-US', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>
        ))}

        {/* Streaming message (assistant typing) */}
        {streamingMessage && (
          <div className="chat-message assistant-message streaming">
            <div className="message-content">
              {streamingMessage}
              <span className="typing-cursor">|</span>
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && !streamingMessage && (
          <div className="chat-message assistant-message">
            <div className="message-content typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input form */}
      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          className="chat-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={translations[language]?.chat_input_placeholder || 'Type your message...'}
          disabled={isLoading}
        />
        <button
          type="submit"
          className="chat-send-button"
          disabled={!inputValue.trim() || isLoading}
        >
          {translations[language]?.chat_send || 'Send'}
        </button>
      </form>
    </div>
  );
}

ChatInterface.propTypes = {
  conversation: PropTypes.arrayOf(
    PropTypes.shape({
      role: PropTypes.oneOf(['system', 'user', 'assistant']).isRequired,
      content: PropTypes.string.isRequired
    })
  ).isRequired,
  onSendMessage: PropTypes.func.isRequired,
  language: PropTypes.string.isRequired,
  translations: PropTypes.object.isRequired
};

export default ChatInterface;
