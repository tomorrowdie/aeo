'use strict';

const { normalizeBullets, normalizeText } = require('../lib/listingTextMetrics');
const { normalizeMarketplace, extractAsin } = require('../lib/marketplaceRouteDetector');
const { resolveCanonicalSource } = require('../lib/canonicalRelevance');
const { sourceFromManualInput } = require('../lib/amazonUrlParser');
const { getIntentProfile } = require('../lib/rufusIntentProfiles');
const { runAmazonRelevanceRules } = require('../lib/amazonRelevanceRules');

function normalizeRichText(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return normalizeText(JSON.stringify(value));
  }
  return normalizeText(value);
}

function normalizeManualListing(manualListing = {}) {
  const title = manualListing.amazonProductTitle ?? manualListing.title;
  const bullets = manualListing.bulletPoints ?? manualListing.bullets;
  const description = manualListing.productDescription ?? manualListing.description;
  const aPlusContent = manualListing.aPlusContentText ?? manualListing.aPlusContent;
  const productDetailsSpecs = manualListing.productDetailsSpecs ?? manualListing.productSpecs ?? manualListing.specs;
  const faqInformation = manualListing.faqInformation ?? manualListing.faq ?? manualListing.optionalRufusQuestions;
  const reviewInformation = manualListing.reviewInformation ?? manualListing.reviewSummary ?? manualListing.optionalReviewSummary;

  return {
    title: normalizeText(title),
    bullets: normalizeBullets(bullets),
    description: normalizeText(description),
    aPlusContent: normalizeText(aPlusContent),
    backendSearchTerms: normalizeRichText(manualListing.backendSearchTerms),
    productDetailsSpecs: normalizeRichText(productDetailsSpecs),
    aPlusContentType: normalizeText(manualListing.aPlusContentType),
    productType: normalizeText(manualListing.productType),
    category: normalizeText(manualListing.category),
    targetCustomer: normalizeText(manualListing.targetCustomer),
    imageAltTexts: normalizeBullets(manualListing.imageAltTexts),
    imageFileNames: normalizeBullets(manualListing.imageFileNames),
    faqInformation: normalizeRichText(faqInformation),
    reviewInformation: normalizeRichText(reviewInformation),
    productNicheKnowledge: normalizeRichText(manualListing.productNicheKnowledge),
    optionalRufusQuestions: normalizeBullets(faqInformation),
    optionalReviewSummary: reviewInformation || null,
  };
}

function emptyListing() {
  return normalizeManualListing({});
}

function isManualMode(input = {}) {
  return Boolean(input.manualListing && input.sourceType === 'amazon_listing');
}

function buildSummary(result, manualInputRequired) {
  if (manualInputRequired) {
    return 'Amazon canonical analysis is available, but pasted listing fields are needed for a full AI relevance score.';
  }
  return `The listing scored ${result.scores.amazonAiRelevanceScore}/100 for Amazon AI relevance using programmatic canonical, intent, attribute, question-answerability, A+, media, and semantic integrity checks.`;
}

async function analyzeAmazonAiRelevance(input = {}) {
  const mode = input.mode || 'analyze_only';
  const manual = isManualMode(input);
  const listing = manual ? normalizeManualListing(input.manualListing) : emptyListing();
  const source = manual
    ? sourceFromManualInput(input, listing)
    : await resolveCanonicalSource({
      url: input.url,
      marketplace: normalizeMarketplace(input.marketplace),
      asin: extractAsin(input.url) || input.asin,
    });

  if (!manual && !listing.title) {
    const partialScores = {
      amazonAiRelevanceScore: source.canonicalPhraseEnglish ? 10 : 0,
      canonicalAlignmentScore: source.canonicalPhraseEnglish ? 8 : 0,
      productIdentityScore: 0,
      attributeCompletenessScore: 0,
      buyerIntentCoverageScore: 0,
      questionAnswerabilityScore: 0,
      aPlusKnowledgeBaseScore: 0,
      mediaRelevanceScore: 0,
      semanticIntegrityScore: source.canonicalPhraseEnglish ? 2 : 0,
    };
    return {
      schemaVersion: 'v1',
      scanType: 'amazon_ai_relevance',
      mode,
      scrapeStatus: source.fetchStatus?.ok ? 'partial' : 'failed',
      manualInputRequired: true,
      missingFields: [
        'amazonProductTitle',
        'bulletPoints',
        'productDescription',
        'aPlusContentText',
        'productDetailsSpecs',
        'faqInformation',
        'reviewInformation',
      ],
      source,
      scores: partialScores,
      level: 'Needs Relevance Improvement',
      summary: buildSummary({ scores: partialScores }, true),
      categories: {},
      checks: [],
      canonicalRelevance: {
        canonicalPhrase: source.canonicalPhraseEnglish,
        canonicalSource: source.canonicalSource,
        fetchStatus: source.fetchStatus || null,
      },
      buyerIntentCoverage: {},
      sectionAnalysis: {},
      attributeCoverage: {},
      questionAnswerability: {},
      semanticIntegrity: {},
      mediaRelevance: {},
      recommendations: [{
        id: 'manual_listing_required',
        title: 'Paste listing fields for full Amazon AI relevance analysis',
        category: 'manual_input',
        priority: 'high',
        difficulty: 'easy',
        goal: 'Run the full analyzer without depending on Amazon page extraction.',
        issue: 'Amazon URL mode could not read listing sections with lightweight fetch only.',
        whyItMatters: 'Manual listing input is the primary reliable workflow because Amazon may block automated extraction.',
        fix: 'Submit Amazon product title, bullet points, product description, backend search terms, A+ text, product specs, FAQ/Q&A, review information, and A+ content type.',
        developerTasks: ['Collect Auto Pilot Rufus Strategy Source 3 fields and resubmit with sourceType: amazon_listing and manualListing.'],
        copyableFix: 'Provide amazonProductTitle, bulletPoints, productDescription, backendSearchTerms, aPlusContentText, productDetailsSpecs, aPlusContentType, faqInformation, reviewInformation, and optional productNicheKnowledge.',
      }],
      copyAllInstructionsMarkdown: '# Amazon AI Relevance Fix Instructions\n\nPaste listing fields to generate the full programmatic analysis.',
      optionalRewritePacket: null,
      usageCost: {
        mode,
        llmUsed: false,
        apiCallCount: 0,
        inputTokens: 0,
        outputTokens: 0,
        estimatedCostUsd: 0,
        status: 'programmatic',
      },
    };
  }

  const profile = getIntentProfile({
    category: listing.category,
    productType: listing.productType,
    title: listing.title,
    canonicalPhrase: source.canonicalPhraseEnglish,
  });
  const scored = runAmazonRelevanceRules({ source, listing, profile });

  return {
    schemaVersion: 'v1',
    scanType: 'amazon_ai_relevance',
    mode,
    scrapeStatus: manual ? 'manual' : 'partial',
    manualInputRequired: false,
    missingFields: [],
    source,
    profile: {
      id: profile.id,
      label: profile.label,
    },
    scores: scored.scores,
    level: scored.level,
    summary: buildSummary(scored, false),
    categories: scored.categories,
    checks: scored.checks,
    canonicalRelevance: scored.canonicalRelevance,
    buyerIntentCoverage: scored.buyerIntentCoverage,
    sectionAnalysis: scored.sectionAnalysis,
    attributeCoverage: scored.attributeCoverage,
    questionAnswerability: scored.questionAnswerability,
    semanticIntegrity: scored.semanticIntegrity,
    mediaRelevance: scored.mediaRelevance,
    recommendations: scored.recommendations,
    copyAllInstructionsMarkdown: scored.copyAllInstructionsMarkdown,
    optionalRewritePacket: null,
    usageCost: {
      mode,
      llmUsed: false,
      apiCallCount: 0,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUsd: 0,
      status: 'programmatic',
    },
  };
}

module.exports = {
  analyzeAmazonAiRelevance,
  normalizeManualListing,
};
