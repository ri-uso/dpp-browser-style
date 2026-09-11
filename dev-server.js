/**
 * Server API di sviluppo.
 *
 * Monta le stesse funzioni di `api/` che in produzione girano come serverless
 * Vercel, senza richiedere il login alla CLI. Il frontend Vite (porta 5173) le
 * raggiunge tramite il proxy configurato in vite.config.js.
 */

import express from 'express';
import { config } from 'dotenv';

config({ path: '.env.local' });

const app = express();
const PORT = 3000;

// Niente middleware cors() qui: la allowlist di origin vive in api/_guard.js,
// cosi' sviluppo e produzione applicano esattamente la stessa regola.
app.use(express.json({ limit: '256kb' }));

const chatHandler = await import('./api/chat.js').then(m => m.default);
const realtimeTokenHandler = await import('./api/realtime/token.js').then(m => m.default);

// I guard gestiscono anche le preflight, quindi le route accettano ogni metodo.
app.all('/api/chat', (req, res) => {
  if (req.method === 'POST') console.log('[Dev Server] POST /api/chat');
  chatHandler(req, res);
});

app.all('/api/realtime/token', (req, res) => {
  if (req.method === 'POST') console.log('[Dev Server] POST /api/realtime/token');
  realtimeTokenHandler(req, res);
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.OPENAI_API_KEY),
    timestamp: new Date().toISOString()
  });
});

// Un JSON malformato non deve abbattere il processo.
app.use((err, req, res, next) => {
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Payload troppo grande' });
  }
  if (err instanceof SyntaxError) {
    return res.status(400).json({ error: 'JSON non valido' });
  }
  return next(err);
});

app.listen(PORT, () => {
  console.log('');
  console.log('Development API Server avviato');
  console.log(`  http://localhost:${PORT}`);
  console.log('');
  console.log('  POST /api/chat');
  console.log('  POST /api/realtime/token');
  console.log('  GET  /api/health');
  console.log('');
  if (!process.env.OPENAI_API_KEY) {
    console.warn('  ATTENZIONE: OPENAI_API_KEY non trovata in .env.local');
    console.log('');
  }
  console.log('  Avvia il frontend con "npm run dev" in un altro terminale');
  console.log('');
});
