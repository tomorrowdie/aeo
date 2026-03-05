'use strict';

const express = require('express');
const db      = require('../lib/db');
const config  = require('../config');

const router = express.Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getWebsiteWithContent(slug) {
  return db.website.findUnique({
    where:   { slug },
    include: {
      aeoContent:  true,
      scanResults: { orderBy: { scannedAt: 'desc' }, take: 1 },
    },
  });
}

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * Serve llms.txt for AI crawlers.
 * Two URL patterns are supported:
 *   GET /aeo/shops/:slug/llms.txt          (canonical)
 *   GET /api/v1/aeo/shop/:slug/llms.txt    (API alias)
 */
async function serveLlmsTxt(req, res) {
  const { slug } = req.params;
  try {
    const website = await db.website.findUnique({
      where:   { slug },
      include: { aeoContent: true },
    });

    if (!website || !website.aeoContent?.llmsTxt) {
      return res
        .status(404)
        .type('text/plain; charset=utf-8')
        .send(
          `# Profile not found\n\nNo AEO profile exists for "${slug}" yet.\n\n` +
          `> Scan your site at https://${config.PLATFORM_HOST}\n`
        );
    }

    res
      .status(200)
      .type('text/plain; charset=utf-8')
      .set('Cache-Control', 'public, max-age=3600') // 1-hour CDN cache
      .send(website.aeoContent.llmsTxt);
  } catch (err) {
    console.error('[aeo] serveLlmsTxt error:', err);
    res.status(500).type('text/plain').send('Internal server error');
  }
}

router.get('/aeo/shops/:slug/llms.txt',         serveLlmsTxt);
router.get('/api/v1/aeo/shop/:slug/llms.txt',   serveLlmsTxt);

/**
 * Business profile JSON — used by the frontend /aeo/shops/[slug] page.
 * GET /aeo/shops/:slug
 */
router.get('/aeo/shops/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    const website = await getWebsiteWithContent(slug);

    if (!website) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    res.json({
      id:           website.id,
      url:          website.url,
      slug:         website.slug,
      title:        website.title,
      category:     website.category,
      score:        website.score,
      scanCount:    website.scanCount,
      lastScannedAt: website.lastScannedAt,
      latestScan:   website.scanResults[0] ?? null,
      aeoContent:   website.aeoContent,
    });
  } catch (err) {
    console.error('[aeo] shop profile error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * AEO sitemap — lists all llms.txt URLs for AI crawlers.
 * Bingbot and ClaudeBot have been observed visiting /sitemap-aeo.xml.
 * GET /sitemap-aeo.xml
 */
router.get('/sitemap-aeo.xml', async (req, res) => {
  try {
    const websites = await db.website.findMany({
      where:   { scanStatus: 'COMPLETE' },
      select:  { slug: true, updatedAt: true },
      orderBy: { score: 'desc' },
      take:    2000,
    });

    const base = `https://${config.PLATFORM_HOST}`;
    const urlEntries = websites
      .map(
        (w) =>
          `  <url>\n` +
          `    <loc>${base}/aeo/shops/${w.slug}/llms.txt</loc>\n` +
          `    <lastmod>${w.updatedAt.toISOString().split('T')[0]}</lastmod>\n` +
          `    <changefreq>daily</changefreq>\n` +
          `    <priority>0.8</priority>\n` +
          `  </url>`
      )
      .join('\n');

    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urlEntries +
      `\n</urlset>`;

    res.status(200).type('application/xml').send(xml);
  } catch (err) {
    console.error('[aeo] sitemap error:', err);
    res.status(500).type('text/plain').send('Internal server error');
  }
});

module.exports = router;
