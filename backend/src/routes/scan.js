'use strict';

const express = require('express');
const db      = require('../lib/db');
const config  = require('../config');
const { urlToSlug, canonicalizeUrl }  = require('../lib/slug');
const { scrape, ScraperError }        = require('../services/scraper');
const { score }                       = require('../services/scorer');
const { extract }                     = require('../services/llmPipeline');
const { runAgentReadinessChecks }     = require('../services/agentReadiness');
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

async function runPipeline(websiteId, normalized, canonical, slug, preferredLang) {
  try {
    // 1. Scrape
    let scraped;
    try {
      scraped = await scrape(normalized);
    } catch (err) {
      console.error('[scan] Scraper error:', err.message);
      if (err.stack) console.error(err.stack);
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
    const generatedAssets = { llmsTxt, faqJsonLd, addressHtml, llmsTxtLinkTag };

    // 4.5. Agent Readiness checks are additive and must never fail the scan.
    const agentReadiness = await runAgentReadinessChecks({
      normalizedUrl: normalized,
      canonicalUrl: canonical,
      slug,
      scoreData,
      scraped,
      extracted: { ...extracted, lang },
      generatedAssets,
    }).catch((err) => {
      console.warn('[scan] Agent Readiness checks failed gracefully:', err.message);
      return null;
    });

    // 5. Persist scan data (atomic: scanResult + aeoContent must succeed together)
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
          agentReadiness,
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
          agentReadiness,
          lang,
        },
      }),
    ]);

    // 6. Mark website COMPLETE — separate from the transaction so it always runs
    //    even if the managed-PG connection pool doesn't honour array-transaction atomicity.
    await db.website.update({
      where: { id: websiteId },
      data: {
        title:         scraped.title || extracted.business_name || null,
        score:         scoreData.score,
        scanStatus:    'COMPLETE',
        scanCount:     { increment: 1 },
        lastScannedAt: now,
      },
    });

    console.log(`[scan] Completed: ${slug} (score: ${scoreData.score})`);
  } catch (err) {
    console.error('[scan] Pipeline error:', err.message);
    if (err.stack) console.error(err.stack);
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
  setImmediate(() => runPipeline(website.id, normalized, canonical, slug, preferredLang));
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

    // Defensive: pipeline completed data but status update was lost — self-repair.
    if (
      website.scanStatus === 'SCANNING' &&
      website.aeoContent &&
      website.scanResults.length > 0
    ) {
      await db.website
        .update({ where: { id }, data: { scanStatus: 'COMPLETE' } })
        .catch((e) => console.error('[scan] status-repair error:', e.message));
      website.scanStatus = 'COMPLETE';
    }

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
      agentReadiness: website.aeoContent?.agentReadiness ?? null,
    });
  } catch (err) {
    console.error('[scan] GET error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
