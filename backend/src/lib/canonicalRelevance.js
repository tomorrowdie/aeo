'use strict';

const cheerio = require('cheerio');
const { parseAmazonUrl } = require('./amazonUrlParser');

const CANONICAL_FETCH_TIMEOUT_MS = 6_000;
const AMAZON_FETCH_USER_AGENT = 'Mozilla/5.0 (compatible; AEO-AmazonAnalyzer/1.0)';

async function fetchAmazonCanonicalUrl(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CANONICAL_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': AMAZON_FETCH_USER_AGENT,
        Accept: 'text/html',
      },
    });
    const html = await res.text();
    const $ = cheerio.load(html || '');
    const canonicalUrl = $('head link[rel="canonical"]').attr('href') ||
      $('link[rel="canonical"]').attr('href') ||
      null;
    return {
      ok: Boolean(res.ok && canonicalUrl),
      status: res.status,
      canonicalUrl,
      finalUrl: res.url || url,
      error: canonicalUrl ? null : 'Canonical link not found in fetched HTML.',
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      canonicalUrl: null,
      finalUrl: url,
      error: err.name === 'AbortError' ? 'Canonical fetch timed out.' : err.message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveCanonicalSource({ url, marketplace, asin }) {
  const fallback = parseAmazonUrl(url, {
    marketplace,
    asin,
    canonicalSource: 'submitted_url',
  });

  if (!url) return fallback;

  const fetched = await fetchAmazonCanonicalUrl(url);
  if (fetched.canonicalUrl) {
    return {
      ...parseAmazonUrl(fetched.canonicalUrl, {
        marketplace: fallback.marketplace,
        asin: fallback.asin,
        canonicalUrl: fetched.canonicalUrl,
        canonicalSource: 'html_canonical',
      }),
      submittedUrl: url,
      canonicalUrl: fetched.canonicalUrl,
      fetchStatus: {
        ok: fetched.ok,
        status: fetched.status,
        error: fetched.error,
      },
    };
  }

  return {
    ...fallback,
    canonicalUrl: fallback.canonicalUrl || url,
    fetchStatus: {
      ok: false,
      status: fetched.status,
      error: fetched.error,
    },
  };
}

module.exports = {
  AMAZON_FETCH_USER_AGENT,
  fetchAmazonCanonicalUrl,
  resolveCanonicalSource,
};

