'use strict';

const FILLER_WORDS = new Set([
  'amazing', 'awesome', 'best', 'great', 'nice', 'perfect', 'premium',
  'quality', 'ultimate', 'innovative', 'excellent', 'superior', 'ideal',
  'must-have', 'revolutionary', 'professional',
]);

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'in',
  'is', 'it', 'of', 'on', 'or', 'that', 'the', 'this', 'to', 'with', 'your',
]);

function normalizeText(value) {
  return String(value || '')
    .replace(/[^\S\r\n]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function normalizeBullets(value) {
  if (Array.isArray(value)) return value.map(normalizeText).filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(/\r?\n+/)
      .map((item) => item.replace(/^[-*•\d.)\s]+/, ''))
      .map(normalizeText)
      .filter(Boolean);
  }
  return [];
}

function tokenize(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((token) => token && !STOP_WORDS.has(token));
}

function uniqueTokens(value) {
  return [...new Set(tokenize(value))];
}

function countPhraseMatches(phrase, sections = []) {
  const tokens = uniqueTokens(phrase).filter((token) => token.length > 2);
  if (tokens.length === 0) return { matched: 0, total: 0, ratio: 0, tokens: [] };
  const haystack = sections.map((section) => normalizeText(section).toLowerCase()).join(' ');
  const matchedTokens = tokens.filter((token) => haystack.includes(token));
  return {
    matched: matchedTokens.length,
    total: tokens.length,
    ratio: matchedTokens.length / tokens.length,
    tokens,
    matchedTokens,
    missingTokens: tokens.filter((token) => !matchedTokens.includes(token)),
  };
}

function countStuffedBigrams(text) {
  const tokens = tokenize(text);
  const counts = new Map();
  for (let i = 0; i < tokens.length - 1; i += 1) {
    const bigram = `${tokens[i]} ${tokens[i + 1]}`;
    counts.set(bigram, (counts.get(bigram) || 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count >= 4).length;
}

function findFillerWords(text) {
  const tokens = tokenize(text);
  return [...new Set(tokens.filter((token) => FILLER_WORDS.has(token)))];
}

function hasNumbersOrSpecs(text) {
  return /\b\d+(\.\d+)?\s?(gb|tb|mhz|ghz|hz|inch|inches|in|cm|mm|oz|lb|lbs|w|v|mah|mp|k|%)?\b/i.test(text || '');
}

function hasNounBenefitContext(text, profile = {}) {
  const lower = normalizeText(text).toLowerCase();
  const nouns = profile.productNouns || [];
  const benefits = profile.benefitSignals || ['support', 'help', 'reduce', 'improve', 'protect', 'save', 'enable', 'accelerate', 'comfort', 'easy'];
  const contexts = profile.contextSignals || ['for', 'during', 'when', 'home', 'office', 'travel', 'gaming', 'work', 'baby', 'kitchen', 'daily'];
  return {
    hasNoun: nouns.some((term) => lower.includes(term)),
    hasBenefit: benefits.some((term) => lower.includes(term)),
    hasContext: contexts.some((term) => lower.includes(term)),
  };
}

function sectionText(listing = {}) {
  return [
    listing.title,
    ...(listing.bullets || []),
    listing.description,
    listing.aPlusContent,
    listing.backendSearchTerms,
    listing.productDetailsSpecs,
    listing.faqInformation,
    listing.reviewInformation,
    listing.productNicheKnowledge,
    listing.productType,
    listing.category,
    listing.targetCustomer,
  ].filter(Boolean).join('\n');
}

module.exports = {
  FILLER_WORDS,
  countPhraseMatches,
  countStuffedBigrams,
  findFillerWords,
  hasNounBenefitContext,
  hasNumbersOrSpecs,
  normalizeBullets,
  normalizeText,
  sectionText,
  tokenize,
  uniqueTokens,
};
