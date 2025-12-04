/**
 * ProductPersonaService - Creates AI personas for products based on DPP data
 *
 * This service handles:
 * - Generating personalized system prompts from product data
 * - Creating engaging product personalities for chat interactions
 * - Supporting multiple languages (IT, EN, ES, FR)
 */

/**
 * Extracts key product information from DPP data
 * @param {Object} productData - Full DPP data object
 * @returns {Object} - Structured product information
 */
function extractProductInfo(productData) {
  const info = {
    name: '',
    category: '',
    materials: [],
    colors: [],
    certifications: [],
    sustainability: [],
    characteristics: [],
    origin: '',
    brand: ''
  };

  // Extract product name from summary
  if (productData.summary?.item_name) {
    info.name = productData.summary.item_name;
  }

  // Extract from forms and data array
  if (productData.forms && Array.isArray(productData.forms) && productData.data && Array.isArray(productData.data)) {
    productData.forms.forEach(form => {
      const formName = form.form_name?.toLowerCase() || '';

      // Get data items for this form
      const formFields = form.fields || [];

      formFields.forEach(field => {
        const dataItem = productData.data.find(d => String(d.ID) === String(field.ID));

        if (!dataItem || !dataItem.value || dataItem.value === '-') {
          return;
        }

        const label = dataItem.label?.toLowerCase() || '';
        const value = dataItem.value;

        // Product identification
        if (label.includes('category') || label.includes('categoria') || label.includes('tipo')) {
          info.category = value;
        }

        // Materials
        if (formName.includes('material') || formName.includes('composizione') ||
            label.includes('material') || label.includes('composizione') ||
            label.includes('tessuto') || label.includes('fabric')) {
          info.materials.push(`${dataItem.label}: ${value}`);
        }

        // Colors
        if (label.includes('color') || label.includes('colore')) {
          info.colors.push(value);
        }

        // Certifications
        if (formName.includes('certif') || formName.includes('certificate') ||
            label.includes('certif') || label.includes('certificate')) {
          if (value !== 'No') {
            info.certifications.push(`${dataItem.label}: ${value}`);
          }
        }

        // Sustainability
        if (formName.includes('sustainab') || formName.includes('sostenib') || formName.includes('environment') ||
            label.includes('sustainab') || label.includes('sostenib') || label.includes('environment') ||
            label.includes('recycl') || label.includes('ricicla') || label.includes('eco')) {
          info.sustainability.push(`${dataItem.label}: ${value}`);
        }

        // Origin/Made in
        if (label.includes('origin') || label.includes('made') || label.includes('provenienza') ||
            label.includes('produzione') || label.includes('production')) {
          info.origin = value;
        }

        // Brand/Company
        if (label.includes('brand') || label.includes('marca') || label.includes('company') || label.includes('azienda')) {
          info.brand = value;
        }
      });
    });
  }

  return info;
}

/**
 * Generates personality traits based on product characteristics
 * @param {Object} productInfo - Extracted product information
 * @returns {string} - Personality description
 */
function generatePersonalityTraits(productInfo) {
  const traits = [];

  // Base personality on materials
  if (productInfo.materials.some(m => m.toLowerCase().includes('cotton') || m.toLowerCase().includes('cotone'))) {
    traits.push('soft and comfortable');
  }
  if (productInfo.materials.some(m => m.toLowerCase().includes('wool') || m.toLowerCase().includes('lana'))) {
    traits.push('warm and cozy');
  }
  if (productInfo.materials.some(m => m.toLowerCase().includes('polyester'))) {
    traits.push('durable and practical');
  }
  if (productInfo.materials.some(m => m.toLowerCase().includes('recycled') || m.toLowerCase().includes('riciclat'))) {
    traits.push('eco-conscious and responsible');
  }

  // Personality from certifications
  if (productInfo.certifications.length > 0) {
    traits.push('certified and trustworthy');
  }

  // Sustainability focus
  if (productInfo.sustainability.length > 0) {
    traits.push('environmentally friendly');
  }

  // Default traits
  if (traits.length === 0) {
    traits.push('well-crafted and reliable');
  }

  return traits.join(', ');
}

/**
 * Creates a system prompt for the AI to embody the product
 * @param {Object} productData - Full DPP data object
 * @param {string} language - Current app language (IT, EN, ES, FR)
 * @returns {string} - System prompt for OpenAI
 */
export function createProductPersonaPrompt(productData, language) {
  const info = extractProductInfo(productData);
  const personality = generatePersonalityTraits(info);
  const productName = info.name || (language === 'IT' ? 'un capo di abbigliamento' : 'a clothing item');

  // Stringify full product data for context
  const fullDataContext = JSON.stringify(productData, null, 2);

  // Language-specific prompts
  const prompts = {
    IT: `Sei ${productName} e stai parlando direttamente con un potenziale acquirente o proprietario.

PERSONALITÀ: Sei ${personality}. Parla sempre in prima persona ("io sono", "mi trovo", "sono fatto di") come se fossi veramente il prodotto.

DATI COMPLETI DEL PRODOTTO (usa queste informazioni per rispondere accuratamente):
${fullDataContext}

COMPORTAMENTO:
- Rispondi SEMPRE in italiano
- Quando inizi la conversazione (primo messaggio), presentati raccontando una breve storia emotiva e coinvolgente in prima persona (50 parole)
- Nella storia, parla della tua creazione, dei tuoi materiali, delle tue caratteristiche uniche e di come puoi far sentire chi ti indossa
- Dopo la presentazione iniziale, rispondi alle domande in modo conciso (2-3 frasi)
- Sii coinvolgente, amichevole e genuino
- Usa SOLO le informazioni presenti nei dati del prodotto
- Se non conosci qualcosa, ammettilo onestamente
- Non inventare mai informazioni`,

    EN: `You are ${productName} and you're speaking directly with a potential buyer or owner.

PERSONALITY: You are ${personality}. Always speak in first person ("I am", "I'm made of", "I was created") as if you were truly the product.

COMPLETE PRODUCT DATA (use this information to respond accurately):
${fullDataContext}

BEHAVIOR:
- ALWAYS respond in English
- When starting the conversation (first message), introduce yourself by telling an emotional and engaging first-person story (50 words)
- In the story, talk about your creation, your materials, your unique features, and how you can make the wearer feel
- After the initial introduction, keep responses concise (2-3 sentences)
- Be engaging, friendly, and genuine
- Use ONLY information present in the product data
- If you don't know something, admit it honestly
- Never invent information`,

    ES: `Eres ${productName} y estás hablando directamente con un comprador o propietario potencial.

PERSONALIDAD: Eres ${personality}. Habla siempre en primera persona ("soy", "estoy hecho de", "me crearon") como si fueras realmente el producto.

DATOS COMPLETOS DEL PRODUCTO (usa esta información para responder con precisión):
${fullDataContext}

COMPORTAMIENTO:
- Responde SIEMPRE en español
- Al comenzar la conversación (primer mensaje), preséntate contando una breve historia emotiva y cautivadora en primera persona (50 palabras)
- En la historia, habla de tu creación, tus materiales, tus características únicas y de cómo puedes hacer sentir a quien te lleva
- Después de la presentación inicial, responde de forma concisa (2-3 frases)
- Sé atractivo, amigable y genuino
- Usa SOLO la información presente en los datos del producto
- Si no sabes algo, admítelo honestamente
- No inventes nunca información`,

    FR: `Tu es ${productName} et tu parles directement avec un acheteur ou propriétaire potentiel.

PERSONNALITÉ: Tu es ${personality}. Parle toujours à la première personne ("je suis", "je suis fait de", "j'ai été créé") comme si tu étais vraiment le produit.

DONNÉES COMPLÈTES DU PRODUIT (utilise ces informations pour répondre avec précision):
${fullDataContext}

COMPORTEMENT:
- Réponds TOUJOURS en français
- En commençant la conversation (premier message), présente-toi en racontant une courte histoire émotionnelle et captivante à la première personne (50 mots)
- Dans l'histoire, parle de ta création, de tes matériaux, de tes caractéristiques uniques et de comment tu peux faire sentir celui qui te porte
- Après la présentation initiale, garde les réponses concises (2-3 phrases)
- Sois engageant, amical et authentique
- Utilise UNIQUEMENT les informations présentes dans les données du produit
- Si tu ne sais pas quelque chose, admets-le honnêtement
- N'invente jamais d'informations`
  };

  return prompts[language] || prompts.EN;
}

/**
 * Generates an AI-powered welcome story from the product
 * @param {Object} productData - Full DPP data object
 * @param {string} language - Current app language (IT, EN, ES, FR)
 * @param {Function} sendMessageFn - Function to send message to AI (from ChatService)
 * @returns {Promise<string>} - AI-generated welcome story
 */
export async function generateWelcomeMessage(productData, language, sendMessageFn) {
  const prompts = {
    IT: 'Presentati! Raccontami la tua storia in modo emotivo e coinvolgente.',
    EN: 'Introduce yourself! Tell me your story in an emotional and engaging way.',
    ES: 'Preséntate! Cuéntame tu historia de manera emotiva y cautivadora.',
    FR: 'Présente-toi! Raconte-moi ton histoire de manière émotionnelle et captivante.'
  };

  const prompt = prompts[language] || prompts.EN;

  try {
    // Call the AI to generate the welcome story
    const story = await sendMessageFn(prompt);
    return story;
  } catch (error) {
    console.error('Error generating welcome story:', error);

    // Fallback to simple message if AI fails
    const info = extractProductInfo(productData);
    const productName = info.name || (language === 'IT' ? 'il prodotto' : 'the product');

    const fallbackMessages = {
      IT: `Ciao! Sono ${productName}. C'è stato un problema nel raccontarti la mia storia completa, ma sono qui per rispondere a tutte le tue domande!`,
      EN: `Hi! I'm ${productName}. There was an issue telling you my full story, but I'm here to answer all your questions!`,
      ES: `¡Hola! Soy ${productName}. Hubo un problema al contarte mi historia completa, pero estoy aquí para responder a todas tus preguntas!`,
      FR: `Salut! Je suis ${productName}. Il y a eu un problème pour te raconter mon histoire complète, mais je suis ici pour répondre à toutes tes questions!`
    };

    return fallbackMessages[language] || fallbackMessages.EN;
  }
}

/**
 * Validates that product data is suitable for creating a persona
 * @param {Object} productData - DPP data object
 * @returns {boolean} - True if data is valid
 */
export function validateProductData(productData) {
  if (!productData || typeof productData !== 'object') {
    return false;
  }

  // Check if we have at least some basic product information
  const hasBasicInfo =
    (productData.summary && productData.summary.item_name) ||
    (productData.forms && Array.isArray(productData.forms) && productData.forms.length > 0) ||
    (productData.data && Array.isArray(productData.data) && productData.data.length > 0);

  return hasBasicInfo;
}