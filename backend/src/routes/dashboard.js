'use strict';

const express = require('express');
const redis   = require('../lib/redis');
const db      = require('../lib/db');

const router = express.Router();

/**
 * GET /api/dashboard
 *
 * Returns aggregated live stats for the main landing-page dashboard:
 *   - totalVisits    — all-time bot visit count
 *   - last24h        — bot visits in the last 24 hours
 *   - activeBotCount — number of distinct bot types seen in the last 24h
 *   - lastVisitAt    — ISO timestamp of the most recent bot visit
 *   - botBreakdown   — array of per-bot stats sorted by count24h desc
 *   - recentLogs     — last 20 log entries for the live feed table
 *
 * Primary data source: Redis (sub-millisecond).
 * Fallback: PostgreSQL if Redis is unavailable.
 */
router.get('/api/dashboard', async (req, res) => {
  try {
    const [rawLogs, stats24h, statsTotal, lastVisit, activeBots] =
      await Promise.all([
        redis.lrange('crawler:logs:recent', 0, 49),
        redis.hgetall('crawler:stats:24h'),
        redis.hgetall('crawler:stats:total'),
        redis.get('crawler:last_visit'),
        redis.smembers('crawler:active_bots'),
      ]);

    const recentLogs = rawLogs
      .map((entry) => {
        try { return JSON.parse(entry); }
        catch { return null; }
      })
      .filter(Boolean);

    const total24h = Object.values(stats24h  || {}).reduce((s, v) => s + parseInt(v, 10), 0);
    const totalAll = Object.values(statsTotal || {}).reduce((s, v) => s + parseInt(v, 10), 0);

    // Build per-bot breakdown from total stats, enrich with last-seen from log
    const botBreakdown = Object.entries(statsTotal || {})
      .map(([name, count]) => {
        const lastLog = recentLogs.find((l) => l.bot === name);
        return {
          name,
          company:    lastLog?.company ?? name,
          countTotal: parseInt(count, 10),
          count24h:   parseInt((stats24h || {})[name] ?? '0', 10),
          lastSeenAt: lastLog?.ts ?? null,
        };
      })
      .sort((a, b) => b.count24h - a.count24h);

    return res.json({
      totalVisits:    totalAll,
      last24h:        total24h,
      activeBotCount: activeBots.length,
      lastVisitAt:    lastVisit ?? null,
      botBreakdown,
      recentLogs:     recentLogs.slice(0, 20),
    });
  } catch (redisErr) {
    console.error('[dashboard] Redis unavailable, falling back to DB:', redisErr.message);
  }

  // ── PostgreSQL fallback ───────────────────────────────────────────────────
  try {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [totalAll, total24h, recentRows] = await Promise.all([
      db.crawlerLog.count(),
      db.crawlerLog.count({ where: { visitedAt: { gte: since24h } } }),
      db.crawlerLog.findMany({
        orderBy: { visitedAt: 'desc' },
        take:    20,
        select:  {
          botName:    true,
          botCompany: true,
          urlPath:    true,
          statusCode: true,
          visitedAt:  true,
        },
      }),
    ]);

    return res.json({
      totalVisits:    totalAll,
      last24h:        total24h,
      activeBotCount: 0,
      lastVisitAt:    recentRows[0]?.visitedAt ?? null,
      botBreakdown:   [],
      recentLogs:     recentRows.map((r) => ({
        bot:     r.botName,
        company: r.botCompany,
        path:    r.urlPath,
        status:  r.statusCode,
        ts:      r.visitedAt,
      })),
    });
  } catch (dbErr) {
    console.error('[dashboard] DB fallback also failed:', dbErr.message);
    return res.status(503).json({ error: 'Service temporarily unavailable' });
  }
});

module.exports = router;
