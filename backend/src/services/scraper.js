'use strict';

const { chromium } = require('playwright');
const cheerio      = require('cheerio');

// ── Constants ─────────────────────────────────────────────────────────────────

const SCRAPE_TIMEOUT_MS   = 30_000; // max time waiting for page to load
const NETWORKIDLE_WAIT_MS = 3_000;  // extra wait after domcontentloaded for JS SPAs
const MAX_CLEANED_CHARS   = 40_000; // hard cap on cleaned HTML sent to LLM

const TAGS_TO_STRIP = [
  'script', 'style', 'nav', 'footer', 'noscript', 'svg', 'iframe',
  'header',   // often only brand/logo, stripped to save tokens
  'aside',
  'template',
];

/** Attributes to KEEP when stripping the rest (everything else is noise) */
const KEPT_ATTRS = new Set(['href', 'alt', 'src', 'content', 'property', 'name']);

// ── Browser singleton ─────────────────────────────────────────────────────────

let _browser = null;

async function getBrowser() {
  if (_browser && _browser.isConnected()) return _browser;

  _browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage', // critical for containers / Docker
      '--disable-gpu',
      '--disable-extensions',
      '--disable-background-timer-throttling',
    ],
  });

  _browser.on('disconnected', () => {
    console.warn('[scraper] Browser disconnected — will relaunch on next request');
    _browser = null;
  });

  return _browser;
}

/** Gracefully close the browser. Call on process exit. */
async function closeBrowser() {
  if (_browser) await _browser.close().catch(() => {});
  _browser = null;
}

// ── HTML helpers ─────────────────────────────────────────────────────────────

/**
 * Extract all metadata from the full page HTML using Cheerio.
 * Must be called BEFORE the cleaning step so nothing is lost.
 */
function extractMetadata(html) {
  const $ = cheerio.load(html, { decodeEntities: false });

  // Title
  const title = $('title').first().text().trim();

  // Meta description
  const metaDescription =
    $('meta[name="description"]').attr('content')?.trim() ||
    $('meta[property="og:description"]').attr('content')?.trim() ||
    '';

  // Open Graph
  const og = {
    title:       $('meta[property="og:title"]').attr('content')?.trim()       || null,
    description: $('meta[property="og:description"]').attr('content')?.trim() || null,
    image:       $('meta[property="og:image"]').attr('content')?.trim()       || null,
    url:         $('meta[property="og:url"]').attr('content')?.trim()         || null,
  };

  // JSON-LD blocks
  const jsonLdBlocks = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const parsed = JSON.parse($(el).html() || '');
      jsonLdBlocks.push(parsed);
    } catch {
      // malformed JSON-LD — skip
    }
  });

  // llms-txt link
  const llmsTxtHref = $('link[rel="llms-txt"]').attr('href') || null;

  // Contact info — look for machine-readable sources first
  const telHref   = $('a[href^="tel:"]').first().attr('href');
  const mailHref  = $('a[href^="mailto:"]').first().attr('href');
  const phone     = telHref  ? telHref.replace(/^tel:/i, '').trim()  : extractPhoneFromText($);
  const email     = mailHref ? mailHref.replace(/^mailto:/i, '').trim() : null;
  const address   = extractAddress($);

  return {
    title,
    metaDescription,
    og,
    jsonLdBlocks,
    llmsTxtHref,
    contact: {
      phone:   phone   || null,
      email:   email   || null,
      address: address || null,
    },
  };
}

/** Fallback: scan visible text for phone-number-like patterns */
function extractPhoneFromText($) {
  // Look for itemprop first
  const itemprop = $('[itemprop="telephone"]').first().text().trim();
  if (itemprop) return itemprop;

  // Look for common tel patterns in body text (E.164, JP, TW, etc.)
  const bodyText = $('body').text();
  const match = bodyText.match(
    /(?:\+?\d[\d\s\-().]{6,18}\d)/
  );
  return match ? match[0].trim() : null;
}

/** Extract address from <address> tag or itemprop attributes */
function extractAddress($) {
  const addr = $('address').first().text().trim();
  if (addr && addr.length > 5) return addr.replace(/\s{2,}/g, ' ');

  const itemprop = $('[itemprop="streetAddress"]').first().text().trim() ||
                   $('[itemprop="address"]').first().text().trim();
  return itemprop || null;
}

/**
 * Strip noise and normalize the HTML for LLM consumption.
 * Removes specified tag types, strips redundant attributes,
 * collapses whitespace, and applies a hard char cap.
 */
function cleanHtmlForLlm(html) {
  const $ = cheerio.load(html, { decodeEntities: false });

  // 1. Remove specified noise tags
  $(TAGS_TO_STRIP.join(', ')).remove();

  // 2. Remove common UI noise by class/id patterns (ads, modals, chat widgets, etc.)
  const noisePatterns = [
    '[class*="cookie"]', '[id*="cookie"]',
    '[class*="popup"]',  '[id*="popup"]',
    '[class*="modal"]',  '[id*="modal"]',
    '[class*="chat"]',   '[id*="chat"]',
    '[class*="intercom"]',
    '[class*="banner"]',
    '[aria-hidden="true"]',
    '[style*="display:none"]',
    '[style*="display: none"]',
  ];
  $(noisePatterns.join(', ')).remove();

  // 3. Strip all HTML attributes except the meaningful ones
  $('*').each((_, el) => {
    if (!el.attribs) return;
    for (const attr of Object.keys(el.attribs)) {
      if (!KEPT_ATTRS.has(attr)) {
        delete el.attribs[attr];
      }
    }
  });

  // 4. Grab body content (or full HTML if no body)
  const content = ($('body').html() || $.html() || '').trim();

  // 5. Normalize whitespace
  const normalized = content
    .replace(/[ \t]{2,}/g, ' ')      // collapse horizontal whitespace
    .replace(/(\n\s*){3,}/g, '\n\n') // max 2 consecutive blank lines
    .trim();

  // 6. Apply hard cap (post-cleaning, so we're token-efficient)
  if (normalized.length > MAX_CLEANED_CHARS) {
    return normalized.slice(0, MAX_CLEANED_CHARS) + '\n\n<!-- content truncated -->';
  }

  return normalized;
}

// ── Main scrape function ──────────────────────────────────────────────────────

class ScraperError extends Error {
  constructor(message, cause) {
    super(message);
    this.name   = 'ScraperError';
    this.cause  = cause;
    this.code   = 'SCRAPER_ERROR';
  }
}

/**
 * Scrape a URL using Playwright (handles JS-rendered SPAs/Shopify).
 *
 * @param {string} url - Fully qualified URL including https://
 * @returns {{
 *   finalUrl: string,
 *   title: string,
 *   html: string,
 *   cleanedHtml: string,
 *   meta: object,
 *   contact: {phone,email,address},
 *   jsonLdBlocks: object[],
 * }}
 * @throws {ScraperError}
 */
async function scrape(url) {
  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
      'AppleWebKit/537.36 (KHTML, like Gecko) ' +
      'Chrome/124.0.0.0 Safari/537.36',
    ignoreHTTPSErrors: true,
    locale: 'zh-TW,zh;q=0.9,en;q=0.8,ja;q=0.7',
  });

  let page;
  try {
    page = await context.newPage();

    // Block images, fonts, and media — scripts must remain for JS rendering
    await page.route('**/*', (route) => {
      const type = route.request().resourceType();
      if (['image', 'font', 'media', 'manifest'].includes(type)) {
        return route.abort();
      }
      return route.continue();
    });

    // Primary: wait for networkidle (captures JS-rendered content)
    // Fallback: domcontentloaded + short delay
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: SCRAPE_TIMEOUT_MS });
    } catch {
      // Either timeout or navigation error — grab whatever loaded
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: SCRAPE_TIMEOUT_MS });
        await page.waitForTimeout(NETWORKIDLE_WAIT_MS);
      } catch (innerErr) {
        throw new ScraperError(`Could not load page: ${innerErr.message}`, innerErr);
      }
    }

    const finalUrl = page.url();
    const html     = await page.content();

    // Sanity check — bot protection / empty pages
    if (html.length < 500) {
      throw new ScraperError('Page returned too little content — possible bot protection');
    }
    const bodyText = await page.evaluate(() => document.body?.innerText || '');
    if (
      bodyText.includes('Enable JavaScript and cookies to continue') ||
      bodyText.includes('Checking your browser before accessing')
    ) {
      throw new ScraperError('Site has bot protection (Cloudflare/similar) — cannot scrape');
    }

    // Extract metadata from full HTML
    const { title, metaDescription, og, jsonLdBlocks, llmsTxtHref, contact } =
      extractMetadata(html);

    // Produce token-efficient HTML for the LLM
    const cleanedHtml = cleanHtmlForLlm(html);

    return {
      finalUrl,
      title,
      html,        // full HTML — used by scorer
      cleanedHtml, // stripped HTML — used by LLM pipeline
      meta: { description: metaDescription, og, llmsTxtHref },
      contact,
      jsonLdBlocks,
    };
  } finally {
    // Always close the context (releases tab memory) but keep the browser alive
    await context.close().catch(() => {});
  }
}

module.exports = { scrape, closeBrowser, ScraperError };
