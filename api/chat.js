/**
 * Serverless function per la chat testuale.
 *
 * Il frontend riceve sempre uno stream SSE in formato "chat completions"
 * (`data: {"choices":[{"delta":{"content":"..."}}]}`), qualunque sia l'API
 * OpenAI usata a monte: cosi' il client ha un solo parser da mantenere.
 */

import { applyCors, enforceRateLimit, validateMessages } from './_guard.js';

/**
 * Modello di default per la chat.
 *
 * gpt-5.6-luna e' il gradino piu' economico della famiglia 5.6 ($0.20/$1.20 per
 * 1M token) ed e' il primo che supporta `reasoning.effort: "none"`. Serve
 * proprio qui: nella Responses API i token di reasoning consumano
 * `max_output_tokens`, e con gpt-5-nano (che non ha "none") le risposte si
 * troncavano a meta' frase. Per risposte piu' elaborate: 'gpt-5.6-terra'.
 */
const DEFAULT_MODEL = 'gpt-5.6-luna';
const DEFAULT_REASONING_EFFORT = 'none';
const DEFAULT_MAX_OUTPUT_TOKENS = 800;

export default async function handler(req, res) {
  if (!applyCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!enforceRateLimit(req, res, 'chat')) return;

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    console.error('[Chat API] OPENAI_API_KEY non configurata');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const {
    messages,
    model = DEFAULT_MODEL,
    max_completion_tokens = DEFAULT_MAX_OUTPUT_TOKENS,
    reasoning_effort = DEFAULT_REASONING_EFFORT
  } = req.body || {};

  const validationError = validateMessages(messages);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  console.log(`[Chat API] ${messages.length} messaggi, modello ${model}`);

  try {
    // I modelli di reasoning (gpt-5.x) vanno sulla Responses API; le varianti
    // "chat-latest" e i modelli non-reasoning restano su Chat Completions.
    const useResponsesAPI = /^(gpt-5|o[134])/.test(model) && !model.includes('chat-latest');

    const options = {
      messages,
      model,
      maxOutputTokens: max_completion_tokens,
      reasoningEffort: reasoning_effort,
      apiKey: OPENAI_API_KEY
    };

    return useResponsesAPI
      ? await streamResponsesAPI(res, options)
      : await streamChatCompletionsAPI(res, options);
  } catch (error) {
    console.error('[Chat API] Errore:', error);
    failRequest(res, error);
  }
}

/**
 * In streaming gli header sono gia' partiti: l'unica cosa sensata e' chiudere.
 * Prima che partano, invece, possiamo ancora restituire un JSON di errore.
 */
function failRequest(res, error) {
  if (res.headersSent) {
    res.end();
    return;
  }
  res.status(500).json({
    error: 'Failed to generate response',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
}

function startSSE(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  // Disattiva il buffering dei proxy, altrimenti lo streaming arriva a blocchi.
  res.setHeader('X-Accel-Buffering', 'no');
}

function writeDelta(res, content) {
  if (!content) return;
  res.write(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`);
}

async function readOpenAIError(openaiResponse) {
  const text = await openaiResponse.text();
  try {
    return JSON.parse(text).error?.message || text;
  } catch {
    return text;
  }
}

/**
 * Responses API (modelli di reasoning).
 */
async function streamResponsesAPI(res, { messages, model, maxOutputTokens, reasoningEffort, apiKey }) {
  // Nella Responses API il system prompt viaggia in `instructions`, separato
  // dalla conversazione.
  const systemPrompt = messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
  const input = messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role, content: m.content }));

  const requestBody = {
    model,
    input,
    stream: true,
    max_output_tokens: maxOutputTokens,
    reasoning: { effort: reasoningEffort }
  };

  if (systemPrompt) requestBody.instructions = systemPrompt;

  const openaiResponse = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestBody)
  });

  if (!openaiResponse.ok) {
    const message = await readOpenAIError(openaiResponse);
    console.error('[Chat API] Errore Responses API:', message);
    return res.status(openaiResponse.status).json({ error: message });
  }

  startSSE(res);

  const reader = openaiResponse.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Un evento SSE finisce con una riga vuota; l'ultimo pezzo del buffer puo'
      // essere un evento incompleto, quindi resta in attesa del chunk seguente.
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      for (const block of events) {
        const payload = block
          .split('\n')
          .filter(line => line.startsWith('data: '))
          .map(line => line.slice(6))
          .join('');

        if (!payload || payload === '[DONE]') continue;

        let parsed;
        try {
          parsed = JSON.parse(payload);
        } catch {
          console.warn('[Chat API] Evento non parsabile:', payload.slice(0, 120));
          continue;
        }

        switch (parsed.type) {
          case 'response.output_text.delta':
            writeDelta(res, parsed.delta);
            break;

          // La risposta ha esaurito max_output_tokens. Il testo prodotto finora
          // e' gia' stato inoltrato: segnaliamo il troncamento invece di
          // chiudere in silenzio a meta' frase.
          case 'response.incomplete':
            console.warn('[Chat API] Risposta troncata:', parsed.response?.incomplete_details?.reason);
            writeDelta(res, ' […]');
            break;

          case 'response.failed':
          case 'error':
            console.error('[Chat API] Errore in streaming:', parsed.response?.error || parsed.error);
            break;

          default:
            break;
        }
      }
    }
  } finally {
    // Un solo [DONE], sempre: il client lo usa per chiudere lo stream anche
    // quando la risposta e' stata troncata o e' fallita a meta'.
    res.write('data: [DONE]\n\n');
    reader.releaseLock();
    res.end();
  }
}

/**
 * Chat Completions API (modelli non-reasoning).
 */
async function streamChatCompletionsAPI(res, { messages, model, maxOutputTokens, apiKey }) {
  const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      max_completion_tokens: maxOutputTokens
    })
  });

  if (!openaiResponse.ok) {
    const message = await readOpenAIError(openaiResponse);
    console.error('[Chat API] Errore Chat Completions:', message);
    return res.status(openaiResponse.status).json({ error: message });
  }

  startSSE(res);

  // Il formato in uscita e' gia' quello atteso dal client: inoltro diretto.
  const reader = openaiResponse.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }
  } catch (streamError) {
    console.error('[Chat API] Errore di streaming:', streamError);
  } finally {
    reader.releaseLock();
    res.end();
  }
}
