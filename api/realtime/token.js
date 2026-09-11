/**
 * Serverless function che conia una chiave effimera per la Realtime API.
 *
 * Il browser non deve mai vedere OPENAI_API_KEY: chiede qui una chiave `ek_...`
 * a vita breve, con la configurazione di sessione gia' fissata lato server, e la
 * usa solo per lo scambio SDP con OpenAI.
 *
 * L'endpoint preview `/v1/realtime/sessions` e' stato ritirato con la
 * dismissione della beta (30 aprile 2026): la GA usa `/v1/realtime/client_secrets`
 * e non vuole piu' l'header `OpenAI-Beta: realtime=v1`.
 */

import { applyCors, enforceRateLimit } from '../_guard.js';

/**
 * Modelli vocali ammessi, con il costo audio per 1M token (input/output).
 *
 * - gpt-realtime-2.1       $32 / $64 — segue meglio le istruzioni, resta piu'
 *                                      saldo nel personaggio nelle sessioni lunghe
 * - gpt-realtime-2.1-mini  $10 / $20 — circa un terzo, sufficiente per una
 *                                      persona-prodotto guidata da solo prompt
 *
 * L'allowlist non e' cosmetica: il modello arriva dal corpo della richiesta, e
 * senza un filtro chi raggiunge l'endpoint potrebbe farci aprire sessioni su un
 * modello a piacere, a nostre spese.
 */
const ALLOWED_MODELS = ['gpt-realtime-2.1', 'gpt-realtime-2.1-mini'];

/**
 * Default commutabile con REALTIME_MODEL in .env.local, per confrontare i due
 * senza ridistribuire il codice.
 */
const DEFAULT_MODEL = ALLOWED_MODELS.includes(process.env.REALTIME_MODEL)
  ? process.env.REALTIME_MODEL
  : 'gpt-realtime-2.1';

/** Voci ammesse dalla Realtime API GA. 'marin' e 'cedar' sono le piu' naturali. */
const VALID_VOICES = [
  'alloy', 'ash', 'ballad', 'coral', 'echo',
  'sage', 'shimmer', 'verse', 'marin', 'cedar'
];
const DEFAULT_VOICE = 'marin';

/** La chiave effimera serve solo per lo scambio SDP: pochi minuti bastano. */
const TOKEN_TTL_SECONDS = 600;

const MAX_INSTRUCTIONS_CHARS = 20_000;

export default async function handler(req, res) {
  if (!applyCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!enforceRateLimit(req, res, 'realtime')) return;

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    console.error('[Realtime Token] OPENAI_API_KEY non configurata');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const { model = DEFAULT_MODEL, voice = DEFAULT_VOICE, instructions = '' } = req.body || {};

  if (!ALLOWED_MODELS.includes(model)) {
    return res.status(400).json({
      error: `Modello non ammesso. Ammessi: ${ALLOWED_MODELS.join(', ')}`
    });
  }

  if (!VALID_VOICES.includes(voice)) {
    return res.status(400).json({
      error: `Voce non valida. Ammesse: ${VALID_VOICES.join(', ')}`
    });
  }

  if (typeof instructions !== 'string' || instructions.length > MAX_INSTRUCTIONS_CHARS) {
    return res.status(400).json({
      error: `Instructions troppo lunghe (max ${MAX_INSTRUCTIONS_CHARS} caratteri)`
    });
  }

  try {
    const session = {
      type: 'realtime',
      model,
      output_modalities: ['audio'],
      audio: {
        input: {
          // Trascrive cio' che dice l'utente, cosi' la UI puo' mostrarlo.
          transcription: { model: 'gpt-4o-mini-transcribe' },
          // semantic_vad decide la fine del turno dal senso della frase, non dal
          // solo silenzio: molto meglio del server_vad con soglia fissa quando
          // l'utente si ferma a pensare a meta' domanda.
          turn_detection: { type: 'semantic_vad' }
        },
        output: { voice }
      }
    };

    // In WebRTC il formato audio lo negozia il trasporto: nessun campo `format`.

    if (instructions) session.instructions = instructions;

    const openaiResponse = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        expires_after: { anchor: 'created_at', seconds: TOKEN_TTL_SECONDS },
        session
      })
    });

    if (!openaiResponse.ok) {
      const text = await openaiResponse.text();
      console.error('[Realtime Token] Errore OpenAI:', text);
      let message = text;
      try {
        message = JSON.parse(text).error?.message || text;
      } catch {
        // testo non JSON: lo passiamo com'e'
      }
      return res.status(openaiResponse.status).json({ error: message });
    }

    const data = await openaiResponse.json();

    console.log(`[Realtime Token] Sessione creata, modello ${data.session?.model || model}`);

    res.status(200).json({
      token: data.value,
      expires_at: data.expires_at,
      model: data.session?.model || model
    });
  } catch (error) {
    console.error('[Realtime Token] Errore:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to generate token',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}
