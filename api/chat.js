/**
 * Serverless function for OpenAI Chat API
 * Handles chat completions with streaming support
 * Supports both Chat Completions API and Responses API for GPT-5 models
 */

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const { messages, model = 'gpt-5-nano', max_completion_tokens = 500, reasoning_effort = 'low' } = req.body;

    // Validation
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    if (messages.length === 0) {
      return res.status(400).json({ error: 'Messages array cannot be empty' });
    }

    console.log(`[Chat API] Request: ${messages.length} messages, model: ${model}`);

    // Determine which API to use based on model
    // gpt-5-chat-latest uses Chat Completions API
    // gpt-5, gpt-5-mini, gpt-5-nano use Responses API
    const useResponsesAPI = model.startsWith('gpt-5') && !model.includes('chat-latest');

    if (useResponsesAPI) {
      return await handleResponsesAPI(req, res, {
        messages,
        model,
        max_completion_tokens,
        reasoning_effort,
        apiKey: OPENAI_API_KEY
      });
    } else {
      return await handleChatCompletionsAPI(req, res, {
        messages,
        model,
        max_completion_tokens,
        reasoning_effort,
        apiKey: OPENAI_API_KEY
      });
    }

  } catch (error) {
    console.error('[Chat API] Error:', error);

    if (res.headersSent) {
      res.end();
    } else {
      res.status(500).json({
        error: 'Failed to generate response',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

/**
 * Handle requests using the Responses API (for GPT-5 models)
 */
async function handleResponsesAPI(req, res, { messages, model, max_completion_tokens, reasoning_effort, apiKey }) {
  // Extract system prompt and build input array
  let systemPrompt = '';
  let input = [];
  
  for (const msg of messages) {
    if (msg.role === 'system') {
      systemPrompt = msg.content;
    } else {
      input.push({
        role: msg.role,
        content: msg.content
      });
    }
  }

  const requestBody = {
    model,
    input: input,
    stream: true
  };

  // Add system instructions if present
  if (systemPrompt) {
    requestBody.instructions = systemPrompt;
  }

  // Add optional parameters
  if (max_completion_tokens) {
    requestBody.max_output_tokens = max_completion_tokens;
  }

  // Add reasoning config for GPT-5 nano (use 'low' for faster responses)
  requestBody.reasoning = {
    effort: reasoning_effort || 'low'
  };

  console.log('[Chat API] Responses API request body:', JSON.stringify(requestBody, null, 2));

  const openaiResponse = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestBody)
  });

  if (!openaiResponse.ok) {
    const errorText = await openaiResponse.text();
    console.error('[Chat API] OpenAI Responses API error:', errorText);
    try {
      const errorData = JSON.parse(errorText);
      return res.status(openaiResponse.status).json({
        error: errorData.error?.message || 'OpenAI API error'
      });
    } catch {
      return res.status(openaiResponse.status).json({ error: errorText });
    }
  }

  // Set headers for streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const reader = openaiResponse.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      
      // Process complete events from buffer
      // SSE format: "event: type\ndata: json\n\n"
      const events = buffer.split('\n\n');
      buffer = events.pop() || ''; // Keep incomplete event in buffer

      for (const eventBlock of events) {
        if (!eventBlock.trim()) continue;

        const lines = eventBlock.split('\n');
        let eventType = '';
        let eventData = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            eventData = line.slice(6);
          }
        }

        // Debug logging
        if (eventType) {
          console.log(`[Chat API] Event type: ${eventType}`);
        }

        if (eventData && eventData !== '[DONE]') {
          try {
            const parsed = JSON.parse(eventData);
            
            // Handle text delta events
            if (parsed.type === 'response.output_text.delta' || eventType === 'response.output_text.delta') {
              const delta = parsed.delta || '';
              if (delta) {
                // Convert to Chat Completions format for frontend compatibility
                const chunk = {
                  choices: [{
                    delta: { content: delta }
                  }]
                };
                res.write(`data: ${JSON.stringify(chunk)}\n\n`);
              }
            }
            // Also check for content_part delta (alternative format)
            else if (parsed.type === 'response.content_part.delta') {
              const delta = parsed.delta?.text || '';
              if (delta) {
                const chunk = {
                  choices: [{
                    delta: { content: delta }
                  }]
                };
                res.write(`data: ${JSON.stringify(chunk)}\n\n`);
              }
            }
            // Handle completion
            else if (parsed.type === 'response.completed' || eventType === 'response.completed') {
              console.log('[Chat API] Response completed');
              res.write('data: [DONE]\n\n');
            }
            // Log other event types for debugging
            else if (parsed.type) {
              console.log(`[Chat API] Unhandled event: ${parsed.type}`);
            }
          } catch (e) {
            console.warn('[Chat API] Failed to parse event data:', eventData.substring(0, 100));
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
    res.end();
  }
}

/**
 * Handle requests using the Chat Completions API
 */
async function handleChatCompletionsAPI(req, res, { messages, model, max_completion_tokens, reasoning_effort, apiKey }) {
  const requestBody = {
    model,
    messages,
    stream: true
  };

  // Only include reasoning_effort for o1 series models
  if (model.startsWith('o1-')) {
    requestBody.reasoning_effort = reasoning_effort;
    requestBody.max_completion_tokens = max_completion_tokens;
  } else {
    requestBody.max_completion_tokens = max_completion_tokens;
  }

  console.log('[Chat API] Using Chat Completions API for model:', model);

  const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestBody)
  });

  if (!openaiResponse.ok) {
    const errorData = await openaiResponse.json();
    console.error('[Chat API] OpenAI error:', errorData);
    return res.status(openaiResponse.status).json({
      error: errorData.error?.message || 'OpenAI API error'
    });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const reader = openaiResponse.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      res.write(chunk);
    }
  } catch (streamError) {
    console.error('[Chat API] Streaming error:', streamError);
  } finally {
    reader.releaseLock();
    res.end();
  }
}