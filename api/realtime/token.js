/**
 * Serverless function for OpenAI Realtime API ephemeral token
 * Generates a temporary token for WebSocket connection to Realtime API
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
    const { model = 'gpt-realtime-mini', voice = 'alloy' } = req.body;

    console.log(`[Realtime Token API] Request from ${req.headers['x-forwarded-for'] || req.connection.remoteAddress}, model: ${model}`);

    // Call OpenAI to get ephemeral token
    const openaiResponse = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model,
        voice
      })
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json().catch(() => ({}));
      console.error('[Realtime Token API] OpenAI error:', errorData);
      return res.status(openaiResponse.status).json({
        error: errorData.error?.message || 'Failed to create realtime session'
      });
    }

    const sessionData = await openaiResponse.json();

    // Return the ephemeral token
    res.status(200).json({
      token: sessionData.client_secret?.value || sessionData.client_secret,
      expires_at: sessionData.expires_at,
      model: sessionData.model
    });

  } catch (error) {
    console.error('[Realtime Token API] Error:', error);

    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to generate token',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}
