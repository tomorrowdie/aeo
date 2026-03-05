'use strict';

const { PrismaClient } = require('@prisma/client');

// Prevent multiple Prisma instances in development (hot-reload safe)
const globalForPrisma = global;

const db =
  globalForPrisma.__prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prisma = db;
}

module.exports = db;
