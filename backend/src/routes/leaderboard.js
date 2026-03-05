'use strict';

const express = require('express');
const db      = require('../lib/db');

const router = express.Router();

/**
 * GET /api/leaderboard
 *
 * Returns:
 *   topTen    — top 10 sites by AEO score (all time)
 *   newcomers — 10 most recently scanned sites (sorted by createdAt desc)
 */
router.get('/api/leaderboard', async (req, res) => {
  try {
    const [topTen, newcomers] = await Promise.all([
      db.website.findMany({
        where:   { scanStatus: 'COMPLETE' },
        orderBy: { score: 'desc' },
        take:    10,
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
      db.website.findMany({
        where:   { scanStatus: 'COMPLETE' },
        orderBy: { createdAt: 'desc' },
        take:    10,
        select: {
          id:        true,
          url:       true,
          slug:      true,
          title:     true,
          category:  true,
          score:     true,
          createdAt: true,
        },
      }),
    ]);

    res.json({ topTen, newcomers });
  } catch (err) {
    console.error('[leaderboard] error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
