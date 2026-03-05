'use strict';

const express = require('express');
const db      = require('../lib/db');

const router = express.Router();

const VALID_CATEGORIES = ['其他', '商家', '景點', '餐廳', '住宿', '商店', '教育', '美容', '運動'];
const MAX_LIMIT = 100;

/**
 * GET /api/directory
 *
 * Query params:
 *   page      — page number (default 1)
 *   limit     — results per page (default 50, max 100)
 *   category  — filter by category (e.g. "餐廳")
 *   q         — search by site name or URL
 *
 * Returns:
 *   total         — total matching records
 *   page / limit
 *   websites      — array of site records with scores
 *   platformStats — aggregate stats shown at top of directory
 */
router.get('/api/directory', async (req, res) => {
  const page     = Math.max(1, parseInt(req.query.page  || '1',  10));
  const limit    = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit || '50', 10)));
  const skip     = (page - 1) * limit;
  const category = req.query.category;
  const q        = req.query.q?.trim();

  const where = {
    scanStatus: 'COMPLETE',
    ...(category && VALID_CATEGORIES.includes(category) ? { category } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { url:   { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  try {
    const [total, websites, stats] = await Promise.all([
      db.website.count({ where }),
      db.website.findMany({
        where,
        orderBy: { score: 'desc' },
        skip,
        take:    limit,
        select: {
          id:           true,
          url:          true,
          slug:         true,
          title:        true,
          category:     true,
          score:        true,
          lastScannedAt: true,
        },
      }),
      db.website.aggregate({
        where:  { scanStatus: 'COMPLETE' },
        _count: { _all: true },
        _avg:   { score: true },
        _max:   { score: true },
      }),
    ]);

    res.json({
      total,
      page,
      limit,
      websites,
      platformStats: {
        totalSites: stats._count._all,
        avgScore:   Math.round(stats._avg.score ?? 0),
        maxScore:   stats._max.score ?? 0,
      },
    });
  } catch (err) {
    console.error('[directory] error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
