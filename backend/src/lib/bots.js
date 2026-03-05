'use strict';

/**
 * Known AI crawler User-Agent substrings → company + display name.
 * Keys are substring matches against the full User-Agent string.
 * Order matters: more specific strings should appear before partial ones.
 */
const BOT_MAP = {
  // OpenAI
  'GPTBot':               { company: 'OpenAI',        name: 'GPTBot' },
  'ChatGPT-User':         { company: 'OpenAI',        name: 'ChatGPT' },
  'OAI-SearchBot':        { company: 'OpenAI',        name: 'ChatGPT' },
  // Anthropic
  'ClaudeBot':            { company: 'Anthropic',     name: 'ClaudeBot' },
  'Claude-Web':           { company: 'Anthropic',     name: 'ClaudeBot' },
  'anthropic-ai':         { company: 'Anthropic',     name: 'ClaudeBot' },
  // Perplexity
  'PerplexityBot':        { company: 'Perplexity',    name: 'PerplexityBot' },
  // Microsoft
  'Bingbot':              { company: 'Microsoft',     name: 'Bingbot' },
  'BingPreview':          { company: 'Microsoft',     name: 'Bingbot' },
  // DuckDuckGo
  'DuckDuckBot':          { company: 'DuckDuckGo',    name: 'DuckDuckBot' },
  'DuckAssistBot':        { company: 'DuckDuckGo',    name: 'DuckDuckBot' },
  // Yandex
  'YandexBot':            { company: 'Yandex',        name: 'YandexBot' },
  // Huawei
  'PetalBot':             { company: 'Huawei',        name: 'PetalBot' },
  // Amazon
  'Amazonbot':            { company: 'Amazon',        name: 'Amazonbot' },
  // Common Crawl
  'CCBot':                { company: 'Common Crawl',  name: 'CCBot' },
  // Cohere
  'cohere-ai':            { company: 'Cohere',        name: 'Cohere' },
  // You.com
  'YouBot':               { company: 'You.com',       name: 'YouBot' },
  // ByteDance
  'Bytespider':           { company: 'ByteDance',     name: 'Bytespider' },
  // Meta
  'Meta-ExternalAgent':   { company: 'Meta',          name: 'Meta AI' },
  'FacebookBot':          { company: 'Meta',          name: 'Meta AI' },
  'facebookexternalhit':  { company: 'Meta',          name: 'Meta AI' },
  // Google
  'Google-Extended':      { company: 'Google',        name: 'Google AI' },
  'Googlebot':            { company: 'Google',        name: 'Google AI' },
  // Apple
  'Applebot':             { company: 'Apple',         name: 'Apple AI' },
};

/**
 * Detect whether a User-Agent string belongs to a known AI crawler.
 * @param {string} userAgent
 * @returns {{ name: string; company: string } | null}
 */
function detectBot(userAgent) {
  if (!userAgent) return null;
  for (const [key, info] of Object.entries(BOT_MAP)) {
    if (userAgent.includes(key)) return info;
  }
  return null;
}

module.exports = { BOT_MAP, detectBot };
