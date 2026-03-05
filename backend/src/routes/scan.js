'use strict';

const express = require('express');
const db      = require('../lib/db');
const config  = require('../config');
const { urlToSlug, canonicalizeUrl }  = require('../lib/slug');
const { scrape, ScraperError }        = require('../services/scraper');
const { score }                       = require('../services/scorer');
const { extract }                     = require('../services/llmPipeline');
const {
  generateLlmsTxt,
  generateFaqJsonLd,
  generateAddressHtml,
  generateLlmsTxtLinkTag,
} = require('../services/contentGenerator');

const router = express.Router();

// ── URL helper ────────────────────────────────────────────────────────────────

function parseUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw Object.assign(new Error('url is required'), { status: 400 });
  }
  const withProtocol = rawUrl.trim().startsWith('http')
    ? rawUrl.trim()
    : `https://${rawUrl.trim()}`;

  let parsed;
  try { parsed = new URL(withProtocol); }
  catch { throw Object.assign(new Error('Invalid URL format'), { status: 400 }); }

  const normalized = `https://${parsed.hostname}${parsed.pathname === '/' ? '' : parsed.pathname}`;
  const canonical  = canonicalizeUrl(normalized);
  const slug       = urlToSlug(normalized);
  return { normalized, canonical, slug };
}

function mergeContact(scraperContact, llmContact) {
  return {
    phone:   scraperContact.phone   || llmContact.phone   || null,
    email:   scraperContact.email   || llmContact.email   || null,
    address: scraperContact.address || llmContact.address || null,
  };
}

async function markFailed(websiteId) {
  if (!websiteId) return;
  await db.website
    .update({ where: { id: websiteId }, data: { scanStatus: 'FAILED' } })
    .catch((e) => console.error('[scan] markFailed error:', e.message));
}

// ── Background pipeline ───────────────────────────────────────────────────────

async function runPipeline(websiteId, normalized, slug, preferredLang) {
  try {
    // 1. Scrape
    let scraped;
    try {
      scraped = await scrape(normalized);
    } catch (err) {
      console.error('[scan] Scraper error:', err instanceof ScraperError ? err.message : err);
      return await markFailed(websiteId);
    }

    // 2. Score (Cheerio — no LLM)
    const scoreData = score(scraped.html);

    // 3. LLM extraction
    const extracted    = await extract(scraped.cleanedHtml, normalized);
    const finalContact = mergeContact(scraped.contact, extracted.contact);
    extracted.contact  = finalContact;
    const lang         = extracted.lang !== 'en' ? extracted.lang : preferredLang;

    // 4. Generate artifacts
    const host           = config.PLATFORM_HOST;
    const llmsTxt        = generateLlmsTxt({ ...extracted, lang }, scoreData.score, slug, host);
    const faqJsonLd      = generateFaqJsonLd(extracted.faq);
    const addressHtml    = generateAddressHtml(finalContact, extracted.business_name, lang);
    const llmsTxtLinkTag = generateLlmsTxtLinkTag(slug, host);

    // 5. Persist (atomic transaction)
    const now = new Date();
    await db.$transaction([
      db.scanResult.create({
        data: { websiteId, ...scoreData, scannedAt: now },
      }),
      db.aeoContent.upsert({
        where:  { websiteId },
        update: {
          llmsTxt, faqJsonLd, addressHtml, llmsTxtLinkTag,
          businessName:     extracted.business_name,
          tagline:          extracted.tagline,
          about:            extracted.about,
          features:         extracted.features,
          productsServices: extracted.products_services,
          faq:              extracted.faq,
          searchKeywords:   extracted.search_keywords,
          recommendations:  extracted.recommendations,
          contact:          finalContact,
          lang,
          updatedAt:        now,
        },
        create: {
          websiteId, llmsTxt, faqJsonLd, addressHtml, llmsTxtLinkTag,
          businessName:     extracted.business_name,
          tagline:          extracted.tagline,
          about:            extracted.about,
          features:         extracted.features,
          productsServices: extracted.products_services,
          faq:              extracted.faq,
          searchKeywords:   extracted.search_keywords,
          recommendations:  extracted.recommendations,
          contact:          finalContact,
          lang,
        },
      }),
      db.website.update({
        where: { id: websiteId },
        data: {
          title:         scraped.title || extracted.business_name || null,
          score:         scoreData.score,
          scanStatus:    'COMPLETE',
          scanCount:     { increment: 1 },
          lastScannedAt: now,
        },
      }),
    ]);

    console.log(`[scan] Completed: ${slug} (score: ${scoreData.score})`);
  } catch (err) {
    console.error('[scan] Pipeline error:', err);
    await markFailed(websiteId);
  }
}

// ── POST /api/scan ────────────────────────────────────────────────────────────
// Returns 202 immediately; pipeline runs in background; client polls GET /api/scan/:id

router.post('/api/scan', async (req, res) => {
  const { url: rawUrl, lang: preferredLang = 'en' } = req.body;

  // URL validation
  let normalized, canonical, slug;
  try {
    ({ normalized, canonical, slug } = parseUrl(rawUrl));
  } catch (err) {
    return res.status(err.status || 400).json({ error: err.message });
  }

  // Upsert Website record (status: SCANNING)
  let website;
  try {
    website = await db.website.upsert({
      where:  { slug },
      update: { scanStatus: 'SCANNING', updatedAt: new Date() },
      create: { url: canonical, slug, scanStatus: 'SCANNING' },
    });
  } catch (err) {
    console.error('[scan] DB upsert error:', err);
    return res.status(500).json({ error: 'Database error — please try again' });
  }

  // Return 202 immediately so the client can start polling
  res.status(202).json({
    websiteId: website.id,
    slug:      website.slug,
    status:    'SCANNING',
  });

  // Launch pipeline in background — response is already sent
  setImmediate(() => runPipeline(website.id, normalized, slug, preferredLang));
});

// ── GET /api/scan/:id ─────────────────────────────────────────────────────────

router.get('/api/scan/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const website = await db.website.findUnique({
      where:   { id },
      include: {
        aeoContent:  true,
        scanResults: { orderBy: { scannedAt: 'desc' }, take: 1 },
      },
    });

    if (!website) return res.status(404).json({ error: 'Scan record not found' });

    return res.json({
      websiteId:     website.id,
      slug:          website.slug,
      url:           website.url,
      title:         website.title,
      score:         website.score,
      status:        website.scanStatus,
      lastScannedAt: website.lastScannedAt,
      latestScan:    website.scanResults[0] ?? null,
      aeoContent:    website.aeoContent,
    });
  } catch (err) {
    console.error('[scan] GET error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
