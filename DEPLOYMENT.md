# Deployment Guide - DPP Browser with Secure OpenAI Backend

This guide explains how to deploy the DPP Browser application with secure OpenAI API integration.

## ⚡ Quick Start (Most Common Issues)

**Problem: "Failed to load resource: 400/500 Bad Request" or "VITE_OPENAI_API_KEY not found"**

**Solution**: You need to run **TWO** terminals simultaneously:

```bash
# Terminal 1 - Start API Server (MUST run first!)
npm run dev:api

# Terminal 2 - Start Frontend (in a NEW terminal)
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173)

**⚠️ IMPORTANT**: Both servers MUST be running at the same time for chat and voice features to work!

---

## Overview

The application now uses a **serverless backend** architecture to keep your OpenAI API keys secure:

- **Frontend**: React app (Vite) - runs in the browser
- **Backend**: Serverless functions in `/api` folder - run on the server
- **Security**: OpenAI API keys are never exposed to the client

```
Browser → Frontend → /api endpoints → OpenAI API
                      (Serverless)     (Secure)
```

## Local Development

### Option 1: Senza Login Vercel (Consigliata per iniziare) ⭐

Questa opzione **non richiede login a Vercel** e usa un server API locale:

**Terminal 1 - API Server:**
```bash
npm run dev:api
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

**Terminal 3 - Ngrok (opzionale):**
```bash
ngrok http 5173
```

Poi:
- Apri `http://localhost:5173` nel browser
- Condividi l'URL ngrok per testare con altri

✅ **Vantaggi:**
- Non serve login Vercel
- Setup più veloce
- Identico al tuo workflow attuale

### Option 2: Con Vercel Dev

Questa opzione simula esattamente l'ambiente di produzione Vercel, ma richiede login:

**Prima volta:**
```bash
vercel login
```

**Poi:**
```bash
npm run dev:vercel
```

Apri `http://localhost:3000` nel browser

✅ **Vantaggi:**
- Ambiente identico alla produzione
- Un solo comando
- Rileva automaticamente le modifiche

## Environment Variables

### Local Development (`.env.local`)

Create `.env.local` in the project root:

```env
# Backend Environment Variables (NEVER commit to Git!)
OPENAI_API_KEY=sk-proj-your-actual-key-here
NODE_ENV=development
```

**Important**: `.env.local` is automatically ignored by Git and should NEVER be committed.

### Frontend (`.env`)

The frontend `.env` file no longer contains sensitive keys:

```env
# Frontend Environment Variables (safe to commit)
# Firebase config goes here (public keys)
```

## Production Deployment

### Deploy to Vercel

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel --prod
   ```

4. **Set Environment Variables in Vercel Dashboard:**
   - Go to your project on vercel.com
   - Settings → Environment Variables
   - Add: `OPENAI_API_KEY` = `sk-proj-your-production-key`
   - Add: `NODE_ENV` = `production`

5. **Redeploy** (if variables were added after first deploy):
   ```bash
   vercel --prod
   ```

### Deploy to Netlify

1. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Build the project:**
   ```bash
   npm run build
   ```

3. **Deploy:**
   ```bash
   netlify deploy --prod
   ```

4. **Set Environment Variables:**
   - Go to Site settings → Environment variables
   - Add: `OPENAI_API_KEY`
   - Add: `NODE_ENV` = `production`

Note: For Netlify, you may need to adjust the serverless functions to use Netlify Functions format instead of Vercel format.

## Testing with Ngrok

Ngrok funziona esattamente come prima:

**Con Dev API Server (Opzione 1 - Consigliata):**
```bash
# Terminal 1
npm run dev:api

# Terminal 2
npm run dev

# Terminal 3
ngrok http 5173
```

**Con Vercel Dev (Opzione 2):**
```bash
# Terminal 1
npm run dev:vercel

# Terminal 2
ngrok http 3000
```

Condividi l'URL ngrok con i tester - gli endpoint API funzioneranno automaticamente!

**Importante:** Con l'Opzione 1, devi avere **entrambi** i server avviati (API + Frontend) prima di usare ngrok.

## API Endpoints

The serverless functions expose these endpoints:

- `POST /api/chat` - Chat completions with streaming
- `POST /api/tts` - Text-to-speech conversion
- `POST /api/realtime/token` - Get ephemeral token for voice chat

All endpoints are automatically proxied in development and work directly in production.

## Security Checklist

Before deploying to production:

- [ ] `.env.local` contains your OpenAI API key
- [ ] `.env.local` is in `.gitignore` (already configured)
- [ ] Frontend `.env` does NOT contain `VITE_OPENAI_API_KEY`
- [ ] Production environment variables are set in Vercel/Netlify dashboard
- [ ] Old OpenAI API key has been revoked (if it was exposed)
- [ ] Generate a new API key for production use

## File Structure

```
dpp-browser-style/
├── api/                      # Serverless backend functions
│   ├── chat.js              # Chat API endpoint
│   ├── tts.js               # Text-to-speech endpoint
│   └── realtime/
│       └── token.js         # Realtime voice token endpoint
├── src/
│   └── services/            # Updated to use /api endpoints
│       ├── ChatService.jsx
│       ├── StoryService.jsx
│       └── VoiceChatService.jsx
├── .env                     # Frontend vars (safe to commit)
├── .env.local              # Backend secrets (NEVER commit)
├── vercel.json             # Vercel configuration
└── vite.config.js          # Vite proxy configuration
```

## Troubleshooting

### API endpoints return 404

**Development (Opzione 1 - dev:api):**
- Verifica che il server API sia avviato: `npm run dev:api`
- Controlla i log nel terminale del server API
- Verifica che il proxy in `vite.config.js` punti a `localhost:3000`

**Development (Opzione 2 - Vercel):**
- Make sure Vercel dev server is running (`npm run dev:vercel`)
- Check that proxy is configured in `vite.config.js`

**Production:**
- Check that `vercel.json` is present
- Verify API functions are in the `/api` folder
- Redeploy after adding environment variables

### "OPENAI_API_KEY not configured" error

**Development:**
- Verifica che `.env.local` esista nella root del progetto
- Controlla che contenga `OPENAI_API_KEY=sk-proj-...`
- Riavvia il server API (`npm run dev:api`) o Vercel dev
- Se hai appena creato `.env.local`, riavvia TUTTI i terminali

**Production:**
- Go to Vercel/Netlify dashboard
- Check Environment Variables section
- Add `OPENAI_API_KEY` if missing
- Redeploy the project

### "Port 3000 already in use"

**Development:**
```bash
# Trova e ferma il processo sulla porta 3000
lsof -ti:3000 | xargs kill -9

# Poi riavvia
npm run dev:api
```

### CORS errors

**Development:**
- Il server dev include già CORS configurato
- Se usi ngrok, non dovrebbero esserci problemi
- Assicurati che ENTRAMBI i server siano avviati (API + Frontend)

**Production:**
- CORS è configurato in `vercel.json`
- In development, il proxy gestisce CORS automaticamente
- Se i problemi persistono, controlla la console del browser

### Voice chat not connecting

- Voice chat requires an ephemeral token from `/api/realtime/token`
- Check that the endpoint is accessible
- Verify OpenAI API key has Realtime API access
- Check browser console for WebSocket errors

## Cost Management

To prevent unexpected OpenAI charges:

1. **Set usage limits** in OpenAI dashboard
2. **Monitor usage** regularly
3. **Add rate limiting** (see OPENAI_BACKEND_SETUP.md for advanced options)
4. **Use gpt-4o-mini** instead of gpt-4 for lower costs (already configured)

## Support

If you encounter issues:

1. Check this guide and OPENAI_BACKEND_SETUP.md
2. Verify environment variables are set correctly
3. Check browser console and server logs
4. Test API endpoints with curl:

```bash
# Test chat endpoint
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'
```

## Next Steps

- [ ] Test all features locally with `npm run dev:vercel`
- [ ] Deploy to Vercel with `vercel --prod`
- [ ] Set production environment variables
- [ ] Test production deployment
- [ ] Revoke old API key if it was exposed
- [ ] Set up usage monitoring in OpenAI dashboard
