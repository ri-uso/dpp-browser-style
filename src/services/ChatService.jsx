/**
 * ChatService - conversazioni testuali con il prodotto.
 *
 * Parla solo con il nostro backend (`/api/chat`), mai direttamente con OpenAI:
 * la chiave resta server-side.
 */

const CHAT_API_ENDPOINT = '/api/chat';

/**
 * Il modello e' scelto lato server; lo si puo' forzare da qui per esperimenti.
 * @see api/chat.js per il default e il perche' della scelta.
 */
export const DEFAULT_MAX_COMPLETION_TOKENS = 800;

/**
 * Quanti messaggi di conversazione tenere oltre al system prompt.
 *
 * Il system prompt contiene gia' l'intera scheda prodotto: senza un tetto la
 * history cresce a ogni turno e il costo per messaggio con lei. Venti messaggi
 * (dieci scambi) coprono ampiamente una conversazione su un capo.
 */
const MAX_HISTORY_MESSAGES = 20;

/**
 * Invia i messaggi al backend e restituisce il testo completo, inoltrando
 * ogni pezzo a `onChunk` mano a mano che arriva.
 *
 * @param {Array<{role: string, content: string}>} messages
 * @param {Function} [onChunk] - chiamata per ogni frammento di testo
 * @param {Object} [options] - {model, max_completion_tokens, signal}
 * @returns {Promise<string>} testo completo della risposta
 */
export async function sendChatMessage(messages, onChunk = null, options = {}) {
  const { model, max_completion_tokens = DEFAULT_MAX_COMPLETION_TOKENS, signal } = options;

  const body = { messages, max_completion_tokens };
  if (model) body.model = model;

  const response = await fetch(CHAT_API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal
  });

  if (!response.ok) {
    // Gli errori del backend sono JSON, ma un 502 del proxy potrebbe non esserlo.
    const detail = await response.json().catch(() => null);
    throw new Error(detail?.error || `Errore del server (${response.status})`);
  }

  return readStream(response, onChunk || (() => {}), signal);
}

/**
 * Legge lo stream SSE del backend.
 *
 * Il punto delicato: i confini dei chunk di rete non coincidono con i confini
 * delle righe. Una riga `data: {...}` puo' arrivare spezzata in due `read()`, e
 * parsarla subito significherebbe buttare via quel pezzo di risposta. Per questo
 * l'ultima riga incompleta resta nel buffer fino al chunk successivo.
 */
async function readStream(response, onChunk, signal) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  try {
    while (true) {
      if (signal?.aborted) break;

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;

        const payload = line.slice(6).trim();
        if (!payload || payload === '[DONE]') continue;

        try {
          const content = JSON.parse(payload).choices?.[0]?.delta?.content;
          if (content) {
            fullText += content;
            onChunk(content);
          }
        } catch {
          console.warn('Frammento SSE non parsabile:', payload.slice(0, 120));
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return fullText;
}

/**
 * Crea una conversazione con memoria, legata a un system prompt.
 * @param {string} systemPrompt
 */
export function createConversation(systemPrompt) {
  let messages = [{ role: 'system', content: systemPrompt }];

  /** Tiene il system prompt e scarta i turni piu' vecchi oltre il tetto. */
  function trim() {
    if (messages.length > MAX_HISTORY_MESSAGES + 1) {
      messages = [messages[0], ...messages.slice(-MAX_HISTORY_MESSAGES)];
    }
  }

  return {
    getMessages: () => [...messages],

    /**
     * Aggiunge il messaggio dell'utente e restituisce la risposta dell'AI.
     * @param {string} userMessage
     * @param {Function} [onChunk]
     * @param {Object} [options] - accetta anche {signal} per annullare
     */
    sendMessage: async (userMessage, onChunk = null, options = {}) => {
      messages.push({ role: 'user', content: userMessage });
      trim();

      try {
        const response = await sendChatMessage(messages, onChunk, options);
        messages.push({ role: 'assistant', content: response });
        trim();
        return response;
      } catch (error) {
        // Richiesta fallita o annullata: la domanda non deve restare a penzoloni
        // nella history, altrimenti il turno successivo riparte sbilanciato.
        messages.pop();
        throw error;
      }
    },

    reset: () => {
      messages = [messages[0]];
    },

    updateSystemPrompt: (newSystemPrompt) => {
      messages[0] = { role: 'system', content: newSystemPrompt };
    },

    getMetadata: () => ({
      messageCount: messages.length - 1,
      systemPrompt: messages[0].content
    })
  };
}
