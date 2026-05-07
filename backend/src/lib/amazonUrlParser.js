'use strict';

const crypto = require('crypto');
const {
  extractAsin,
  extractMarketplace,
  normalizeMarketplace,
  ensureUrl,
} = require('./marketplaceRouteDetector');

const MARKETPLACE_LANGUAGE = {
  'amazon.com':    { lang: 'en', region: 'US' },
  'amazon.ca':     { lang: 'en', region: 'CA' },
  'amazon.co.uk':  { lang: 'en', region: 'GB' },
  'amazon.de':     { lang: 'de', region: 'DE' },
  'amazon.fr':     { lang: 'fr', region: 'FR' },
  'amazon.it':     { lang: 'it', region: 'IT' },
  'amazon.es':     { lang: 'es', region: 'ES' },
  'amazon.co.jp':  { lang: 'ja', region: 'JP' },
  'amazon.com.au': { lang: 'en', region: 'AU' },
  'amazon.in':     { lang: 'en', region: 'IN' },
  'amazon.com.mx': { lang: 'es', region: 'MX' },
  'amazon.nl':     { lang: 'nl', region: 'NL' },
  'amazon.sg':     { lang: 'en', region: 'SG' },
  'amazon.ae':     { lang: 'ar', region: 'AE' },
};

const TERM_TRANSLATIONS = {
  de: { KI: 'AI', Prozessor: 'Processor', Computer: 'Computer', Laptop: 'Laptop', Drucker: 'Printer', Lautsprecher: 'Speaker' },
  fr: { ordinateur: 'computer', processeur: 'processor', clavier: 'keyboard', ecran: 'screen', écran: 'screen', casque: 'headphones' },
  es: { portatil: 'laptop', portátil: 'laptop', teclado: 'keyboard', raton: 'mouse', ratón: 'mouse', pantalla: 'screen', auriculares: 'headphones' },
  it: { tastiera: 'keyboard', schermo: 'screen', cuffie: 'headphones', processore: 'processor' },
  nl: { toetsenbord: 'keyboard', scherm: 'screen', muis: 'mouse', processor: 'processor' },
};

function safeDecode(value = '') {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizeCanonicalSlug(slug) {
  if (!slug) return null;
  return safeDecode(slug)
    .replace(/[-_]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim() || null;
}

function normalizePhraseEnglish(phrase, marketplace) {
  if (!phrase) return null;
  const language = MARKETPLACE_LANGUAGE[marketplace]?.lang || 'en';
  const map = TERM_TRANSLATIONS[language];
  if (!map) return phrase;

  return phrase
    .split(/\s+/)
    .map((token) => map[token] || map[token.toLowerCase()] || token)
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function extractCanonicalSlug(url, asin) {
  const parsed = ensureUrl(url);
  if (!parsed || !asin) return null;
  const path = safeDecode(parsed.pathname || '');
  const marker = `/dp/${asin}`;
  const lowerPath = path.toLowerCase();
  const lowerMarker = marker.toLowerCase();
  const idx = lowerPath.indexOf(lowerMarker);
  if (idx <= 0) return null;
  const before = path.slice(0, idx).split('/').filter(Boolean);
  return before.length ? before[before.length - 1] : null;
}

function parseAmazonUrl(url, fallback = {}) {
  const marketplace = extractMarketplace(url) || normalizeMarketplace(fallback.marketplace);
  const asin = extractAsin(url) || (fallback.asin ? String(fallback.asin).trim().toUpperCase() : null);
  const canonicalSlug = extractCanonicalSlug(url, asin);
  const canonicalPhraseOriginal = normalizeCanonicalSlug(canonicalSlug);
  const canonicalPhraseNormalized = canonicalPhraseOriginal;
  const canonicalPhraseEnglish = normalizePhraseEnglish(canonicalPhraseNormalized, marketplace);
  const detectedLanguage = MARKETPLACE_LANGUAGE[marketplace]?.lang || 'en';

  return {
    submittedUrl: url || null,
    canonicalUrl: fallback.canonicalUrl || null,
    canonicalSource: fallback.canonicalSource || 'submitted_url',
    marketplace,
    asin,
    canonicalSlug,
    canonicalPhraseOriginal,
    canonicalPhraseNormalized,
    canonicalPhraseEnglish,
    detectedLanguage,
  };
}

function buildManualSyntheticUrl({ marketplace, asin, title }) {
  const normalizedMarketplace = normalizeMarketplace(marketplace);
  const cleanAsin = asin ? String(asin).trim().toUpperCase() : '';
  if (/^[A-Z0-9]{10}$/.test(cleanAsin)) {
    return `https://${normalizedMarketplace}/dp/${cleanAsin}`;
  }
  const basis = String(title || 'manual-amazon-listing').trim() || 'manual-amazon-listing';
  const hash = crypto.createHash('sha256').update(basis).digest('hex').slice(0, 8);
  return `https://${normalizedMarketplace}/manual/${hash}`;
}

function sourceFromManualInput(input = {}, listing = {}) {
  const marketplace = normalizeMarketplace(input.marketplace);
  const syntheticUrl = buildManualSyntheticUrl({
    marketplace,
    asin: input.asin,
    title: listing.title,
  });
  const canonicalUrl = input.canonicalUrl || input.url || syntheticUrl;
  const parsed = parseAmazonUrl(canonicalUrl, {
    marketplace,
    asin: input.asin,
    canonicalUrl,
    canonicalSource: input.canonicalPhrase ? 'manual' : 'title_fallback',
  });
  const phrase = input.canonicalPhrase || parsed.canonicalPhraseEnglish || listing.title || null;

  return {
    ...parsed,
    submittedUrl: input.url || syntheticUrl,
    canonicalUrl,
    canonicalSource: input.canonicalPhrase ? 'manual' : parsed.canonicalPhraseEnglish ? parsed.canonicalSource : 'title_fallback',
    canonicalPhraseOriginal: input.canonicalPhrase || parsed.canonicalPhraseOriginal || listing.title || null,
    canonicalPhraseNormalized: input.canonicalPhrase || parsed.canonicalPhraseNormalized || listing.title || null,
    canonicalPhraseEnglish: normalizePhraseEnglish(phrase, marketplace),
    detectedLanguage: MARKETPLACE_LANGUAGE[marketplace]?.lang || 'en',
    syntheticUrl,
  };
}

module.exports = {
  MARKETPLACE_LANGUAGE,
  buildManualSyntheticUrl,
  extractCanonicalSlug,
  normalizeCanonicalSlug,
  normalizePhraseEnglish,
  parseAmazonUrl,
  sourceFromManualInput,
};

