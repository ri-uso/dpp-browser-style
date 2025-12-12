/**
 * Local Development Server for API Functions
 * This simulates Vercel serverless functions locally without requiring Vercel CLI login
 */

import express from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Import API handlers
const chatHandler = await import('./api/chat.js').then(m => m.default);
const ttsHandler = await import('./api/tts.js').then(m => m.default);
const realtimeTokenHandler = await import('./api/realtime/token.js').then(m => m.default);

// API Routes
app.post('/api/chat', (req, res) => {
  console.log('📨 [Dev Server] POST /api/chat');
  chatHandler(req, res);
});

app.post('/api/tts', (req, res) => {
  console.log('🔊 [Dev Server] POST /api/tts');
  ttsHandler(req, res);
});

app.post('/api/realtime/token', (req, res) => {
  console.log('🎙️ [Dev Server] POST /api/realtime/token');
  realtimeTokenHandler(req, res);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Dev API server running',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('🚀 Development API Server running!');
  console.log(`📍 Listening on http://localhost:${PORT}`);
  console.log('');
  console.log('Available endpoints:');
  console.log('  POST /api/chat');
  console.log('  POST /api/tts');
  console.log('  POST /api/realtime/token');
  console.log('  GET  /api/health');
  console.log('');
  console.log('💡 Run "npm run dev" in another terminal to start the frontend');
  console.log('');
});
