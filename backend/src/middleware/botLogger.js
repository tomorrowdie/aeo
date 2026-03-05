'use strict';

const redis = require('../lib/redis');
const db = require('../lib/db');
const { detectBot } = require('../lib/bots');

/**
 * Write a bot visit to Redis (synchronous pipeline — fast) and PostgreSQL
 * (fire-and-forget — never blocks the response).
 *
 * @param {{ bot: {name:string,company:string}, path:string, statusCode:number, ip:string|undefined, userAgent:string }} opts
 */
async function logBotVisit({ bot, path, statusCode, ip, userAgent }) {
  const now = new Date();
  const isoNow = now.toISOString();

  const logEntry = JSON.stringify({
    bot:     bot.name,
    company: bot.company,
    path,
    status:  statusCode,
    ts:      isoNow,
  });

  // ── Redis write (fast path) ───────────────────────────────────────────────
  try {
    const pipe = redis.pipeline();
    pipe.lpush('crawler:logs:recent', logEntry);
    pipe.ltrim('crawler:logs:recent', 0, 499);          // keep newest 500
    pipe.hincrby('crawler:stats:24h', bot.name, 1);
    pipe.hincrby('crawler:stats:total', bot.name, 1);
    pipe.sadd('crawler:active_bots', bot.name);
    pipe.set('crawler:last_visit', isoNow);
    await pipe.exec();
  } catch (err) {
    // Redis is best-effort — a failure must never crash the server
    console.error('[botLogger] Redis write failed:', err.message);
  }

  // ── PostgreSQL write (fire-and-forget) ───────────────────────────────────
  db.crawlerLog
    .create({
      data: {
        botName:    bot.name,
        botCompany: bot.company,
        urlPath:    path,
        statusCode,
        ipAddress:  ip ?? null,
        userAgent:  userAgent ?? null,
        visitedAt:  now,
      },
    })
    .catch((err) => console.error('[botLogger] DB write failed:', err.message));
}

/**
 * Express middleware.
 *
 * - Detects known AI crawler User-Agents.
 * - Attaches `req.bot = { name, company }` if detected (null otherwise).
 * - After the response is sent, logs the visit with the real HTTP status code.
 */
function botLogger(req, res, next) {
  const ua  = req.headers['user-agent'] || '';
  const bot = detectBot(ua);

  req.bot = bot; // downstream route handlers can read this

  if (bot) {
    res.on('finish', () => {
      const ip =
        (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
        req.socket?.remoteAddress ||
        undefined;

      logBotVisit({
        bot,
        path:       req.originalUrl,
        statusCode: res.statusCode,
        ip,
        userAgent:  ua,
      }).catch(() => {}); // swallow — never throw inside event handler
    });
  }

  next();
}

module.exports = botLogger;
