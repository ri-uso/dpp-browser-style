/**
 * StoryService - Manages AI-generated product stories and text-to-speech
 *
 * This service handles:
 * - Generating product stories using OpenAI Chat API
 * - Converting stories to speech using OpenAI TTS API
 * - In-memory caching to avoid duplicate API calls
 */

// Backend API endpoints (proxied in development, direct in production)
const CHAT_API_ENDPOINT = '/api/chat';
const TTS_API_ENDPOINT = '/api/tts';

// In-memory cache for stories and audio
const storyCache = new Map();
const audioCache = new Map();

/**
 * Generates a cache key based on product data and language
 */
function getCacheKey(productData, language) {
  const { batch_code, item_code, productfamily_code } = productData;
  return `${batch_code}_${item_code}_${productfamily_code}_${language}`;
}

/**
 * Creates a prompt for the AI to generate a first-person product story
 */
function createStoryPrompt(productData, language) {
  // Language-specific instructions
  const languageInstructions = {
    IT: 'Scrivi in italiano un racconto in prima persona (massimo 200 parole)',
    EN: 'Write in English a first-person narrative (maximum 200 words)',
    ES: 'Escribe en español una narrativa en primera persona (máximo 200 palabras)',
    FR: 'Écris en français un récit à la première personne (maximum 200 mots)'
  };

  const instruction = languageInstructions[language] || languageInstructions.EN;

  return `${instruction} che descrive questo capo di abbigliamento.
Parla come se fossi il capo stesso, raccontando la tua storia, i materiali di cui sei fatto,
le tue caratteristiche uniche e come puoi far sentire chi ti indossa.

Dati del prodotto:
${JSON.stringify(productData, null, 2)}

Rendi il racconto emotivo, coinvolgente e personale. Non usare formattazioni markdown.`;
}

/**
 * Generates a product story using OpenAI Chat API
 * @param {Object} productData - DPP data object
 * @param {string} language - Current app language (IT, EN, ES, FR)
 * @returns {Promise<string>} - Generated story text
 */
export async function generateProductStory(productData, language) {
  const cacheKey = getCacheKey(productData, language);

  // Check cache first
  if (storyCache.has(cacheKey)) {
    console.log('Story retrieved from cache');
    return storyCache.get(cacheKey);
  }

  console.log('Generating new story via backend API...');

  try {
    const response = await fetch(CHAT_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // No Authorization header - handled by backend
      },
      body: JSON.stringify({
        model: 'gpt-5-nano',
        messages: [
          {
            role: 'system',
            content: 'You are a creative storyteller who brings clothing items to life through engaging first-person narratives.'
          },
          {
            role: 'user',
            content: createStoryPrompt(productData, language)
          }
        ],
        max_completion_tokens: 500
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Backend API error: ${error.error?.message || response.statusText}`);
    }

    // Handle streaming response from backend
    let story = '';
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content;
            if (content) {
              story += content;
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }

    story = story.trim();

    // Cache the result
    storyCache.set(cacheKey, story);

    return story;
  } catch (error) {
    console.error('Error generating story:', error);
    throw error;
  }
}

/**
 * Converts text to speech using OpenAI TTS API
 * @param {string} text - Story text to convert
 * @param {string} language - Current app language for voice selection
 * @returns {Promise<string>} - URL to audio blob
 */
export async function generateSpeech(text, language) {
  const cacheKey = `audio_${text.substring(0, 50)}_${language}`;

  // Check cache first
  if (audioCache.has(cacheKey)) {
    console.log('Audio retrieved from cache');
    return audioCache.get(cacheKey);
  }

  console.log('Generating speech via backend TTS API...');

  // Voice selection based on language
  const voiceMap = {
    IT: 'alloy',  // Female voice works well for Italian
    EN: 'nova',   // Clear English voice
    ES: 'shimmer', // Good for Spanish
    FR: 'alloy'   // French pronunciation
  };

  const voice = voiceMap[language] || 'alloy';

  try {
    const response = await fetch(TTS_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // No Authorization header - handled by backend
      },
      body: JSON.stringify({
        text,
        voice,
        model: 'tts-1',
        speed: 1.0
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Backend TTS API error: ${error.error?.message || response.statusText}`);
    }

    // Convert response to blob and create URL
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);

    // Cache the result
    audioCache.set(cacheKey, audioUrl);

    return audioUrl;
  } catch (error) {
    console.error('Error generating speech:', error);
    throw error;
  }
}

/**
 * Main function to generate story and audio in one go
 * @param {Object} productData - DPP data object
 * @param {string} language - Current app language
 * @returns {Promise<{story: string, audioUrl: string}>}
 */
export async function generateProductStoryWithAudio(productData, language) {
  try {
    // Generate story first
    const story = await generateProductStory(productData, language);

    // Then generate audio
    const audioUrl = await generateSpeech(story, language);

    return { story, audioUrl };
  } catch (error) {
    console.error('Error in generateProductStoryWithAudio:', error);
    throw error;
  }
}

/**
 * Clears all cached stories and audio
 */
export function clearCache() {
  // Revoke all audio blob URLs to free memory
  audioCache.forEach(url => URL.revokeObjectURL(url));

  storyCache.clear();
  audioCache.clear();
  console.log('Story cache cleared');
}