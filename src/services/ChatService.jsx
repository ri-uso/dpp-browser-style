/**
 * ChatService - Manages chat conversations with OpenAI
 *
 * This service handles:
 * - Sending messages to OpenAI Chat API with streaming support
 * - Managing conversation history
 * - Handling system prompts for product personas
 */

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const OPENAI_CHAT_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

/**
 * Sends a message to OpenAI and streams the response
 * @param {Array} messages - Array of message objects [{role: 'system'|'user'|'assistant', content: string}]
 * @param {Function} onChunk - Callback for each chunk of response text
 * @param {Object} options - Optional configuration {model: string, temperature: number}
 * @returns {Promise<string>} - Complete response text
 */
export async function sendChatMessage(messages, onChunk = null, options = {}) {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured. Please set VITE_OPENAI_API_KEY in .env file.');
  }

  const {
    model = 'gpt-5-nano',
    max_completion_tokens = 500,
    reasoning = 'minimal'  // Aggiungi questo
  } = options;

  try {
    const response = await fetch(OPENAI_CHAT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model,
        messages,
        max_completion_tokens,
        reasoning_effort: reasoning ,  // Aggiungi questo
        stream: !!onChunk
        // Rimosso temperature - non supportata da GPT-5
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    // Handle streaming response
    if (onChunk && response.body) {
      return await handleStreamingResponse(response, onChunk);
    }

    // Handle non-streaming response
    const data = await response.json();
    return data.choices[0].message.content.trim();
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
 * Validates API key configuration
 * @returns {boolean} - True if API key is configured
 */
export function isConfigured() {
  return !!OPENAI_API_KEY && OPENAI_API_KEY.length > 0;
}

/**
 * Tests the OpenAI connection
 * @returns {Promise<boolean>} - True if connection successful
 */
export async function testConnection() {
  if (!isConfigured()) {
    return false;
  }

  try {
    await sendChatMessage([
      { role: 'user', content: 'test' }
    ]);
    return true;
  } catch (error) {
    console.error('OpenAI connection test failed:', error);
    return false;
  }
}