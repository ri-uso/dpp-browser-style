/**
 * Serverless function for OpenAI Text-to-Speech API
 * Converts text to speech audio
 */

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const { text, voice = 'alloy', model = 'tts-1', speed = 1.0 } = req.body;

    // Validation
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (text.length > 4096) {
      return res.status(400).json({ error: 'Text too long (max 4096 characters)' });
    }

    const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
    if (!validVoices.includes(voice)) {
      return res.status(400).json({ error: `Invalid voice. Must be one of: ${validVoices.join(', ')}` });
    }

    console.log(`[TTS API] Request from ${req.headers['x-forwarded-for'] || req.connection.remoteAddress}, text length: ${text.length}, voice: ${voice}`);

    // Call OpenAI TTS API
    const openaiResponse = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model,
        input: text,
        voice,
        speed,
        response_format: "mp3"
      })
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json().catch(() => ({}));
      console.error('[TTS API] OpenAI error:', errorData);
      return res.status(openaiResponse.status).json({
        error: errorData.error?.message || 'OpenAI TTS API error'
      });
    }

    // Get audio buffer
    const audioBuffer = await openaiResponse.arrayBuffer();

    // Send audio response
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.byteLength);
    res.send(Buffer.from(audioBuffer));

  } catch (error) {
    console.error('[TTS API] Error:', error);

    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to generate speech',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}
