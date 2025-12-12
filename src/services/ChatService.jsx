/**
 * ChatService - Manages chat conversations with OpenAI
 *
 * This service handles:
 * - Sending messages to OpenAI Chat API with streaming support
 * - Managing conversation history
 * - Handling system prompts for product personas
 */

// Backend API endpoint (proxied in development, direct in production)
const CHAT_API_ENDPOINT = '/api/chat';

/**
 * Sends a message to OpenAI and streams the response
 * @param {Array} messages - Array of message objects [{role: 'system'|'user'|'assistant', content: string}]
 * @param {Function} onChunk - Callback for each chunk of response text
 * @param {Object} options - Optional configuration {model: string, temperature: number}
 * @returns {Promise<string>} - Complete response text
 */
export async function sendChatMessage(messages, onChunk = null, options = {}) {
  const {
    model = 'gpt-5-nano',
    max_completion_tokens = 500,
  } = options;

  try {
    const response = await fetch(CHAT_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // No Authorization header - handled by backend
      },
      body: JSON.stringify({
        model,
        messages,
        max_completion_tokens,
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    // The API always returns streaming responses
    // Handle streaming with or without onChunk callback
    return await handleStreamingResponse(response, onChunk || (() => {}));
  } catch (error) {
    console.error('Error in sendChatMessage:', error);
    throw error;
  }
}

/**
 * Processes streaming response from OpenAI
 * @param {Response} response - Fetch response object
 * @param {Function} onChunk - Callback for each chunk
 * @returns {Promise<string>} - Complete text
 */
async function handleStreamingResponse(response, onChunk) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content;

            // Filtra chunk vuoti o undefined
            if (content && content.length > 0) {
              fullText += content;
              onChunk(content);
            }
          } catch (e) {
            console.warn('Failed to parse streaming chunk:', e);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return fullText;
}


/**
 * Creates a new chat conversation
 * @param {string} systemPrompt - Initial system prompt for the conversation
 * @returns {Object} - Conversation object with methods
 */
export function createConversation(systemPrompt) {
  const messages = [
    {
      role: 'system',
      content: systemPrompt
    }
  ];

  return {
    /**
     * Gets all messages in the conversation
     */
    getMessages: () => [...messages],

    /**
     * Adds a user message and gets AI response
     * @param {string} userMessage - User's message
     * @param {Function} onChunk - Optional callback for streaming
     * @param {Object} options - Optional configuration
     * @returns {Promise<string>} - AI response
     */
    sendMessage: async (userMessage, onChunk = null, options = {}) => {
      // Add user message
      messages.push({
        role: 'user',
        content: userMessage
      });

      try {
        // Get AI response
        const response = await sendChatMessage(messages, onChunk, options);

        // Add assistant response to history
        messages.push({
          role: 'assistant',
          content: response
        });

        return response;
      } catch (error) {
        // Remove user message if request failed
        messages.pop();
        throw error;
      }
    },

    /**
     * Clears conversation history (keeps system prompt)
     */
    reset: () => {
      messages.length = 1; // Keep only system prompt
    },

    /**
     * Updates the system prompt
     * @param {string} newSystemPrompt - New system prompt
     */
    updateSystemPrompt: (newSystemPrompt) => {
      messages[0] = {
        role: 'system',
        content: newSystemPrompt
      };
    },

    /**
     * Gets conversation metadata
     */
    getMetadata: () => ({
      messageCount: messages.length - 1, // Exclude system prompt
      systemPrompt: messages[0].content
    })
  };
}

/**
 * Tests the backend API connection
 * @returns {Promise<boolean>} - True if connection successful
 */
export async function testConnection() {
  try {
    await sendChatMessage([
      { role: 'user', content: 'test' }
    ]);
    return true;
  } catch (error) {
    console.error('Backend API connection test failed:', error);
    return false;
  }
}