/**
 * Varianti sperimentali attivabili da URL, per confronti A/B tra colleghi.
 *
 * Oggi c'e' solo `voice_accent`: con `?voice_accent=modena` la chat vocale
 * aggiunge al system prompt il blocco sulla parlata emiliana (vedi
 * ProductPersonaService). Senza parametro, o con un valore sconosciuto, il
 * prompt resta quello normale.
 *
 * Il parametro convive con i deep link DPP senza interferire:
 * - si legge una volta sola al caricamento del modulo, perche' App ripulisce
 *   l'URL con `replaceState` subito dopo aver letto il deep link, molto prima
 *   che l'utente apra la chat;
 * - App lo rimuove dal frammento prima del parsing (`withoutExperimentParams`),
 *   cosi' nei vecchi link path-style non finisce dentro l'URL dell'API DPP.
 */

const VOICE_ACCENT_PARAM = 'voice_accent';
const VOICE_ACCENTS = ['modena'];

function readVoiceAccent() {
  try {
    const value = new URLSearchParams(window.location.search).get(VOICE_ACCENT_PARAM);
    return VOICE_ACCENTS.includes(value) ? value : null;
  } catch {
    return null;
  }
}

/** @type {'modena'|null} */
export const VOICE_ACCENT = readVoiceAccent();

if (VOICE_ACCENT) {
  console.info(`[Esperimento] Chat vocale con accento: ${VOICE_ACCENT}`);
}

const EXPERIMENT_PARAM_RE = new RegExp(`([?&])${VOICE_ACCENT_PARAM}=[^&#]*&?`, 'g');

/**
 * Toglie i parametri sperimentali da un frammento di URL, lasciando intatto
 * il resto (compreso l'ordine degli altri parametri).
 *
 * @param {string} fragment - es. "host/it/?format=json&voice_accent=modena"
 * @returns {string} - es. "host/it/?format=json"
 */
export function withoutExperimentParams(fragment) {
  return fragment.replace(EXPERIMENT_PARAM_RE, '$1').replace(/[?&]$/, '');
}
