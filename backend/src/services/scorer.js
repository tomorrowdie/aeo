'use strict';

const cheerio = require('cheerio');

// ── Scoring weights (must sum to 100) ─────────────────────────────────────────

const WEIGHTS = {
  title:     5,
  metaDesc:  10,
  ogTags:    15,
  jsonLd:    20,
  faqSchema: 15,
  llmsTxt:   20,
  contact:   10, // sub-weighted: phone=30%, email=30%, address=40% of this
  images:    5,
};

// Verified: 5+10+15+20+15+20+10+5 = 100

// JSON-LD @type values that count as a valid "business" schema
const BUSINESS_SCHEMA_TYPES = new Set([
  'LocalBusiness', 'OnlineStore', 'Store', 'Organization', 'Corporation',
  'Restaurant', 'Hotel', 'Product', 'Service', 'WebSite', 'WebPage',
  'ItemList', 'BreadcrumbList', 'SiteLinksSearchBox',
]);

// ── Detection helpers ─────────────────────────────────────────────────────────

function checkTitle($) {
  const text = $('title').first().text().trim();
  return { pass: text.length > 0, value: text };
}

function checkMetaDesc($) {
  const content =
    $('meta[name="description"]').attr('content')?.trim() ||
    $('meta[name="Description"]').attr('content')?.trim() ||
    '';
  const len = content.length;
  // Partial credit: present but short (< 50 chars) = 50 pts; good (≥ 50 chars) = 100 pts
  const subScore = len === 0 ? 0 : len < 50 ? 50 : 100;
  return { pass: len >= 50, subScore, value: content };
}

function checkOgTags($) {
  const ogTitle = $('meta[property="og:title"]').attr('content')?.trim()       || '';
  const ogDesc  = $('meta[property="og:description"]').attr('content')?.trim() || '';
  const ogImage = $('meta[property="og:image"]').attr('content')?.trim()       || '';
  const found   = [ogTitle, ogDesc, ogImage].filter(Boolean).length;
  // Partial: 33 pts per tag
  return {
    pass:     found === 3,
    subScore: Math.round((found / 3) * 100),
    ogTitle:  ogTitle || null,
    ogDesc:   ogDesc  || null,
    ogImage:  ogImage || null,
  };
}

function checkJsonLd($) {
  let hasBusinessSchema = false;
  let hasFaqSchema      = false;

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data   = JSON.parse($(el).html() || '');
      const types  = Array.isArray(data['@graph'])
        ? data['@graph'].map((n) => n['@type'])
        : [data['@type']];

      for (const type of types.flat().filter(Boolean)) {
        if (BUSINESS_SCHEMA_TYPES.has(type)) hasBusinessSchema = true;
        if (type === 'FAQPage') hasFaqSchema = true;
      }
    } catch {
      // malformed — skip
    }
  });

  return { hasJsonLd: hasBusinessSchema, hasFaqSchema };
}

function checkLlmsTxt($) {
  const href = $('link[rel="llms-txt"]').attr('href');
  return { pass: !!href, href: href || null };
}

function checkContact($) {
  const telHref  = $('a[href^="tel:"]').first().attr('href');
  const mailHref = $('a[href^="mailto:"]').first().attr('href');

  const hasPhone   = !!telHref;
  const hasEmail   = !!mailHref;
  // Address: <address> tag or itemprop
  const addrText   = $('address').first().text().trim() ||
                     $('[itemprop="streetAddress"]').first().text().trim() ||
                     $('[itemprop="address"]').first().text().trim();
  const hasAddress = addrText.length > 3;

  // Weighted sub-scores: phone=30%, email=30%, address=40%
  const subScore = (hasPhone ? 30 : 0) + (hasEmail ? 30 : 0) + (hasAddress ? 40 : 0);

  return { hasPhone, hasEmail, hasAddress, subScore };
}

function checkImages($) {
  // At least one <img> with a non-empty alt attribute
  let found = false;
  $('img').each((_, el) => {
    const alt = $(el).attr('alt')?.trim();
    if (alt && alt.length > 0) { found = true; return false; } // break
  });
  return { pass: found };
}

// ── Main score function ───────────────────────────────────────────────────────

/**
 * Calculate the AEO score for a given HTML string.
 * Uses Cheerio only — no LLM call.
 *
 * @param {string} html - Full raw HTML of the page
 * @returns {{
 *   score: number,
 *   scoreTitle: number,     scoreMetaDesc: number, scoreOgTags: number,
 *   scoreJsonLd: number,    scoreFaqSchema: number, scoreLlmsTxt: number,
 *   scoreContact: number,   scoreImages: number,
 *   hasTitle: boolean,      hasMetaDesc: boolean,  hasOgTags: boolean,
 *   hasJsonLd: boolean,     hasFaqSchema: boolean, hasLlmsTxt: boolean,
 *   hasPhone: boolean,      hasEmail: boolean,     hasAddress: boolean,
 *   hasImages: boolean,
 * }}
 */
function score(html) {
  const $ = cheerio.load(html, { decodeEntities: false });

  // Run all checks
  const titleResult   = checkTitle($);
  const metaResult    = checkMetaDesc($);
  const ogResult      = checkOgTags($);
  const jsonLdResult  = checkJsonLd($);
  const llmsResult    = checkLlmsTxt($);
  const contactResult = checkContact($);
  const imagesResult  = checkImages($);

  // Per-category sub-scores (0–100, representing % of that category achieved)
  const scoreTitle     = titleResult.pass ? 100 : 0;
  const scoreMetaDesc  = metaResult.subScore;
  const scoreOgTags    = ogResult.subScore;
  const scoreJsonLd    = jsonLdResult.hasJsonLd  ? 100 : 0;
  const scoreFaqSchema = jsonLdResult.hasFaqSchema ? 100 : 0;
  const scoreLlmsTxt   = llmsResult.pass ? 100 : 0;
  const scoreContact   = contactResult.subScore;
  const scoreImages    = imagesResult.pass ? 100 : 0;

  // Weighted composite score (0–100)
  const totalScore = Math.round(
    WEIGHTS.title     * scoreTitle     / 100 +
    WEIGHTS.metaDesc  * scoreMetaDesc  / 100 +
    WEIGHTS.ogTags    * scoreOgTags    / 100 +
    WEIGHTS.jsonLd    * scoreJsonLd    / 100 +
    WEIGHTS.faqSchema * scoreFaqSchema / 100 +
    WEIGHTS.llmsTxt   * scoreLlmsTxt   / 100 +
    WEIGHTS.contact   * scoreContact   / 100 +
    WEIGHTS.images    * scoreImages    / 100
  );

  return {
    // Composite
    score: totalScore,

    // Category sub-scores (stored in DB for the breakdown UI)
    scoreTitle,
    scoreMetaDesc,
    scoreOgTags,
    scoreJsonLd,
    scoreFaqSchema,
    scoreLlmsTxt,
    scoreContact,
    scoreImages,

    // Boolean flags (for the pass/fail grid on the result page)
    hasTitle:     titleResult.pass,
    hasMetaDesc:  metaResult.pass,
    hasOgTags:    ogResult.pass,
    hasJsonLd:    jsonLdResult.hasJsonLd,
    hasFaqSchema: jsonLdResult.hasFaqSchema,
    hasLlmsTxt:   llmsResult.pass,
    hasPhone:     contactResult.hasPhone,
    hasEmail:     contactResult.hasEmail,
    hasAddress:   contactResult.hasAddress,
    hasImages:    imagesResult.pass,
  };
}

module.exports = { score, WEIGHTS };
