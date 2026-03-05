'use strict';

/**
 * Strip protocol, www, and trailing slash from a URL.
 * Returns just the host + path, lowercased.
 *
 * Examples:
 *   "https://www.silinno.com"         → "silinno.com"
 *   "https://silinno.com/products/"   → "silinno.com/products"
 *   "http://WWW.Example.Com/A/B"      → "example.com/a/b"
 */
function canonicalizeUrl(rawUrl) {
  let url = rawUrl.trim().toLowerCase();
  url = url.replace(/^https?:\/\//, '');
  url = url.replace(/^www\./, '');
  url = url.replace(/\/+$/, ''); // trailing slashes
  return url;
}

/**
 * Convert a raw URL into a URL-safe slug suitable for use as a database key
 * and a public URL path segment.
 *
 * Examples:
 *   "https://www.silinno.com"         → "silinno-com"
 *   "https://silinno.com/products"    → "silinno-com-products"
 *   "https://sub.example.co.uk/a/b"  → "sub-example-co-uk-a-b"
 */
function urlToSlug(rawUrl) {
  const canonical = canonicalizeUrl(rawUrl);
  return canonical
    .replace(/[./]/g, '-')      // dots and slashes become hyphens
    .replace(/[^a-z0-9-]/g, '') // strip any remaining non-alphanumeric chars
    .replace(/-{2,}/g, '-')     // collapse multiple consecutive hyphens
    .replace(/^-|-$/g, '');     // trim leading/trailing hyphens
}

module.exports = { canonicalizeUrl, urlToSlug };
