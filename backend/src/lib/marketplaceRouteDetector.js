'use strict';

const AMAZON_MARKETPLACES = new Set([
  'amazon.com',
  'amazon.ca',
  'amazon.co.uk',
  'amazon.de',
  'amazon.fr',
  'amazon.it',
  'amazon.es',
  'amazon.co.jp',
  'amazon.com.au',
  'amazon.in',
  'amazon.com.mx',
  'amazon.nl',
  'amazon.sg',
  'amazon.ae',
]);

const ASIN_PATTERNS = [
  /\/dp\/([A-Z0-9]{10})(?:[/?#]|$)/i,
  /\/gp\/product\/([A-Z0-9]{10})(?:[/?#]|$)/i,
  /\/product\/([A-Z0-9]{10})(?:[/?#]|$)/i,
  /\/exec\/obidos\/ASIN\/([A-Z0-9]{10})(?:[/?#]|$)/i,
];

function ensureUrl(value) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withProtocol);
  } catch {
    return null;
  }
}

function normalizeHostname(hostname = '') {
  return hostname.toLowerCase().replace(/^www\./, '');
}

function normalizeMarketplace(value) {
  if (!value || typeof value !== 'string') return 'amazon.com';
  const trimmed = value.trim().toLowerCase();
  const withoutProtocol = trimmed.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  if (AMAZON_MARKETPLACES.has(withoutProtocol)) return withoutProtocol;
  if (trimmed === 'us' || trimmed === 'usa') return 'amazon.com';
  if (trimmed === 'uk' || trimmed === 'gb') return 'amazon.co.uk';
  if (trimmed === 'jp') return 'amazon.co.jp';
  if (trimmed === 'au') return 'amazon.com.au';
  if (trimmed === 'mx') return 'amazon.com.mx';
  return 'amazon.com';
}

function isAmazonUrl(url) {
  const parsed = ensureUrl(url);
  if (!parsed) return false;
  return AMAZON_MARKETPLACES.has(normalizeHostname(parsed.hostname));
}

function isWalmartUrl(url) {
  const parsed = ensureUrl(url);
  if (!parsed) return false;
  const host = normalizeHostname(parsed.hostname);
  return host === 'walmart.com' || host.endsWith('.walmart.com');
}

function extractMarketplace(url) {
  const parsed = ensureUrl(url);
  if (!parsed) return null;
  const host = normalizeHostname(parsed.hostname);
  return AMAZON_MARKETPLACES.has(host) ? host : null;
}

function extractAsin(value) {
  if (!value || typeof value !== 'string') return null;
  for (const pattern of ASIN_PATTERNS) {
    const match = value.match(pattern);
    if (match) return match[1].toUpperCase();
  }
  return null;
}

function hasManualAmazonListing(input = {}) {
  return (
    input &&
    typeof input === 'object' &&
    input.sourceType === 'amazon_listing' &&
    input.manualListing &&
    typeof input.manualListing === 'object'
  );
}

function detectScanType(input = {}) {
  if (hasManualAmazonListing(input)) return 'amazon_listing';
  if (input?.url && isAmazonUrl(input.url)) return 'amazon_listing';
  if (input?.url && isWalmartUrl(input.url)) return 'walmart_listing';
  return 'website';
}

module.exports = {
  AMAZON_MARKETPLACES,
  ASIN_PATTERNS,
  detectScanType,
  ensureUrl,
  extractAsin,
  extractMarketplace,
  hasManualAmazonListing,
  isAmazonUrl,
  isWalmartUrl,
  normalizeMarketplace,
};

