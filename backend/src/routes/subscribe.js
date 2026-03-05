'use strict';

const express = require('express');
const db      = require('../lib/db');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/subscribe
 * Body: { email: string }
 *
 * Adds an email to the subscriber list (upsert — idempotent).
 */
router.post('/api/subscribe', async (req, res) => {
  const { email } = req.body;

  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'A valid email address is required' });
  }

  try {
    await db.subscriber.upsert({
      where:  { email },
      update: {},
      create: { email },
    });
    res.json({ success: true });
  } catch (err) {
    console.error('[subscribe] error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
