# Guida: Backend Proxy per OpenAI API (Opzione 1 - Node.js/Express)

## Problema

Attualmente le chiavi API di OpenAI sono esposte nel frontend React, il che significa:
- ❌ Chiunque può vedere la chiave nel bundle JavaScript
- 💰 Possono usare la tua chiave e TU paghi
- 🚨 Nessun controllo su rate limiting o abusi

## Soluzione: Backend Proxy

Creare un backend Node.js/Express che:
1. Riceve richieste dal frontend (senza chiavi API)
2. Chiama OpenAI API con la chiave segreta (server-side)
3. Restituisce le risposte al frontend

```
Browser (React App)          Backend Express         OpenAI
     │                             │                    │
     ├─── POST /api/chat ────────> │                    │
     │    (no API key)             ├─── API call ─────> │
     │                             │   (with API key)   │
     │                             │ <──── response ──── │
     │ <──── response ────────────── │                    │
```

---

## Setup Backend

### 1. Crea directory backend

```bash
mkdir backend
cd backend
npm init -y
```

### 2. Installa dipendenze

```bash
npm install express cors dotenv openai
npm install --save-dev nodemon
```

### 3. Crea `backend/server.js`

```javascript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Inizializza OpenAI (chiave server-side!)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Rate limiting semplice (in-memory)
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minuto
const MAX_REQUESTS = 20; // massimo 20 richieste al minuto

function checkRateLimit(userId) {
  const now = Date.now();
  const userRequests = requestCounts.get(userId) || [];

  // Rimuovi richieste vecchie
  const recentRequests = userRequests.filter(time => now - time < RATE_LIMIT_WINDOW);

  if (recentRequests.length >= MAX_REQUESTS) {
    return false;
  }

  recentRequests.push(now);
  requestCounts.set(userId, recentRequests);
  return true;
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// ENDPOINT: Chat Completion (streaming)
// ============================================
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, temperature = 0.7, max_completion_tokens = 500 } = req.body;

    // Validazione
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Rate limiting (usa IP come identificatore, o Firebase UID se disponibile)
    const userId = req.ip;
    if (!checkRateLimit(userId)) {
      return res.status(429).json({ error: 'Too many requests. Please wait.' });
    }

    console.log(`[Chat] Request from ${userId}, ${messages.length} messages`);

    // Chiama OpenAI con streaming
    const stream = await openai.chat.completions.create({
      model: 'gpt-5-mini', // o 'gpt-4' se preferisci
      messages: messages,
      temperature: temperature,
      max_completion_tokens: max_completion_tokens,
      stream: true
    });

    // Setup streaming response
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Stream chunks al client
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error('[Chat] Error:', error.message);
    res.status(500).json({
      error: 'Failed to generate response',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================
// ENDPOINT: Text-to-Speech
// ============================================
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voice = 'alloy', language } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Rate limiting
    const userId = req.ip;
    if (!checkRateLimit(userId)) {
      return res.status(429).json({ error: 'Too many requests' });
    }

    console.log(`[TTS] Request from ${userId}, text length: ${text.length}`);

    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: voice,
      input: text,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());

    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(buffer);

  } catch (error) {
    console.error('[TTS] Error:', error.message);
    res.status(500).json({ error: 'Failed to generate speech' });
  }
});

// ============================================
// ENDPOINT: WebSocket Proxy per Realtime API
// ============================================
// Nota: Per WebSocket proxy servono librerie aggiuntive (ws)
// Vedi sezione "WebSocket Proxy" più avanti

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend proxy running on port ${PORT}`);
  console.log(`📍 Frontend allowed: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
});
```

### 4. Crea `backend/.env`

```env
OPENAI_API_KEY=sk-proj-your-actual-key-here
PORT=3001
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

**⚠️ IMPORTANTE**: Aggiungi `backend/.env` al `.gitignore`!

### 5. Aggiorna `backend/package.json`

```json
{
  "name": "dpp-backend-proxy",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.18.2",
    "openai": "^4.28.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

### 6. Avvia il backend

```bash
cd backend
npm run dev
```

Dovresti vedere:
```
🚀 Backend proxy running on port 3001
📍 Frontend allowed: http://localhost:5173
```

---

## Aggiorna Frontend

### 1. Modifica `src/services/ChatService.jsx`

**PRIMA:**
```javascript
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const OPENAI_CHAT_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

const response = await fetch(OPENAI_CHAT_ENDPOINT, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${OPENAI_API_KEY}`
  },
  // ...
});
```

**DOPO:**
```javascript
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

const response = await fetch(`${BACKEND_URL}/api/chat`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // Nessuna Authorization header!
  },
  body: JSON.stringify({
    messages: conversationHistory,
    temperature: 0.7,
    max_completion_tokens: 500
  })
});
```

### 2. Modifica `src/services/StoryService.jsx`

**TTS endpoint:**
```javascript
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

async function textToSpeech(text, voice, language) {
  const response = await fetch(`${BACKEND_URL}/api/tts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, voice, language })
  });

  if (!response.ok) {
    throw new Error('TTS failed');
  }

  const audioBlob = await response.blob();
  return URL.createObjectURL(audioBlob);
}
```

### 3. Aggiungi variabile ambiente frontend

Crea `.env.local` (o aggiorna `.env`):
```env
VITE_BACKEND_URL=http://localhost:3001
```

**Per production:**
```env
VITE_BACKEND_URL=https://your-backend-domain.com
```

### 4. RIMUOVI la chiave OpenAI dal frontend

In `.env`:
```env
# RIMUOVI QUESTA RIGA:
# VITE_OPENAI_API_KEY=sk-proj-...

# Tieni solo Firebase (che è ok essere pubblico)
VITE_FIREBASE_API_KEY=...
```

---

## WebSocket Proxy per Realtime API

Il servizio `VoiceChatService.jsx` usa WebSocket diretto a OpenAI. Serve un proxy WebSocket.

### 1. Installa dipendenza WebSocket

```bash
cd backend
npm install ws
```

### 2. Aggiungi al `backend/server.js`

```javascript
import { WebSocketServer } from 'ws';
import http from 'http';

// Crea HTTP server (invece di app.listen diretto)
const server = http.createServer(app);

// WebSocket server
const wss = new WebSocketServer({
  server,
  path: '/api/realtime'
});

wss.on('connection', (clientWs, req) => {
  console.log('[WebSocket] Client connected');

  // Rate limiting
  const userId = req.socket.remoteAddress;
  if (!checkRateLimit(userId)) {
    clientWs.close(1008, 'Too many requests');
    return;
  }

  // Connetti a OpenAI Realtime API
  const openaiWs = new WebSocket(
    'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17',
    {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'OpenAI-Beta': 'realtime=v1'
      }
    }
  );

  // Proxy: Client -> OpenAI
  clientWs.on('message', (data) => {
    if (openaiWs.readyState === WebSocket.OPEN) {
      openaiWs.send(data);
    }
  });

  // Proxy: OpenAI -> Client
  openaiWs.on('message', (data) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(data);
    }
  });

  // Error handling
  openaiWs.on('error', (error) => {
    console.error('[WebSocket] OpenAI error:', error);
    clientWs.close(1011, 'Backend error');
  });

  clientWs.on('error', (error) => {
    console.error('[WebSocket] Client error:', error);
    openaiWs.close();
  });

  // Cleanup on close
  clientWs.on('close', () => {
    console.log('[WebSocket] Client disconnected');
    openaiWs.close();
  });

  openaiWs.on('close', () => {
    clientWs.close();
  });
});

// Start server (usa server HTTP invece di app)
server.listen(PORT, () => {
  console.log(`🚀 Backend proxy running on port ${PORT}`);
  console.log(`🔌 WebSocket proxy ready at ws://localhost:${PORT}/api/realtime`);
});
```

### 3. Aggiorna `src/services/VoiceChatService.jsx`

**PRIMA:**
```javascript
const wsUrl = `wss://api.openai.com/v1/realtime?model=${OPENAI_REALTIME_MODEL}`;
const ws = new WebSocket(wsUrl, [
  `openai-insecure-api-key.${apiKey}`,
  'openai-beta.realtime-v1'
]);
```

**DOPO:**
```javascript
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const wsUrl = BACKEND_URL.replace('http', 'ws') + '/api/realtime';
const ws = new WebSocket(wsUrl);
// Nessun header con API key!
```

---

## Deploy in Produzione

### Opzioni di Hosting Backend

**1. Vercel (Serverless)**
```bash
cd backend
npm install -g vercel
vercel
```

Aggiungi env vars nella Vercel dashboard:
- `OPENAI_API_KEY`
- `FRONTEND_URL`

**2. Railway**
- Push su GitHub
- Connetti repo a Railway
- Aggiungi env variables
- Deploy automatico

**3. Render**
- Push su GitHub
- Crea "Web Service" su Render
- Aggiungi env variables
- Deploy automatico

**4. DigitalOcean App Platform**
- Similar a Railway/Render
- Buono per controllo costi

### Configurazione Production

**backend/.env.production:**
```env
OPENAI_API_KEY=sk-proj-your-production-key
PORT=3001
FRONTEND_URL=https://your-production-domain.com
NODE_ENV=production
```

**frontend/.env.production:**
```env
VITE_BACKEND_URL=https://your-backend-domain.com
# Nessuna VITE_OPENAI_API_KEY!
```

---

## Sicurezza Aggiuntiva

### 1. Autenticazione Firebase (Opzionale ma Raccomandato)

Nel backend, verifica il token Firebase:

```javascript
import admin from 'firebase-admin';

// Inizializza Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  })
});

// Middleware per verificare token
async function verifyFirebaseToken(req, res, next) {
  const token = req.headers.authorization?.split('Bearer ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Usa su endpoint protetti
app.post('/api/chat', verifyFirebaseToken, async (req, res) => {
  // req.user contiene info utente Firebase
  // ...
});
```

Nel frontend, aggiungi token alle richieste:

```javascript
import { getIdToken } from './AuthService';

const token = await getIdToken();
const response = await fetch(`${BACKEND_URL}/api/chat`, {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  // ...
});
```

### 2. Rate Limiting Avanzato (Redis)

Per production seria, usa Redis invece di in-memory:

```bash
npm install redis express-rate-limit rate-limit-redis
```

```javascript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL
});

const limiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rate_limit:'
  }),
  windowMs: 60 * 1000, // 1 minuto
  max: 20 // max 20 richieste
});

app.use('/api/', limiter);
```

### 3. Logging e Monitoring

```javascript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Log ogni richiesta OpenAI
logger.info('OpenAI request', {
  userId: req.user?.uid,
  endpoint: 'chat',
  messageCount: messages.length,
  timestamp: new Date()
});
```

---

## Costi e Monitoring

### Stimare Costi OpenAI

**Chat (GPT-4o-mini):**
- Input: $0.150 / 1M tokens
- Output: $0.600 / 1M tokens

**TTS:**
- $15.00 / 1M characters

**Realtime API:**
- Audio input: $100 / 1M tokens
- Audio output: $200 / 1M tokens

### Limiti Consigliati

Nel backend, aggiungi:

```javascript
const MAX_MESSAGE_LENGTH = 2000; // caratteri
const MAX_CONVERSATION_LENGTH = 50; // messaggi
const MAX_TOKENS_PER_REQUEST = 1000;

// Validazione
if (messages.length > MAX_CONVERSATION_LENGTH) {
  return res.status(400).json({
    error: 'Conversation too long'
  });
}

const totalChars = messages.reduce((sum, msg) =>
  sum + msg.content.length, 0
);

if (totalChars > MAX_MESSAGE_LENGTH) {
  return res.status(400).json({
    error: 'Message too long'
  });
}
```

---

## Checklist Pre-Deploy

- [ ] Backend configurato con variabili ambiente sicure
- [ ] Frontend NON contiene `VITE_OPENAI_API_KEY`
- [ ] CORS configurato correttamente
- [ ] Rate limiting attivo
- [ ] Logging implementato
- [ ] Testato in locale (frontend + backend insieme)
- [ ] .env aggiunto a .gitignore
- [ ] Firebase Auth integrato (opzionale ma raccomandato)
- [ ] Error handling su tutti gli endpoint
- [ ] Monitoring/alerting configurato (Sentry, LogRocket, etc)

---

## Testing Locale

### 1. Avvia backend:
```bash
cd backend
npm run dev
```

### 2. Avvia frontend:
```bash
npm run dev
```

### 3. Testa chat:
Apri browser, usa la chat - dovrebbe funzionare senza chiavi nel frontend!

### 4. Verifica network tab:
- Richieste vanno a `http://localhost:3001/api/chat`
- Nessuna Authorization header con chiave OpenAI visibile

---

## Supporto

Se hai problemi:
1. Controlla logs del backend (`console.log` in `server.js`)
2. Verifica CORS settings se vedi errori di "blocked by CORS"
3. Controlla che `VITE_BACKEND_URL` sia corretto nel frontend
4. Testa endpoint backend con Postman/curl

**Test manuale:**
```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

Dovresti ricevere streaming response da OpenAI!

---

**Fatto! Ora hai una soluzione production-ready per OpenAI API 🚀**
