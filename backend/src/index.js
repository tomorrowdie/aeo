'use strict';

require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');

const config      = require('./config');
const botLogger   = require('./middleware/botLogger');
const aeoRoutes   = require('./routes/aeo');
const dashRoutes  = require('./routes/dashboard');
const scanRoutes  = require('./routes/scan');
const lbRoutes    = require('./routes/leaderboard');
const dirRoutes   = require('./routes/directory');
const subRoutes   = require('./routes/subscribe');

const app = express();

// ── Trust Zeabur's ingress so req.ip returns the real client IP ───────────
app.set('trust proxy', 1);

// ── Security headers ────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));

// ── CORS (Next.js frontend + future Shopify embed) ───────────────────────────
app.use(
  cors({
    origin: [
      config.FRONTEND_URL,
      /\.zeabur\.app$/,            // all Zeabur preview deployments
      /localhost:\d+$/,            // local dev
    ],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));

// ── HTTP request logging (stdout → Zeabur log stream) ────────────────────────
app.use(morgan(config.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Bot detection & logging — must be registered BEFORE route handlers ────────
app.use(botLogger);

// ── Routes ───────────────────────────────────────────────────────────────────
app.use(aeoRoutes);   // /aeo/*, /sitemap-aeo.xml
app.use(dashRoutes);  // /api/dashboard
app.use(scanRoutes);  // /api/scan
app.use(lbRoutes);    // /api/leaderboard
app.use(dirRoutes);   // /api/directory
app.use(subRoutes);   // /api/subscribe

// ── Health check (used by Zeabur readiness probe) ─────────────────────────────
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', ts: new Date().toISOString() })
);

// ── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// ── Global error handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[Unhandled error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(config.PORT, () => {
  console.log(`[AEO Backend] Listening on port ${config.PORT} (${config.NODE_ENV})`);
});

module.exports = app; // export for testing
