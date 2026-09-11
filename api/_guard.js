/**
 * Shared protections for the /api endpoints.
 *
 * Gli endpoint sono un proxy verso OpenAI con la nostra chiave: senza questi
 * controlli chiunque raggiunga l'URL (tipicamente il link ngrok condiviso con i
 * colleghi) potrebbe consumarla liberamente. Qui teniamo il livello minimo utile
 * per una demo locale: origin allowlist, rate limit per IP e tetti sul payload.
 *
 * Nota: il rate limit e' in memoria di processo. Su `npm run dev:api` (un solo
 * processo) e' esatto; su Vercel vale per singola istanza serverless. Per un
 * deploy vero servirebbe uno store condiviso (Redis / Upstash).
 *
 * Il prefisso "_" impedisce a Vercel di esporre questo file come route.
 */

const RATE_LIMIT_WINDOW_MS = 60_000;

// Quante richieste al minuto per IP, per tipo di endpoint.
export const LIMITS = {
  chat: 20,
  // Ogni sessione realtime apre un canale audio a consumo: molto piu' stretto.
  realtime: 6
};

// Tetti sul prompt, per evitare che una singola richiesta costi quanto mille.
export const MAX_MESSAGES = 40;
export const MAX_PROMPT_CHARS = 60_000;

const buckets = new Map();

/**
 * Origin sempre ammessi: sviluppo locale e i tunnel che usiamo per i test.
 * Se ne servono altri, elencarli in ALLOWED_ORIGINS separati da virgola.
 */
const STATIC_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173'
];

const TUNNEL_HOST_SUFFIXES = [
  '.ngrok-free.app',
  '.ngrok.app',
  '.ngrok.io',
  '.trycloudflare.com'
];

function isAllowedOrigin(origin) {
  if (!origin) return false;

  const extra = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  if (STATIC_ORIGINS.includes(origin) || extra.includes(origin)) return true;

  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== 'https:' && protocol !== 'http:') return false;
    return TUNNEL_HOST_SUFFIXES.some(suffix => hostname.endsWith(suffix));
  } catch {
    return false;
  }
}

export function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

/**
 * Applica la CORS allowlist e risponde alle preflight.
 *
 * Le richieste senza header Origin (curl, health check, chiamate server-side)
 * passano: la protezione CORS riguarda solo i browser.
 *
 * @returns {boolean} false se la richiesta e' gia' stata chiusa e il chiamante
 *   deve interrompersi.
 */
export function applyCors(req, res) {
  const origin = req.headers.origin;

  if (origin) {
    if (!isAllowedOrigin(origin)) {
      res.status(403).json({ error: 'Origin not allowed' });
      return false;
    }
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return false;
  }

  return true;
}

/**
 * Rate limit a finestra scorrevole, per IP e per tipo di endpoint.
 * @returns {boolean} false se la richiesta e' stata rifiutata (429).
 */
export function enforceRateLimit(req, res, kind) {
  const max = LIMITS[kind];
  const key = `${kind}:${clientIp(req)}`;
  const now = Date.now();

  const recent = (buckets.get(key) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);

  if (recent.length >= max) {
    const retryAfter = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - recent[0])) / 1000);
    res.setHeader('Retry-After', String(retryAfter));
    res.status(429).json({
      error: `Troppe richieste: massimo ${max} al minuto. Riprova tra ${retryAfter}s.`
    });
    return false;
  }

  recent.push(now);
  buckets.set(key, recent);

  // La mappa cresce con gli IP visti: ripuliamo le chiavi scadute.
  if (buckets.size > 500) {
    for (const [k, times] of buckets) {
      if (times.every(t => now - t >= RATE_LIMIT_WINDOW_MS)) buckets.delete(k);
    }
  }

  return true;
}

/**
 * Valida la lista di messaggi in ingresso e il suo peso complessivo.
 * @returns {string|null} il messaggio d'errore, o null se tutto ok.
 */
export function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return 'Messages array is required';
  }

  if (messages.length > MAX_MESSAGES) {
    return `Conversazione troppo lunga (max ${MAX_MESSAGES} messaggi)`;
  }

  let total = 0;
  for (const msg of messages) {
    if (!msg || typeof msg.content !== 'string' || typeof msg.role !== 'string') {
      return 'Ogni messaggio deve avere role e content testuali';
    }
    if (!['system', 'user', 'assistant'].includes(msg.role)) {
      return `Ruolo non valido: ${msg.role}`;
    }
    total += msg.content.length;
  }

  if (total > MAX_PROMPT_CHARS) {
    return `Prompt troppo grande (${total} caratteri, max ${MAX_PROMPT_CHARS})`;
  }

  return null;
}
