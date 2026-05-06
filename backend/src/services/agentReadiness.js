'use strict';

const cheerio = require('cheerio');

const FETCH_TIMEOUT_MS = 5_000;

const AI_BOT_NAMES = [
  'GPTBot',
  'ChatGPT-User',
  'OAI-SearchBot',
  'ClaudeBot',
  'Claude-Web',
  'anthropic-ai',
  'PerplexityBot',
  'Google-Extended',
  'CCBot',
  'Amazonbot',
  'Bytespider',
  'Applebot-Extended',
  'cohere-ai',
];

const CHECK_POINTS = {
  robots_txt: 10,
  sitemap_xml: 10,
  llms_txt_installed: 12,
  meta_description: 8,
  og_tags: 8,
  json_ld: 14,
  faq_json_ld: 8,
  content_signal: 7,
  ai_bot_policy: 7,
  media_visual_context: 10,
  fix_install_readiness: 6,
  markdown_negotiation: 0,
};

const CATEGORY_LABELS = {
  discoverability: 'Discoverability',
  ai_content_readability: 'AI Content Readability',
  structured_trust: 'Structured Trust',
  ai_policy_control: 'AI Policy & Control',
  media_visual_context: 'Media & Visual Context',
  fix_install_readiness: 'Fix / Install Readiness',
  informational: 'Informational',
};

function makeCheck({
  id,
  label,
  category,
  status,
  scoreImpact = CHECK_POINTS[id] ?? 0,
  scoreAwarded,
  priority = 'medium',
  evidence,
  detectedUrl,
  detectedValue,
  details,
  informational = false,
}) {
  const awarded = scoreAwarded ?? (status === 'pass' ? scoreImpact : status === 'warning' ? Math.floor(scoreImpact / 2) : 0);
  return {
    id,
    label,
    category,
    status,
    scoreImpact,
    scoreAwarded: informational ? 0 : awarded,
    priority,
    evidence,
    detectedUrl,
    detectedValue,
    details,
    informational,
  };
}

async function fetchTextWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      redirect: 'follow',
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'AEO-AgentReadiness/1.0 (+https://aeo.zeabur.app)',
        ...(options.headers || {}),
      },
    });
    const contentType = res.headers.get('content-type') || '';
    const body = await res.text();
    return {
      ok: res.ok,
      status: res.status,
      url: res.url || url,
      contentType,
      headers: Object.fromEntries(res.headers.entries()),
      body,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function safeFetchText(url, options = {}) {
  try {
    return await fetchTextWithTimeout(url, options);
  } catch (err) {
    return {
      ok: false,
      status: 0,
      url,
      contentType: '',
      headers: {},
      body: '',
      error: err.name === 'AbortError' ? 'Request timed out' : err.message,
    };
  }
}

function getOrigin(normalizedUrl) {
  return new URL(normalizedUrl).origin;
}

function parseRobotsTxt(body = '') {
  const lines = body.split(/\r?\n/);
  const blocks = [];
  const sitemaps = [];
  const contentSignals = [];
  let current = null;

  for (const rawLine of lines) {
    const line = rawLine.replace(/#.*/, '').trim();
    if (!line) continue;

    const separator = line.indexOf(':');
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (key === 'user-agent') {
      current = { userAgent: value, rules: [] };
      blocks.push(current);
    } else if ((key === 'allow' || key === 'disallow') && current) {
      current.rules.push({ type: key, value });
    } else if (key === 'sitemap') {
      sitemaps.push(value);
    } else if (key === 'content-signal') {
      contentSignals.push(value);
    }
  }

  return { blocks, sitemaps, contentSignals };
}

function hasBroadBlock(parsedRobots) {
  return parsedRobots.blocks.some((block) => {
    const isGlobal = block.userAgent === '*';
    const blocksAll = block.rules.some((rule) => rule.type === 'disallow' && rule.value === '/');
    return isGlobal && blocksAll;
  });
}

function checkRobotsTxt(robotsResult) {
  if (!robotsResult.ok || !robotsResult.body.trim()) {
    return makeCheck({
      id: 'robots_txt',
      label: 'robots.txt',
      category: 'discoverability',
      status: 'fail',
      priority: 'high',
      evidence: robotsResult.error || `HTTP ${robotsResult.status}`,
      detectedUrl: robotsResult.url,
    });
  }

  const parsed = parseRobotsTxt(robotsResult.body);
  if (hasBroadBlock(parsed)) {
    return makeCheck({
      id: 'robots_txt',
      label: 'robots.txt',
      category: 'discoverability',
      status: 'warning',
      priority: 'high',
      evidence: 'robots.txt exists but includes a broad Disallow: / rule.',
      detectedUrl: robotsResult.url,
      details: { parsed },
    });
  }

  return makeCheck({
    id: 'robots_txt',
    label: 'robots.txt',
    category: 'discoverability',
    status: 'pass',
    priority: 'high',
    evidence: 'Readable robots.txt found.',
    detectedUrl: robotsResult.url,
    details: { parsed },
  });
}

function looksLikeSitemap(body = '', contentType = '') {
  const trimmed = body.trim().slice(0, 2000).toLowerCase();
  return (
    contentType.includes('xml') ||
    trimmed.includes('<urlset') ||
    trimmed.includes('<sitemapindex') ||
    trimmed.includes('<sitemap>')
  );
}

async function checkSitemapXml(origin, parsedRobots) {
  const attempts = [];

  // 1. Try robots.txt Sitemap directives first — sequential, usually 0–1 entries,
  //    and we need to honour their explicit declaration before falling back.
  const robotsSitemaps = [...new Set((parsedRobots?.sitemaps || []).filter(Boolean))];
  for (const url of robotsSitemaps) {
    const result = await safeFetchText(url);
    attempts.push({ url, status: result.status, ok: result.ok });
    if (result.ok && looksLikeSitemap(result.body, result.contentType)) {
      return makeCheck({
        id: 'sitemap_xml',
        label: 'sitemap.xml',
        category: 'discoverability',
        status: 'pass',
        priority: 'high',
        evidence: 'Sitemap discovered via robots.txt Sitemap directive.',
        detectedUrl: result.url,
        details: { attempts },
      });
    }
  }

  // 2. Fetch the three standard paths in parallel — worst case is one 5s timeout
  //    instead of three sequential 5s timeouts (15s).
  const standardCandidates = [
    `${origin}/sitemap.xml`,
    `${origin}/sitemap_index.xml`,
    `${origin}/sitemap-index.xml`,
  ].filter((url) => !robotsSitemaps.includes(url)); // skip if already tried above

  const settled = await Promise.allSettled(
    standardCandidates.map((url) => safeFetchText(url))
  );

  for (let i = 0; i < settled.length; i++) {
    const r = settled[i];
    const url = standardCandidates[i];
    if (r.status === 'fulfilled') {
      const result = r.value;
      attempts.push({ url, status: result.status, ok: result.ok });
      if (result.ok && looksLikeSitemap(result.body, result.contentType)) {
        return makeCheck({
          id: 'sitemap_xml',
          label: 'sitemap.xml',
          category: 'discoverability',
          status: 'pass',
          priority: 'high',
          evidence: 'Sitemap discovered.',
          detectedUrl: result.url,
          details: { attempts },
        });
      }
    } else {
      attempts.push({ url, status: 0, ok: false, error: r.reason?.message });
    }
  }

  return makeCheck({
    id: 'sitemap_xml',
    label: 'sitemap.xml',
    category: 'discoverability',
    status: 'fail',
    priority: 'high',
    evidence: 'No sitemap found at common paths or robots.txt Sitemap directives.',
    details: { attempts },
  });
}

function checkLlmsTxtInstalled(llmsResult) {
  const isText = llmsResult.contentType.includes('text') || llmsResult.contentType.includes('markdown') || !llmsResult.contentType;
  if (llmsResult.ok && isText && llmsResult.body.trim().length > 0) {
    return makeCheck({
      id: 'llms_txt_installed',
      label: 'llms.txt installed',
      category: 'ai_content_readability',
      status: 'pass',
      priority: 'high',
      evidence: 'The website serves a readable /llms.txt file.',
      detectedUrl: llmsResult.url,
    });
  }

  return makeCheck({
    id: 'llms_txt_installed',
    label: 'llms.txt installed',
    category: 'ai_content_readability',
    status: 'fail',
    priority: 'high',
    evidence: llmsResult.error || `No readable /llms.txt detected (HTTP ${llmsResult.status}).`,
    detectedUrl: llmsResult.url,
  });
}

function parseContentSignal(value = '') {
  return value.split(',').reduce((acc, part) => {
    const [key, val] = part.split('=').map((item) => item?.trim());
    if (key && val) acc[key] = val;
    return acc;
  }, {});
}

function checkContentSignal(robotsResult) {
  if (!robotsResult.ok || !robotsResult.body) {
    return makeCheck({
      id: 'content_signal',
      label: 'Content-Signal',
      category: 'ai_policy_control',
      status: 'warning',
      priority: 'medium',
      evidence: 'robots.txt was unavailable, so Content-Signal could not be checked.',
    });
  }

  const match = robotsResult.body.match(/^content-signal\s*:\s*(.+)$/im);
  if (!match) {
    return makeCheck({
      id: 'content_signal',
      label: 'Content-Signal',
      category: 'ai_policy_control',
      status: 'fail',
      priority: 'medium',
      evidence: 'No emerging Content-Signal AI content policy directive found in robots.txt.',
    });
  }

  const parsed = parseContentSignal(match[1]);
  const parsedKeys = Object.keys(parsed);
  return makeCheck({
    id: 'content_signal',
    label: 'Content-Signal',
    category: 'ai_policy_control',
    status: parsedKeys.length > 0 ? 'pass' : 'warning',
    priority: 'medium',
    evidence: `Content-Signal: ${match[1].trim()}`,
    detectedValue: match[1].trim(),
    details: { parsed },
  });
}

function classifyAiBotPolicy(robotsBody = '') {
  const parsed = parseRobotsTxt(robotsBody);
  const aiBlocks = parsed.blocks.filter((block) =>
    AI_BOT_NAMES.some((botName) => block.userAgent.toLowerCase() === botName.toLowerCase())
  );
  const globalBlocks = parsed.blocks.filter((block) => block.userAgent === '*');

  if (aiBlocks.length === 0 && globalBlocks.length === 0) {
    return { classification: 'unaddressed', aiBlocks: [], globalBlocks: [] };
  }

  const summarize = (block) => {
    const allows = block.rules.some((rule) => rule.type === 'allow' && (rule.value === '/' || rule.value === ''));
    const blocks = block.rules.some((rule) => rule.type === 'disallow' && rule.value === '/');
    return { userAgent: block.userAgent, allows, blocks, rules: block.rules };
  };

  const summaries = aiBlocks.map(summarize);
  const hasAllow = summaries.some((item) => item.allows);
  const hasBlock = summaries.some((item) => item.blocks);

  if (hasAllow && hasBlock) return { classification: 'selective', aiBlocks: summaries, globalBlocks };
  if (hasBlock) return { classification: 'explicit_block', aiBlocks: summaries, globalBlocks };
  if (hasAllow || aiBlocks.length > 0) return { classification: 'explicit_allow', aiBlocks: summaries, globalBlocks };

  return { classification: 'global_policy', aiBlocks: summaries, globalBlocks };
}

function checkAiBotPolicy(robotsResult) {
  if (!robotsResult.ok || !robotsResult.body) {
    return makeCheck({
      id: 'ai_bot_policy',
      label: 'AI bot policy',
      category: 'ai_policy_control',
      status: 'warning',
      scoreAwarded: 0,
      priority: 'medium',
      evidence: 'robots.txt was unavailable, so AI bot policy could not be checked.',
    });
  }

  const policy = classifyAiBotPolicy(robotsResult.body);
  const status = policy.classification === 'unaddressed' ? 'warning' : 'pass';
  const scoreAwarded = policy.classification === 'unaddressed'
    ? Math.floor(CHECK_POINTS.ai_bot_policy / 2)
    : CHECK_POINTS.ai_bot_policy;

  return makeCheck({
    id: 'ai_bot_policy',
    label: 'AI bot policy',
    category: 'ai_policy_control',
    status,
    scoreAwarded,
    priority: 'medium',
    evidence: policy.classification === 'unaddressed'
      ? 'No AI-specific bot policy found. This is common, but explicit policy helps control.'
      : `AI bot policy classification: ${policy.classification}.`,
    detectedValue: policy.classification,
    details: policy,
  });
}

function checkMarkdownNegotiation(markdownResult) {
  const contentType = markdownResult.contentType || '';
  const supportsMarkdown = markdownResult.ok && (
    contentType.includes('text/markdown') ||
    contentType.includes('text/x-markdown')
  );

  if (supportsMarkdown) {
    return makeCheck({
      id: 'markdown_negotiation',
      label: 'Markdown negotiation',
      category: 'informational',
      status: 'pass',
      scoreImpact: 0,
      scoreAwarded: 0,
      priority: 'low',
      informational: true,
      evidence: `Server returned ${contentType}.`,
      detectedUrl: markdownResult.url,
      details: {
        contentType,
        markdownTokens: markdownResult.headers?.['x-markdown-tokens'] || null,
      },
    });
  }

  return makeCheck({
    id: 'markdown_negotiation',
    label: 'Markdown negotiation',
    category: 'informational',
    status: 'warning',
    scoreImpact: 0,
    scoreAwarded: 0,
    priority: 'low',
    informational: true,
    evidence: markdownResult.ok
      ? `Informational only: server returned ${contentType || 'unknown content type'} for Accept: text/markdown.`
      : `Informational only: markdown request could not be verified (${markdownResult.error || `HTTP ${markdownResult.status}`}).`,
    detectedUrl: markdownResult.url,
    details: { contentType },
  });
}

function isGenericImageFilename(src = '') {
  const clean = src.split('?')[0].split('#')[0].split('/').pop() || '';
  return [
    /^img[_-]?\d{3,}\.(jpe?g|png|webp|gif)$/i,
    /^image[_-]?\d*\.(jpe?g|png|webp|gif)$/i,
    /^dsc[_-]?\d{3,}\.(jpe?g|png|webp|gif)$/i,
    /^final(?:[-_ ]?final)+\.(jpe?g|png|webp|gif)$/i,
    /^untitled[_-]?\d*\.(jpe?g|png|webp|gif)$/i,
    /^photo[_-]?\d*\.(jpe?g|png|webp|gif)$/i,
  ].some((pattern) => pattern.test(clean));
}

function hasVideoContext($, el) {
  const node = $(el);
  const label = [
    node.attr('title'),
    node.attr('aria-label'),
    node.attr('data-title'),
    node.closest('figure, section, article, div').find('figcaption, h1, h2, h3, p').first().text(),
  ].filter(Boolean).join(' ').trim();

  const transcriptHints = node.closest('section, article, div').text().match(/\b(transcript|caption|subtitles|video description)\b/i);
  return Boolean(label.length > 20 || transcriptHints);
}

function checkMediaVisualContext(html, scrapedMeta = {}) {
  const $ = cheerio.load(html || '', { decodeEntities: false });
  const images = $('img').toArray();
  const totalImages = images.length;
  const missingAlt = [];
  const genericFilenames = [];
  let infographicLikeWithContext = 0;

  images.forEach((el) => {
    const node = $(el);
    const alt = (node.attr('alt') || '').trim();
    const src = node.attr('src') || node.attr('data-src') || '';
    if (!alt) missingAlt.push(src || '(inline image)');
    if (isGenericImageFilename(src)) genericFilenames.push(src);

    const surroundingText = node.closest('figure, section, article, div').text().replace(/\s+/g, ' ').trim();
    const looksInfographic = /infographic|chart|diagram|graph|workflow|map|comparison|timeline/i.test(`${src} ${alt}`);
    if (looksInfographic && surroundingText.length > 120) infographicLikeWithContext += 1;
  });

  const ogImage = scrapedMeta?.og?.image || $('meta[property="og:image"]').attr('content') || null;
  const videoNodes = $('video, iframe[src*="youtube"], iframe[src*="vimeo"], iframe[src*="wistia"], iframe[src*="loom"]').toArray();
  const videosWithContext = videoNodes.filter((el) => hasVideoContext($, el)).length;

  let subScore = 0;
  if (totalImages === 0) {
    subScore += 6;
  } else {
    const altCoverage = (totalImages - missingAlt.length) / totalImages;
    subScore += Math.round(4 * altCoverage);
  }
  if (genericFilenames.length === 0) subScore += 2;
  if (ogImage) subScore += 2;
  if (videoNodes.length === 0 || videosWithContext > 0) subScore += 1;
  if (infographicLikeWithContext > 0 || totalImages === 0) subScore += 1;

  subScore = Math.min(subScore, CHECK_POINTS.media_visual_context);

  const status = subScore >= 8 ? 'pass' : subScore >= 5 ? 'warning' : 'fail';
  const issues = [];
  if (missingAlt.length > 0) issues.push(`${missingAlt.length} image(s) missing alt text`);
  if (genericFilenames.length > 0) issues.push(`${genericFilenames.length} image(s) use generic filenames`);
  if (!ogImage) issues.push('missing og:image');
  if (videoNodes.length > 0 && videosWithContext === 0) issues.push('video embeds lack nearby context hints');

  return makeCheck({
    id: 'media_visual_context',
    label: 'Media & visual context',
    category: 'media_visual_context',
    status,
    scoreImpact: CHECK_POINTS.media_visual_context,
    scoreAwarded: subScore,
    priority: 'medium',
    evidence: issues.length > 0 ? issues.join('; ') : 'Visual media has machine-readable context.',
    detectedValue: `${subScore}/${CHECK_POINTS.media_visual_context}`,
    details: {
      totalImages,
      missingAltCount: missingAlt.length,
      missingAltSamples: missingAlt.slice(0, 5),
      genericFilenameCount: genericFilenames.length,
      genericFilenameSamples: genericFilenames.slice(0, 5),
      hasOgImage: Boolean(ogImage),
      ogImage,
      videoEmbedCount: videoNodes.length,
      videosWithContext,
      infographicLikeWithContext,
    },
  });
}

function existingCheck(id, label, category, passed, priority, evidencePass, evidenceFail) {
  return makeCheck({
    id,
    label,
    category,
    status: passed ? 'pass' : 'fail',
    priority,
    evidence: passed ? evidencePass : evidenceFail,
  });
}

function checkFixInstallReadiness(generatedAssets = {}) {
  const assets = [
    generatedAssets.llmsTxt,
    generatedAssets.faqJsonLd,
    generatedAssets.addressHtml,
    generatedAssets.llmsTxtLinkTag,
  ].filter((value) => typeof value === 'string' && value.trim().length > 0);

  const passed = assets.length >= 3;
  return makeCheck({
    id: 'fix_install_readiness',
    label: 'Fix / install readiness',
    category: 'fix_install_readiness',
    status: passed ? 'pass' : 'warning',
    priority: 'medium',
    evidence: passed
      ? 'AEO generated copyable install assets for the site.'
      : 'Some generated install assets are missing or empty.',
    details: {
      hasLlmsTxt: Boolean(generatedAssets.llmsTxt),
      hasFaqJsonLd: Boolean(generatedAssets.faqJsonLd),
      hasAddressHtml: Boolean(generatedAssets.addressHtml),
      hasLlmsTxtLinkTag: Boolean(generatedAssets.llmsTxtLinkTag),
    },
  });
}

function scoreToLevel(score) {
  if (score >= 90) return 'Agent Ready';
  if (score >= 75) return 'Agent Discoverable';
  if (score >= 50) return 'AI Readable';
  if (score >= 25) return 'Basic Web Presence';
  return 'Not Agent Ready';
}

function buildCategories(checks) {
  const categories = {};

  for (const check of checks) {
    if (!categories[check.category]) {
      categories[check.category] = {
        id: check.category,
        label: CATEGORY_LABELS[check.category] || check.category,
        score: 0,
        passed: 0,
        total: 0,
        weight: 0,
        checks: [],
      };
    }

    const category = categories[check.category];
    category.checks.push(check);
    if (!check.informational) {
      category.total += 1;
      category.weight += check.scoreImpact;
      if (check.status === 'pass') category.passed += 1;
    }
  }

  for (const category of Object.values(categories)) {
    const possible = category.checks
      .filter((check) => !check.informational)
      .reduce((sum, check) => sum + check.scoreImpact, 0);
    const awarded = category.checks
      .filter((check) => !check.informational)
      .reduce((sum, check) => sum + check.scoreAwarded, 0);
    category.score = possible > 0 ? Math.round((awarded / possible) * 100) : 0;
  }

  return categories;
}

function recommendationForCheck(check, context) {
  const recommendations = {
    robots_txt: {
      title: 'Add a readable robots.txt file',
      category: check.category,
      difficulty: 'easy',
      goal: 'Make crawler policy discoverable at a standard URL.',
      issue: 'The scanner could not find a readable robots.txt file.',
      whyItMatters: 'Robots.txt is the first place many crawlers check for crawl permissions and sitemap discovery.',
      fix: 'Create /robots.txt with a clear global policy and sitemap reference.',
      developerTasks: [
        'Create a robots.txt file at the website root.',
        'Add a User-agent: * section with clear Allow or Disallow rules.',
        'Add a Sitemap directive if a sitemap exists.',
        'Deploy and verify the file at /robots.txt.',
      ],
      copyableFix: `User-agent: *\nAllow: /\n\nSitemap: ${getOrigin(context.normalizedUrl)}/sitemap.xml`,
    },
    sitemap_xml: {
      title: 'Publish a sitemap.xml file',
      category: check.category,
      difficulty: 'medium',
      goal: 'Help search engines and AI systems discover important pages.',
      issue: 'No sitemap was found at common paths or in robots.txt.',
      whyItMatters: 'A sitemap gives crawlers a compact map of canonical pages, products, posts, and key resources.',
      fix: 'Generate a sitemap and publish it at /sitemap.xml, then reference it in robots.txt.',
      developerTasks: [
        'Generate a sitemap from the CMS, framework, or ecommerce platform.',
        'Publish it at /sitemap.xml.',
        'Add a Sitemap line to robots.txt.',
        'Verify the sitemap returns XML with HTTP 200.',
      ],
      copyableFix: `Sitemap: ${getOrigin(context.normalizedUrl)}/sitemap.xml`,
    },
    llms_txt_installed: {
      title: 'Install llms.txt on the website',
      category: check.category,
      difficulty: 'easy',
      goal: 'Give AI systems a concise, readable summary of the business and key links.',
      issue: 'The website does not currently serve /llms.txt.',
      whyItMatters: 'AEO already generates llms.txt content. Installing it closes the loop so AI crawlers can discover the profile directly on the website.',
      fix: 'Publish the generated llms.txt content at the website root and link to it from the page head.',
      developerTasks: [
        'Copy the generated llms.txt from the AEO result.',
        'Publish it at /llms.txt on the scanned domain.',
        'Add the generated <link rel="llms-txt"> tag to the site head.',
        'Re-scan after deployment.',
      ],
      copyableFix: generatedAssetSnippet(context.generatedAssets.llmsTxt, 'llms.txt content generated by AEO'),
    },
    content_signal: {
      title: 'Add an emerging AI content policy signal',
      category: check.category,
      difficulty: 'easy',
      goal: 'Declare AI content usage preferences in a machine-readable way.',
      issue: 'No Content-Signal directive was found in robots.txt.',
      whyItMatters: 'Content-Signal is an emerging signal. It is not a universal web standard, but it gives site owners a clear place to express AI training, search, and AI input preferences.',
      fix: 'Add a Content-Signal line to robots.txt using a business-friendly default.',
      developerTasks: [
        'Open robots.txt.',
        'Add the Content-Signal line below the crawler rules.',
        'Adjust ai-train, search, and ai-input values if the business policy differs.',
        'Deploy and verify /robots.txt.',
      ],
      copyableFix: '# Emerging AI Content Usage Preference\nContent-Signal: ai-train=no, search=yes, ai-input=no',
    },
    ai_bot_policy: {
      title: 'Declare a basic AI bot policy',
      category: check.category,
      difficulty: 'easy',
      goal: 'Make access preferences clear for major AI crawlers.',
      issue: 'No AI-specific bot policy was found in robots.txt.',
      whyItMatters: 'A clear AI bot policy helps the business choose whether AI discovery, search, and training crawlers should be allowed or blocked.',
      fix: 'Add explicit rules for major AI crawlers, choosing an open, selective, or strict policy.',
      developerTasks: [
        'Choose an AI crawler policy with the site owner.',
        'Add explicit User-agent blocks for major AI crawlers.',
        'Keep the policy consistent with Content-Signal preferences.',
        'Deploy and re-scan.',
      ],
      copyableFix: [
        'User-agent: GPTBot',
        'Allow: /',
        '',
        'User-agent: ChatGPT-User',
        'Allow: /',
        '',
        'User-agent: ClaudeBot',
        'Allow: /',
        '',
        'User-agent: PerplexityBot',
        'Allow: /',
      ].join('\n'),
    },
    media_visual_context: {
      title: 'Improve media and visual context',
      category: check.category,
      difficulty: 'medium',
      goal: 'Make images and videos understandable without computer vision.',
      issue: check.evidence || 'Some visual assets lack machine-readable context.',
      whyItMatters: 'AI systems often inspect HTML metadata, alt text, filenames, captions, and nearby text before or instead of visual analysis.',
      fix: 'Add descriptive alt text, meaningful image filenames, OG image metadata, and captions or transcripts for videos.',
      developerTasks: [
        'Add useful alt attributes to content images.',
        'Rename generic image files to descriptive filenames where practical.',
        'Add or verify og:image on important pages.',
        'Add nearby captions, summaries, or transcript links for video embeds.',
      ],
      copyableFix: [
        '<meta property="og:image" content="https://example.com/descriptive-product-or-brand-image.jpg">',
        '<img src="/images/descriptive-service-photo.jpg" alt="Short description of the product, service, or scene">',
        '<figcaption>Explain what the visual shows and why it matters.</figcaption>',
      ].join('\n'),
    },
    meta_description: {
      title: 'Add a clear meta description',
      category: check.category,
      difficulty: 'easy',
      goal: 'Summarize the page for search engines and AI systems.',
      issue: 'No strong meta description was detected.',
      whyItMatters: 'A good meta description helps crawlers understand the page purpose quickly.',
      fix: 'Add a concise page-specific meta description.',
      developerTasks: [
        'Write a 120-160 character description for the page.',
        'Add it to the document head.',
        'Verify it appears in the rendered HTML.',
      ],
      copyableFix: '<meta name="description" content="Describe who this page is for, what it offers, and why it matters.">',
    },
    og_tags: {
      title: 'Complete Open Graph tags',
      category: check.category,
      difficulty: 'easy',
      goal: 'Provide share and preview metadata for agents and social platforms.',
      issue: 'Open Graph title, description, or image tags are incomplete.',
      whyItMatters: 'OG tags provide compact page context and visual preview data.',
      fix: 'Add og:title, og:description, and og:image tags.',
      developerTasks: [
        'Add page-specific Open Graph title.',
        'Add page-specific Open Graph description.',
        'Add a representative OG image.',
      ],
      copyableFix: [
        '<meta property="og:title" content="Page title">',
        '<meta property="og:description" content="Short page summary">',
        '<meta property="og:image" content="https://example.com/og-image.jpg">',
      ].join('\n'),
    },
    json_ld: {
      title: 'Add structured business data',
      category: check.category,
      difficulty: 'medium',
      goal: 'Help AI systems identify the business entity and offering.',
      issue: 'No business-relevant JSON-LD schema was detected.',
      whyItMatters: 'Structured data makes business type, services, products, and identity easier to parse reliably.',
      fix: 'Add Organization, LocalBusiness, Product, Service, or WebSite JSON-LD as appropriate.',
      developerTasks: [
        'Choose the schema type that matches the site.',
        'Add JSON-LD to the page head or body.',
        'Validate with a structured data testing tool.',
      ],
      copyableFix: '{"@context":"https://schema.org","@type":"Organization","name":"Business Name","url":"https://example.com"}',
    },
    faq_json_ld: {
      title: 'Add FAQ JSON-LD',
      category: check.category,
      difficulty: 'easy',
      goal: 'Expose common questions and answers in structured form.',
      issue: 'No FAQPage JSON-LD was detected.',
      whyItMatters: 'FAQ structured data gives AI systems precise answers to common buying or support questions.',
      fix: 'Install the FAQ JSON-LD generated by AEO.',
      developerTasks: [
        'Copy the generated FAQ JSON-LD from AEO.',
        'Paste it into the page head or body.',
        'Deploy and validate JSON-LD.',
      ],
      copyableFix: generatedAssetSnippet(context.generatedAssets.faqJsonLd, 'FAQ JSON-LD generated by AEO'),
    },
  };

  const template = recommendations[check.id];
  if (!template) return null;

  return {
    id: check.id,
    checkId: check.id,
    title: template.title,
    category: template.category,
    status: check.status,
    priority: check.priority,
    difficulty: template.difficulty,
    goal: template.goal,
    issue: template.issue,
    whyItMatters: template.whyItMatters,
    fix: template.fix,
    developerTasks: template.developerTasks,
    copyableFix: template.copyableFix,
  };
}

function generatedAssetSnippet(value, fallback) {
  return typeof value === 'string' && value.trim() ? value : `# ${fallback}`;
}

function buildRecommendations(checks, context) {
  return checks
    .filter((check) => !check.informational && ['fail', 'warning'].includes(check.status))
    .map((check) => recommendationForCheck(check, context))
    .filter(Boolean);
}

function buildCopyAllInstructionsMarkdown({ normalizedUrl, score, level, recommendations }) {
  const sections = recommendations.map((rec, index) => {
    return [
      `## ${index + 1}. ${rec.title}`,
      '',
      `Category: ${rec.category}`,
      `Status: ${rec.status}`,
      `Priority: ${rec.priority}`,
      `Difficulty: ${rec.difficulty}`,
      '',
      `Goal: ${rec.goal}`,
      '',
      `Issue: ${rec.issue}`,
      '',
      `Why it matters: ${rec.whyItMatters}`,
      '',
      `Fix: ${rec.fix}`,
      '',
      'Developer tasks:',
      ...rec.developerTasks.map((task, taskIndex) => `${taskIndex + 1}. ${task}`),
      '',
      rec.copyableFix ? ['Copyable fix:', '```', rec.copyableFix, '```'].join('\n') : '',
    ].filter(Boolean).join('\n');
  });

  return [
    '# AEO Agent Readiness Fix Instructions',
    '',
    `Website: ${normalizedUrl}`,
    `Agent Readiness Score: ${score}/100`,
    `Level: ${level}`,
    `Generated: ${new Date().toISOString()}`,
    '',
    sections.length > 0 ? sections.join('\n\n---\n\n') : 'No priority fix instructions generated.',
  ].join('\n');
}

function buildPacket({ normalizedUrl, canonicalUrl, slug, scoreData, extracted, generatedAssets, agentReadiness }) {
  const url = new URL(normalizedUrl);
  const byCategory = Object.entries(agentReadiness.categories).reduce((acc, [key, category]) => {
    acc[key] = {
      score: category.score,
      passed: category.checks.filter((check) => check.status === 'pass').map((check) => check.id),
      missing: category.checks.filter((check) => check.status === 'fail').map((check) => check.id),
      warnings: category.checks.filter((check) => check.status === 'warning').map((check) => check.id),
    };
    return acc;
  }, {});

  return {
    packet_name: 'aeo_site_readiness_packet',
    packet_version: 'v1',
    source: 'aeo_scanner',
    created_at: agentReadiness.scannedAt,
    website: {
      url: canonicalUrl || normalizedUrl,
      normalized_url: normalizedUrl,
      domain: url.hostname,
      slug,
      business_name: extracted.business_name || null,
      title: extracted.business_name || null,
      description: extracted.tagline || null,
      language: extracted.lang || null,
    },
    scores: {
      aeo_score: scoreData.score,
      agent_readiness_score: agentReadiness.score,
      level: agentReadiness.level,
    },
    checks: byCategory,
    generated_assets: {
      llms_txt: generatedAssets.llmsTxt || '',
      faq_json_ld: generatedAssets.faqJsonLd || '',
      llms_txt_link_tag: generatedAssets.llmsTxtLinkTag || '',
      semantic_address_html: generatedAssets.addressHtml || '',
      robots_txt_ai_policy: 'User-agent: GPTBot\nAllow: /\n\nUser-agent: ClaudeBot\nAllow: /',
      content_signals: 'Content-Signal: ai-train=no, search=yes, ai-input=no',
    },
    recommendations: agentReadiness.recommendations.map((rec) => ({
      id: rec.id,
      priority: rec.priority,
      difficulty: rec.difficulty,
      goal: rec.goal,
      issue: rec.issue,
      fix: rec.fix,
      developer_instruction: rec.developerTasks.join(' '),
    })),
    geo_writer_context: {
      content_angles: [
        'AI-readable website structure',
        'Agent-ready brand presence',
        'Search and AI crawler discoverability',
      ],
      suggested_articles: [
        {
          title: 'Is Your Website Ready for AI Search?',
          angle: 'Educational article explaining practical website readiness for AI systems.',
          target_keyword: 'AI ready website',
        },
      ],
      priority_topics: agentReadiness.recommendations.slice(0, 5).map((rec) => rec.title),
    },
  };
}

function buildSummary(score, checks) {
  const failing = checks.filter((check) => !check.informational && check.status === 'fail').length;
  const warnings = checks.filter((check) => !check.informational && check.status === 'warning').length;
  if (score >= 75) return `The site has a strong practical Agent Readiness foundation with ${failing} missing checks and ${warnings} warnings.`;
  if (score >= 50) return `The site is AI-readable but still has ${failing} missing practical readiness checks.`;
  return `The site has a basic web presence, but ${failing} Agent Readiness checks need attention.`;
}

async function runAgentReadinessChecks({
  normalizedUrl,
  canonicalUrl,
  slug,
  scoreData,
  scraped,
  extracted,
  generatedAssets,
}) {
  const origin = getOrigin(normalizedUrl);
  const [robotsResult, llmsResult, markdownResult] = await Promise.all([
    safeFetchText(`${origin}/robots.txt`),
    safeFetchText(`${origin}/llms.txt`),
    safeFetchText(origin, { headers: { Accept: 'text/markdown' } }),
  ]);

  const parsedRobots = robotsResult.ok ? parseRobotsTxt(robotsResult.body) : null;
  const sitemapCheck = await checkSitemapXml(origin, parsedRobots);

  const checks = [
    checkRobotsTxt(robotsResult),
    sitemapCheck,
    checkLlmsTxtInstalled(llmsResult),
    existingCheck(
      'meta_description',
      'Meta description',
      'ai_content_readability',
      Boolean(scoreData.hasMetaDesc),
      'medium',
      'Strong meta description detected.',
      'No strong meta description detected.'
    ),
    existingCheck(
      'og_tags',
      'Open Graph tags',
      'ai_content_readability',
      Boolean(scoreData.hasOgTags),
      'medium',
      'Open Graph title, description, and image detected.',
      'Open Graph tags are incomplete.'
    ),
    existingCheck(
      'json_ld',
      'Business JSON-LD',
      'structured_trust',
      Boolean(scoreData.hasJsonLd),
      'high',
      'Business-relevant JSON-LD detected.',
      'No business-relevant JSON-LD detected.'
    ),
    existingCheck(
      'faq_json_ld',
      'FAQ JSON-LD',
      'structured_trust',
      Boolean(scoreData.hasFaqSchema),
      'medium',
      'FAQPage JSON-LD detected.',
      'No FAQPage JSON-LD detected.'
    ),
    checkContentSignal(robotsResult),
    checkAiBotPolicy(robotsResult),
    checkMediaVisualContext(scraped.html, scraped.meta),
    checkFixInstallReadiness(generatedAssets),
    checkMarkdownNegotiation(markdownResult),
  ];

  const score = Math.max(0, Math.min(100, checks
    .filter((check) => !check.informational)
    .reduce((sum, check) => sum + check.scoreAwarded, 0)));
  const level = scoreToLevel(score);
  const categories = buildCategories(checks);
  const context = { normalizedUrl, generatedAssets };
  const recommendations = buildRecommendations(checks, context);
  const copyAllInstructionsMarkdown = buildCopyAllInstructionsMarkdown({
    normalizedUrl,
    score,
    level,
    recommendations,
  });

  const agentReadiness = {
    schemaVersion: 'v1',
    scannedAt: new Date().toISOString(),
    score,
    agentReadinessScore: score,
    level,
    summary: buildSummary(score, checks),
    categories,
    checks,
    agentReadinessChecks: checks,
    recommendations,
    agentReadinessRecommendations: recommendations,
    copyAllInstructionsMarkdown,
    informationalChecks: checks.filter((check) => check.informational),
    warnings: checks.filter((check) => check.status === 'warning').map((check) => ({
      id: check.id,
      evidence: check.evidence,
    })),
  };

  agentReadiness.aeo_site_readiness_packet = buildPacket({
    normalizedUrl,
    canonicalUrl,
    slug,
    scoreData,
    extracted,
    generatedAssets,
    agentReadiness,
  });

  return agentReadiness;
}

module.exports = {
  runAgentReadinessChecks,
  parseRobotsTxt,
  classifyAiBotPolicy,
  checkMediaVisualContext,
};
