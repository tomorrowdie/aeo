'use strict';

module.exports = {
  PORT: parseInt(process.env.PORT || '8080', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
  /// Public hostname of this platform, used when generating llms.txt URLs
  PLATFORM_HOST: process.env.PLATFORM_HOST || 'localhost:8080',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
};
