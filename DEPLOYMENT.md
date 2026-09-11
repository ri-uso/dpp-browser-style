# DPP Browser — chat testuale e vocale

Guida al setup, all'esecuzione locale e al deploy della parte AI dell'app: la
chat in cui il prodotto scansionato "parla" con l'utente, per iscritto o a voce.

## Avvio rapido

Servono **due terminali**: il server API e il frontend sono due processi distinti.

```bash
# Terminale 1 — server API (avvialo per primo)
npm run dev:api

# Terminale 2 — frontend
npm run dev
```

Apri <http://localhost:5173>. Senza il server API la chat risponde 404: il
frontend inoltra `/api/*` alla porta 3000 tramite il proxy di
[vite.config.js](vite.config.js).

Prima di tutto crea `.env.local` nella root:

```env
OPENAI_API_KEY=sk-proj-la-tua-chiave
NODE_ENV=development
```

`.env*` è già in `.gitignore`. Verifica con `curl http://localhost:3000/api/health`:
il campo `hasApiKey` dice se la chiave è stata letta.

## Architettura

```
Browser → frontend Vite → /api/*  →  OpenAI
                          (la chiave vive solo qui)
```

Le funzioni in [api/](api/) girano come serverless su Vercel in produzione e,
in sviluppo, dentro [dev-server.js](dev-server.js) — stesso codice, nessun
bisogno di fare login alla CLI di Vercel.

| File | Ruolo |
|---|---|
| [api/chat.js](api/chat.js) | Chat testuale in streaming SSE |
| [api/realtime/token.js](api/realtime/token.js) | Chiave effimera per la voce |
| [api/_guard.js](api/_guard.js) | CORS, rate limit, tetti sul payload (il prefisso `_` lo esclude dal routing Vercel) |

Lato frontend: [ChatService.jsx](src/services/ChatService.jsx) per il testo,
[VoiceChatService.jsx](src/services/VoiceChatService.jsx) per la voce,
[ProductPersonaService.jsx](src/services/ProductPersonaService.jsx) costruisce il
prompt-persona dalla scheda prodotto.

## Modelli

| Uso | Modello | Dove si cambia |
|---|---|---|
| Chat testuale | `gpt-5.6-luna` | `DEFAULT_MODEL` in [api/chat.js](api/chat.js) |
| Chat vocale | `gpt-realtime-2.1` | `REALTIME_MODEL` in `.env.local`, o `DEFAULT_MODEL` in [api/realtime/token.js](api/realtime/token.js) |
| Voce | `marin` | `VOICE` in [VoiceChatService.jsx](src/services/VoiceChatService.jsx) |

**Perché `gpt-5.6-luna`.** Costa $0.20/$1.20 per 1M token (input/output) ed è il
primo gradino della famiglia che supporta `reasoning.effort: "none"`. Serve
davvero: nella Responses API i token di reasoning consumano
`max_output_tokens`, e con `gpt-5-nano` — che non ha `"none"` — le risposte si
troncavano a metà frase. Per risposte più argomentate: `gpt-5.6-terra`, dieci
volte più caro.

**Perché `gpt-realtime-2.1`.** Segue le istruzioni più da vicino e resta più
saldo nel personaggio nelle sessioni lunghe, dove il modello speech-to-speech
tende a scivolare verso il registro da assistente generico. Costa però $32/$64
per 1M token audio contro i $10/$20 di `gpt-realtime-2.1-mini`: circa il triplo.

Per confrontarli senza toccare il codice, metti in `.env.local`:

```env
REALTIME_MODEL=gpt-realtime-2.1-mini
```

e riavvia il server API. Sono gli unici due valori ammessi: il modello arriva
dal corpo della richiesta, e l'allowlist in [api/realtime/token.js](api/realtime/token.js)
impedisce a chi raggiunge l'endpoint di farci aprire sessioni su un modello a
piacere.

`gpt-live-1` (full-duplex, $0.05/min) è stato valutato e scartato per ora: usa un
endpoint proprio (`/v1/live/sessions`, non `/v1/realtime`) e la sua architettura
presuppone un "backend agent" separato, con i costi del modello di backend
fatturati a parte. Vale la pena riguardarlo quando la documentazione sarà matura.

## Come funziona la chat vocale

Usa **WebRTC**, il trasporto raccomandato da OpenAI per il browser:

1. il browser chiede a `/api/realtime/token` una chiave effimera `ek_...`;
   il backend la conia con `POST /v1/realtime/client_secrets`, mettendoci dentro
   modello, voce, VAD semantico e il prompt-persona;
2. il browser crea una `RTCPeerConnection` e scambia l'SDP con
   `POST https://api.openai.com/v1/realtime/calls`
   (`Content-Type: application/sdp`, body = l'offerta grezza);
3. l'audio del modello arriva su una media track, gli eventi JSON sul data
   channel `oai-events`.

Il microfono è un **interruttore**, non un pulsante da tenere premuto: il turno
lo chiude il VAD semantico lato server.

> L'endpoint preview `/v1/realtime/sessions` è stato ritirato con la dismissione
> della beta (30 aprile 2026), e l'header `OpenAI-Beta: realtime=v1` non va più
> inviato. Chi trovasse codice vecchio che li usa, sappia che risponde
> `Invalid URL (POST /v1/realtime/sessions)`.

## Protezioni

Gli endpoint sono un proxy verso OpenAI con la nostra chiave: chi raggiunge
l'URL può spenderla. [api/_guard.js](api/_guard.js) applica:

- **origin allowlist** — `localhost` più i domini dei tunnel (`*.ngrok-free.app`,
  `*.ngrok.app`, `*.trycloudflare.com`). Altri origin: elencali in
  `ALLOWED_ORIGINS`, separati da virgola. Le richieste senza header `Origin`
  (curl, health check) passano: la CORS riguarda solo i browser;
- **rate limit per IP** — 20 richieste/minuto per la chat, 6 per le sessioni
  vocali, che sono a consumo;
- **tetti sul payload** — max 40 messaggi e 60.000 caratteri per richiesta, corpo
  JSON max 256 kB.

Il contatore del rate limit è **in memoria di processo**: esatto con
`npm run dev:api` (un solo processo), per-istanza su Vercel. Per un deploy
pubblico servirebbe uno store condiviso (Redis/Upstash) e, meglio ancora, la
verifica di un token Firebase sugli endpoint.

## Test con ngrok

```bash
# Terminale 1
npm run dev:api
# Terminale 2
npm run dev
# Terminale 3
ngrok http 5173
```

Condividi l'URL ngrok: `/api/*` passa dal proxy di Vite e il dominio è già in
allowlist. Entrambi i server devono essere attivi.

Attenzione: finché il tunnel è aperto, chiunque abbia il link può usare la tua
chiave OpenAI entro i limiti del rate limit. Chiudilo a test finito e tieni
d'occhio i consumi sulla dashboard OpenAI.

## Deploy su Vercel

```bash
npm install -g vercel
vercel login
vercel --prod
```

Poi, nella dashboard del progetto → Settings → Environment Variables:

- `OPENAI_API_KEY` = la chiave di produzione
- `NODE_ENV` = `production`
- `ALLOWED_ORIGINS` = il dominio pubblico dell'app (senza, il browser viene
  bloccato dalla allowlist)

Rideploya dopo aver aggiunto le variabili. In alternativa, `npm run dev:vercel`
(richiede `vercel login`) riproduce l'ambiente di produzione in locale sulla
porta 3000.

## Diagnostica

**`/api/*` risponde 404** — il server API non è avviato (`npm run dev:api`), o il
proxy in [vite.config.js](vite.config.js) non punta a `localhost:3000`. In
produzione: controlla che [vercel.json](vercel.json) sia presente e che le
funzioni siano in `api/`.

**`Server configuration error`** — manca `OPENAI_API_KEY`. Controlla `.env.local`
e riavvia il server API: dotenv legge il file solo all'avvio.

**403 `Origin not allowed`** — stai servendo il frontend da un dominio fuori
allowlist. Aggiungilo a `ALLOWED_ORIGINS`.

**429** — rate limit. L'header `Retry-After` dice quanti secondi attendere.

**La porta 3000 è occupata** (PowerShell):

```powershell
Get-NetTCPConnection -LocalPort 3000 | Select-Object -Expand OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }
```

**La voce non si connette** — apri la console del browser. Errori tipici: il
permesso microfono negato; `Scambio SDP fallito` se la chiave effimera è scaduta
(dura 10 minuti, vale solo per stabilire la connessione); nessun audio se la
scheda è stata aperta senza un gesto dell'utente, perché il browser blocca
l'autoplay.

**Test manuale degli endpoint:**

```bash
curl http://localhost:3000/api/health

curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Ciao"}]}'

curl -X POST http://localhost:3000/api/realtime/token \
  -H "Content-Type: application/json" -d '{}'
```

## Controllo dei costi

- imposta un tetto di spesa nella dashboard OpenAI (la difesa più solida);
- il prompt-persona include la scheda prodotto, troncata a 12.000 caratteri
  (`MAX_CONTEXT_CHARS` in [ProductPersonaService.jsx](src/services/ProductPersonaService.jsx));
- la cronologia della chat è limitata agli ultimi 20 messaggi
  (`MAX_HISTORY_MESSAGES` in [ChatService.jsx](src/services/ChatService.jsx));
- la voce costa a minuto di audio: chiudere il modal chiude la sessione.
