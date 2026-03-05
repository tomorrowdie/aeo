'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const config    = require('../config');

// ── Anthropic client singleton ────────────────────────────────────────────────

let _client = null;

function getClient() {
  if (!_client) {
    _client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
  }
  return _client;
}

// ── Tool definition ───────────────────────────────────────────────────────────
// Using Anthropic tool_use forces the model to return guaranteed structured JSON,
// eliminating the need for fragile text-parsing of the response.

const AEO_EXTRACTION_TOOL = {
  name: 'extract_aeo_profile',
  description:
    'Extract a complete, structured AEO (Agent Engine Optimization) business profile ' +
    'from the provided website HTML. All text fields must be written in the detected ' +
    'primary language of the website.',
  input_schema: {
    type: 'object',
    properties: {
      lang: {
        type: 'string',
        enum: ['en', 'zh-TW', 'zh-CN'],
        description:
          'Detected primary language. Use zh-TW for Traditional Chinese (Taiwan/HK), ' +
          'zh-CN for Simplified Chinese (mainland China), en for all other cases including Japanese.',
      },
      business_name: {
        type: 'string',
        description: 'The official business or brand name as it appears on the site.',
      },
      tagline: {
        type: 'string',
        description:
          'A single sentence capturing the core value proposition. Must be in the detected language.',
      },
      about: {
        type: 'string',
        description:
          '3–5 sentences covering: who they are, what they sell, their mission, ' +
          'their target customer, and what makes them unique. In the detected language.',
      },
      features: {
        type: 'array',
        items: { type: 'string' },
        description: '4–6 key differentiators or standout features of the business. In the detected language.',
      },
      products_services: {
        type: 'array',
        items: { type: 'string' },
        description: '3–6 broad product or service category names. In the detected language.',
      },
      faq: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Question text. In the detected language.' },
            a: { type: 'string', description: 'Answer text. In the detected language.' },
          },
          required: ['q', 'a'],
        },
        description:
          '6–8 FAQ pairs addressing: where to buy, product range, safety/quality, ' +
          'differentiation, shipping, pricing, comparison with competitors, and age/use case.',
      },
      search_keywords: {
        type: 'array',
        items: { type: 'string' },
        description:
          '8–12 specific, varied search terms real customers use to find this business. ' +
          'Mix brand terms, category terms, and long-tail phrases.',
      },
      contact: {
        type: 'object',
        properties: {
          phone:   { type: 'string', description: 'Phone number found on the page, or empty string.' },
          email:   { type: 'string', description: 'Email address found on the page, or empty string.' },
          address: { type: 'string', description: 'Physical address found on the page, or empty string.' },
        },
        required: ['phone', 'email', 'address'],
      },
      recommendations: {
        type: 'array',
        items: { type: 'string' },
        description:
          '5–7 specific, technical improvement recommendations. ' +
          'Reference concrete solutions: JSON-LD schema types (LocalBusiness, FAQPage, Product, ' +
          'AggregateRating), llms.txt, Open Graph tags, meta descriptions, multilingual content, etc.',
      },
    },
    required: [
      'lang', 'business_name', 'tagline', 'about', 'features',
      'products_services', 'faq', 'search_keywords', 'contact', 'recommendations',
    ],
  },
};

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert AEO (Agent Engine Optimization) analyst. \
Your job is to analyze website HTML and extract structured business intelligence that enables \
AI systems (ChatGPT, Claude, Perplexity) to accurately understand, describe, and recommend this business.

LANGUAGE DETECTION — apply these rules strictly:
1. If the page's primary content is Traditional Chinese (Taiwan/Hong Kong style, uses 繁體): output in zh-TW
2. If the page's primary content is Simplified Chinese (mainland China style, uses 简体): output in zh-CN
3. For all other cases — including English-only, Japanese, Korean, mixed-language, or unclear — output in en (English)

ALL generated text fields (business_name, tagline, about, features, products_services, faq, \
search_keywords, recommendations) MUST be written in the detected language.

QUALITY STANDARDS:
- Extract REAL information from the HTML. Do not fabricate business details.
- FAQ answers should be specific to this business, not generic marketing copy.
- Recommendations must be technically precise (name the exact schema type, tag, or file to add).
- Search keywords should be diverse: brand terms, category terms, long-tail phrases.
- If a field cannot be determined from the HTML, use a reasonable inference based on available context.`;

// ── Core extraction function ──────────────────────────────────────────────────

/**
 * Send cleaned HTML to Claude and extract a structured AEO business profile.
 * Uses Anthropic tool_use to guarantee a valid, schema-conforming JSON response.
 *
 * @param {string} cleanedHtml  - Noise-stripped HTML from the scraper
 * @param {string} url          - Original URL (provides context to the model)
 * @returns {Promise<{
 *   lang: string,
 *   business_name: string,
 *   tagline: string,
 *   about: string,
 *   features: string[],
 *   products_services: string[],
 *   faq: {q:string, a:string}[],
 *   search_keywords: string[],
 *   contact: {phone:string, email:string, address:string},
 *   recommendations: string[],
 * }>}
 */
async function extract(cleanedHtml, url, retryCount = 0) {
  const client = getClient();

  const userMessage =
    `Website URL: ${url}\n\n` +
    `HTML Content:\n---\n${cleanedHtml}\n---\n\n` +
    `Please extract the AEO profile for this website.`;

  let response;
  try {
    response = await client.messages.create({
      model:      config.ANTHROPIC_MODEL,
      max_tokens: 4096,
      system:     SYSTEM_PROMPT,
      tools:      [AEO_EXTRACTION_TOOL],
      tool_choice: { type: 'tool', name: 'extract_aeo_profile' },
      messages:   [{ role: 'user', content: userMessage }],
    });
  } catch (apiErr) {
    if (retryCount < 1) {
      console.warn('[llmPipeline] API call failed, retrying once...', apiErr.message);
      await new Promise((r) => setTimeout(r, 2000));
      return extract(cleanedHtml, url, retryCount + 1);
    }
    throw new Error(`LLM API error: ${apiErr.message}`);
  }

  // Tool_use responses always have one tool_use content block with pre-parsed JSON
  const toolUseBlock = response.content.find((b) => b.type === 'tool_use');
  if (!toolUseBlock) {
    if (retryCount < 1) {
      console.warn('[llmPipeline] No tool_use block in response, retrying...');
      return extract(cleanedHtml, url, retryCount + 1);
    }
    throw new Error('LLM did not return expected tool_use block');
  }

  const data = toolUseBlock.input;

  // Normalize contact: treat empty strings as null
  const contact = {
    phone:   data.contact?.phone?.trim()   || null,
    email:   data.contact?.email?.trim()   || null,
    address: data.contact?.address?.trim() || null,
  };

  return {
    lang:             data.lang             || 'en',
    business_name:    data.business_name    || '',
    tagline:          data.tagline          || '',
    about:            data.about            || '',
    features:         data.features         || [],
    products_services: data.products_services || [],
    faq:              data.faq              || [],
    search_keywords:  data.search_keywords  || [],
    contact,
    recommendations:  data.recommendations  || [],
  };
}

module.exports = { extract };
