'use strict';

const {
  countPhraseMatches,
  countStuffedBigrams,
  findFillerWords,
  hasNounBenefitContext,
  hasNumbersOrSpecs,
  normalizeText,
  sectionText,
  tokenize,
} = require('./listingTextMetrics');
const { STANDARD_QA_TEMPLATES } = require('./rufusIntentProfiles');

const RUFUS_CHAT_TRUNCATION = 70;
const MOBILE_BULLET = 80;

const CATEGORY_WEIGHTS = {
  canonical_relevance_alignment: 15,
  product_identity_clarity: 15,
  attribute_taxonomy_completeness: 15,
  buyer_intent_coverage: 20,
  question_answerability: 10,
  a_plus_knowledge_base: 10,
  media_relevance: 10,
  semantic_integrity: 5,
};

const LEGACY_SEO_PHRASES = [
  'best seller',
  'best-seller',
  '#1 best',
  'buy now',
  'click here',
  'limited time',
  'act now',
  'order today',
  'last chance',
  'keyword',
];

function makeCheck(id, label, status, points, maxPoints, evidence, details = {}) {
  return { id, label, status, points, maxPoints, evidence, details };
}

function statusFor(points, maxPoints) {
  if (points >= maxPoints) return 'pass';
  if (points > 0) return 'warning';
  return 'fail';
}

function scale(raw, maxPoints) {
  return Math.max(0, Math.min(maxPoints, Math.round(raw)));
}

function scoreFromChecks(id, label, weight, checks) {
  const possible = checks.reduce((sum, check) => sum + check.maxPoints, 0) || 1;
  const raw = checks.reduce((sum, check) => sum + check.points, 0);
  const score = scale((raw / possible) * weight, weight);
  return {
    id,
    label,
    score,
    maxScore: weight,
    passed: checks.filter((check) => check.status === 'pass').length,
    total: checks.length,
    checks,
  };
}

function analyzeCanonicalRelevance(source, listing) {
  const phrase = source.canonicalPhraseEnglish || source.canonicalPhraseNormalized || '';
  const title = listing.title || '';
  const bulletText = (listing.bullets || []).join(' ');
  const bodyText = [
    listing.description,
    listing.aPlusContent,
    listing.productDetailsSpecs,
    listing.faqInformation,
  ].filter(Boolean).join(' ');
  const titleMatch = countPhraseMatches(phrase, [title]);
  const bulletMatch = countPhraseMatches(phrase, [bulletText]);
  const bodyMatch = countPhraseMatches(phrase, [bodyText]);
  const hasCanonical = Boolean(phrase);

  const checks = [
    makeCheck('canonical_source', 'Canonical source is available', hasCanonical ? 'pass' : 'fail', hasCanonical ? 2 : 0, 2, hasCanonical ? `Canonical phrase: ${phrase}` : 'No canonical phrase available.'),
    makeCheck('asin_extracted', 'ASIN extracted when URL is present', source.asin ? 'pass' : 'warning', source.asin ? 1 : 0, 1, source.asin ? `ASIN ${source.asin}` : 'No ASIN available.'),
    makeCheck('title_alignment', 'Title supports canonical phrase', statusFor(titleMatch.ratio >= 0.6 ? 3 : titleMatch.ratio > 0 ? 1 : 0, 3), titleMatch.ratio >= 0.6 ? 3 : titleMatch.ratio > 0 ? 1 : 0, 3, titleMatch.missingTokens?.length ? `Missing from title: ${titleMatch.missingTokens.join(', ')}` : 'Title covers canonical phrase tokens.', titleMatch),
    makeCheck('bullet_alignment', 'Bullets support canonical phrase', statusFor(bulletMatch.ratio >= 0.5 ? 3 : bulletMatch.ratio > 0 ? 1 : 0, 3), bulletMatch.ratio >= 0.5 ? 3 : bulletMatch.ratio > 0 ? 1 : 0, 3, bulletMatch.missingTokens?.length ? `Missing from bullets: ${bulletMatch.missingTokens.join(', ')}` : 'Bullets reinforce canonical phrase.', bulletMatch),
    makeCheck('body_alignment', 'Description or A+ supports canonical phrase', statusFor(bodyMatch.ratio >= 0.4 ? 2 : bodyMatch.ratio > 0 ? 1 : 0, 2), bodyMatch.ratio >= 0.4 ? 2 : bodyMatch.ratio > 0 ? 1 : 0, 2, bodyMatch.missingTokens?.length ? 'Description or A+ only partially supports the canonical phrase.' : 'Body copy supports canonical phrase.', bodyMatch),
  ];

  return scoreFromChecks('canonical_relevance_alignment', 'Canonical Relevance Alignment', CATEGORY_WEIGHTS.canonical_relevance_alignment, checks);
}

function analyzeProductIdentity(listing, profile) {
  const title = listing.title || '';
  const first70 = title.slice(0, RUFUS_CHAT_TRUNCATION).toLowerCase();
  const allText = sectionText(listing).toLowerCase();
  const nounFound = profile.productNouns.some((noun) => allText.includes(noun));
  const earlyNoun = profile.productNouns.some((noun) => first70.includes(noun));
  const nbc = hasNounBenefitContext(title, profile);
  const checks = [
    makeCheck('title_present', 'Title is present', title ? 'pass' : 'fail', title ? 2 : 0, 2, title ? 'Title provided.' : 'Missing title.'),
    makeCheck('product_noun', 'Core product noun is clear', nounFound ? 'pass' : 'fail', nounFound ? 3 : 0, 3, nounFound ? `Matched profile ${profile.label}.` : 'No clear product noun matched the selected profile.'),
    makeCheck('mobile_title_identity', 'First 70 title characters communicate identity', earlyNoun ? 'pass' : 'warning', earlyNoun ? 2 : 0, 2, earlyNoun ? 'Product noun appears before likely Rufus/chat truncation.' : `No profile product noun in first ${RUFUS_CHAT_TRUNCATION} title chars.`, { first70 }),
    makeCheck('category_present', 'Product type or category is present', listing.productType || listing.category ? 'pass' : 'warning', listing.productType || listing.category ? 2 : 0, 2, 'Manual product type/category improves taxonomy clarity.'),
    makeCheck('noun_benefit_context_title', 'Title has noun-benefit-context signals', nbc.hasNoun && (nbc.hasBenefit || nbc.hasContext) ? 'pass' : 'warning', nbc.hasNoun && (nbc.hasBenefit || nbc.hasContext) ? 2 : 1, 2, 'Uses Skill 02 noun + benefit + context heuristic.', nbc),
    makeCheck('bullet_identity', 'First bullet confirms identity', listing.bullets?.[0] ? 'pass' : 'fail', listing.bullets?.[0] ? 2 : 0, 2, listing.bullets?.[0] || 'Missing first bullet.'),
  ];
  return scoreFromChecks('product_identity_clarity', 'Product Identity Clarity', CATEGORY_WEIGHTS.product_identity_clarity, checks);
}

function analyzeAttributeCoverage(listing, profile) {
  const text = sectionText(listing).toLowerCase();
  const checks = profile.requiredAttributes.map((attr) => {
    const terms = attr.split(/[ /-]+/).filter(Boolean);
    const found = terms.some((term) => text.includes(term));
    return makeCheck(`attribute_${attr.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`, attr, found ? 'pass' : 'fail', found ? 1 : 0, 1, found ? `${attr} signal found.` : `${attr} signal missing.`);
  });
  const specsText = listing.productDetailsSpecs || '';
  checks.push(makeCheck(
    'product_details_specs',
    'Product Details / Specs provided',
    specsText ? 'pass' : 'warning',
    specsText ? 2 : 0,
    2,
    specsText ? 'Specs are available as structured evidence.' : 'Product Details / Specs are missing or not pasted.'
  ));
  return scoreFromChecks('attribute_taxonomy_completeness', 'Attribute / Taxonomy Completeness', CATEGORY_WEIGHTS.attribute_taxonomy_completeness, checks);
}

function analyzeBuyerIntent(listing, profile) {
  const text = sectionText(listing).toLowerCase();
  const bulletNbc = (listing.bullets || []).map((bullet) => hasNounBenefitContext(bullet, profile));
  const usefulMobileBullets = (listing.bullets || []).filter((bullet) => {
    const first = bullet.slice(0, MOBILE_BULLET).toLowerCase();
    return profile.buyerIntentSignals.some((signal) => first.includes(signal)) ||
      profile.benefitSignals.some((signal) => first.includes(signal));
  }).length;
  const matchedIntentSignals = profile.buyerIntentSignals.filter((signal) => text.includes(signal));
  const hasTargetCustomer = Boolean(listing.targetCustomer) || /\b(for|designed for|ideal for|made for)\b/i.test(text);
  const hasComparison = /\b(compare|comparison|versus|vs\.?|better than|upgrade|alternative)\b/i.test(text);
  const hasReviewInput = Boolean(listing.reviewInformation);
  const hasObjection = /\b(warranty|return|durable|safe|compatible|fits|support|easy to clean|noise|size)\b/i.test(text) || hasReviewInput;
  const hasNicheKnowledge = Boolean(listing.productNicheKnowledge);

  const checks = [
    makeCheck('target_customer', 'Target customer or audience is clear', hasTargetCustomer ? 'pass' : 'warning', hasTargetCustomer ? 3 : 1, 3, hasTargetCustomer ? 'Audience signal found.' : 'Target customer is weak or implicit.'),
    makeCheck('intent_signal_coverage', 'Buyer intent signals are covered', statusFor(Math.min(5, matchedIntentSignals.length), 5), Math.min(5, matchedIntentSignals.length), 5, matchedIntentSignals.length ? `Matched: ${matchedIntentSignals.join(', ')}` : 'No profile buyer intent signals found.', { matchedIntentSignals }),
    makeCheck('feature_benefit_mapping', 'Features are mapped to benefits and context', statusFor(bulletNbc.filter((item) => item.hasNoun && item.hasBenefit).length, 4), Math.min(4, bulletNbc.filter((item) => item.hasNoun && item.hasBenefit).length), 4, 'Uses Skill 02 noun + benefit + context bullet heuristic.', { bulletNbc }),
    makeCheck('mobile_bullet_intent', 'Bullet first 80 chars carry useful intent signals', statusFor(usefulMobileBullets, 3), Math.min(3, usefulMobileBullets), 3, `${usefulMobileBullets} bullet(s) have early intent/benefit signals.`, { mobileCutoff: MOBILE_BULLET }),
    makeCheck('comparison_angle', 'Comparison or selection angle is present', hasComparison ? 'pass' : 'warning', hasComparison ? 2 : 0, 2, hasComparison ? 'Comparison/upgrade angle found.' : 'No comparison or selection angle found.'),
    makeCheck('purchase_objections', 'Purchase objections are handled', hasObjection ? 'pass' : 'warning', hasObjection ? 3 : 1, 3, hasReviewInput ? 'Review information is available for adversarial buyer objection simulation.' : hasObjection ? 'Objection-handling signal found.' : 'Compatibility, durability, warranty, or safety signals are thin.'),
    makeCheck('niche_knowledge_scaffold', 'Product niche knowledge is available', hasNicheKnowledge ? 'pass' : 'warning', hasNicheKnowledge ? 1 : 0, 1, hasNicheKnowledge ? 'Niche knowledge can scaffold future universal category knowledge.' : 'No niche knowledge provided; generic profile fallback is used.'),
  ];
  return scoreFromChecks('buyer_intent_coverage', 'Buyer Intent Coverage', CATEGORY_WEIGHTS.buyer_intent_coverage, checks);
}

function analyzeQuestionAnswerability(listing, profile) {
  const text = sectionText(listing).toLowerCase();
  const customQuestions = (listing.optionalRufusQuestions || []).map((question, index) => ({
    id: `custom_${index + 1}`,
    question,
    signals: tokenize(question).slice(0, 5),
  }));
  const templates = [...STANDARD_QA_TEMPLATES, ...customQuestions];
  const checks = templates.map((template) => {
    let found = false;
    if (template.id === 'what_is_it') found = profile.productNouns.some((noun) => text.includes(noun));
    else if (template.id === 'who_is_it_for') found = Boolean(listing.targetCustomer) || /\b(for|parent|gamer|creator|student|professional|baby|family)\b/i.test(text);
    else if (template.id === 'why_buy_it') found = profile.benefitSignals.some((signal) => text.includes(signal));
    else if (template.id === 'what_problem') found = /\b(solve|reduce|avoid|protect|improve|support|comfort|relief|faster)\b/i.test(text);
    else if (template.id === 'how_to_use') found = /\b(use|install|plug|clean|apply|place|connect|setup|wash)\b/i.test(text);
    else if (template.id === 'whats_included') found = /\b(included|box|package|comes with|set includes)\b/i.test(text);
    else if (template.id === 'safety_compatibility') found = /\b(safe|material|compatible|fits|bpa|warranty|certified)\b/i.test(text);
    else found = (template.signals || []).some((signal) => text.includes(String(signal).toLowerCase()));
    return makeCheck(template.id, template.question, found ? 'pass' : 'fail', found ? 1 : 0, 1, found ? 'Answerable from listing text.' : 'Not clearly answerable from listing text.');
  });
  checks.push(makeCheck(
    'faq_information_provided',
    'FAQ / Q&A information is provided',
    listing.faqInformation ? 'pass' : 'warning',
    listing.faqInformation ? 2 : 0,
    2,
    listing.faqInformation ? 'FAQ/Q&A input is available for adversarial simulation.' : 'FAQ/Q&A input is missing; only standard templates are checked.'
  ));
  return scoreFromChecks('question_answerability', 'Question Answerability', CATEGORY_WEIGHTS.question_answerability, checks);
}

function analyzeAPlus(listing, profile) {
  const aplus = listing.aPlusContent || '';
  const lower = aplus.toLowerCase();
  const aPlusType = (listing.aPlusContentType || '').toLowerCase();
  const imagesOnly = aPlusType === 'images_only_text_embedded_seo_invisible' ||
    /\b(images?\s+only|text embedded|seo invisible|ai invisible)\b/i.test(aPlusType);
  const textModules = aPlusType === 'standard_text_modules_seo_friendly' ||
    /\b(standard|text modules?|seo friendly|readable text)\b/i.test(aPlusType);
  const hasAplus = normalizeText(aplus).length > 0;
  const hasSpecifics = hasNumbersOrSpecs(aplus) || profile.requiredAttributes.some((attr) => lower.includes(attr));
  const hasIntent = profile.buyerIntentSignals.some((signal) => lower.includes(signal));
  const hasTrust = /\b(warranty|brand|tested|certified|safe|material|support|guarantee)\b/i.test(aplus);
  const hasMobileStructure = normalizeText(aplus).split(/\s+/).length >= 40;
  const checks = [
    makeCheck('aplus_present', 'A+ content is present', hasAplus ? 'pass' : 'fail', hasAplus ? 2 : 0, 2, hasAplus ? 'A+ content provided.' : 'A+ content missing.'),
    makeCheck('aplus_content_type_visibility', 'A+ content type is AI-readable', imagesOnly ? 'fail' : textModules ? 'pass' : 'warning', imagesOnly ? 0 : textModules ? 2 : 1, 2, imagesOnly ? 'Images Only / text embedded in images is SEO invisible and a weak AI signal.' : textModules ? 'Standard text modules are readable by SEO and AI systems.' : 'A+ content type was not specified.', { aPlusContentType: listing.aPlusContentType || null }),
    makeCheck('aplus_specifics', 'A+ adds specific facts or attributes', hasSpecifics ? 'pass' : 'warning', hasSpecifics ? 2 : 0, 2, hasSpecifics ? 'Specific facts detected.' : 'A+ content lacks concrete facts.'),
    makeCheck('aplus_intent', 'A+ reinforces buyer intent', hasIntent ? 'pass' : 'warning', hasIntent ? 2 : 0, 2, hasIntent ? 'Buyer intent signals detected.' : 'A+ does not strongly reinforce buyer intent.'),
    makeCheck('aplus_trust', 'A+ includes trust or brand context', hasTrust ? 'pass' : 'warning', hasTrust ? 2 : 0, 2, hasTrust ? 'Trust signal found.' : 'Trust/brand/material context is thin.'),
    makeCheck('aplus_mobile_depth', 'A+ has enough concise knowledge-base depth', hasMobileStructure ? 'pass' : 'warning', hasMobileStructure ? 2 : 0, 2, hasMobileStructure ? 'A+ content has useful depth.' : 'A+ content is too thin for knowledge-base style interpretation.'),
  ];
  return scoreFromChecks('a_plus_knowledge_base', 'A+ Knowledge Base Quality', CATEGORY_WEIGHTS.a_plus_knowledge_base, checks);
}

function isGenericFilename(name = '') {
  return /(^|\/)(img|image|photo|dsc|untitled|final)[-_]?\d*\.(jpg|jpeg|png|webp)$/i.test(name);
}

function analyzeMedia(listing, profile) {
  const imageAltTexts = listing.imageAltTexts || [];
  const imageFileNames = listing.imageFileNames || [];
  const mediaText = [...imageAltTexts, ...imageFileNames].join(' ').toLowerCase();
  const descriptiveFilenames = imageFileNames.filter((name) => name && !isGenericFilename(name) && tokenize(name).length >= 2).length;
  const usefulAlt = imageAltTexts.filter((alt) => normalizeText(alt).length >= 12).length;
  const identitySupport = profile.productNouns.some((noun) => mediaText.includes(noun));
  const infographicSupport = /\b(infographic|comparison|feature|diagram|how-to|benefit|spec|dimensions?)\b/i.test(mediaText);
  const checks = [
    makeCheck('media_provided', 'Image metadata is provided', imageAltTexts.length || imageFileNames.length ? 'pass' : 'warning', imageAltTexts.length || imageFileNames.length ? 2 : 0, 2, 'Optional image alt text or filenames help AI interpret visuals.'),
    makeCheck('descriptive_filenames', 'Image filenames are descriptive', statusFor(descriptiveFilenames, 3), Math.min(3, descriptiveFilenames), 3, `${descriptiveFilenames} descriptive filename(s).`),
    makeCheck('useful_alt_text', 'Image alt text is useful', statusFor(usefulAlt, 3), Math.min(3, usefulAlt), 3, `${usefulAlt} useful alt text item(s).`),
    makeCheck('media_identity', 'Media supports product identity', identitySupport ? 'pass' : 'warning', identitySupport ? 1 : 0, 1, identitySupport ? 'Product noun appears in media metadata.' : 'Media metadata does not clearly support product identity.'),
    makeCheck('infographic_relevance', 'Infographic or feature media is represented', infographicSupport ? 'pass' : 'warning', infographicSupport ? 1 : 0, 1, infographicSupport ? 'Feature/infographic signal found.' : 'No feature/infographic signal in provided media metadata.'),
  ];
  return scoreFromChecks('media_relevance', 'Media / Infographic Relevance', CATEGORY_WEIGHTS.media_relevance, checks);
}

function computeSemanticIntegrityScore({ stuffed, legacy, critical }) {
  return Math.max(0, 100 - (stuffed * 5) - (legacy * 8) - (critical * 15));
}

function analyzeSemanticIntegrity(source, listing) {
  const text = sectionText(listing);
  const lower = text.toLowerCase();
  const stuffed = countStuffedBigrams(text);
  const backendSearchTerms = listing.backendSearchTerms || '';
  const searchTermTokens = tokenize(backendSearchTerms);
  const repeatedSearchTerms = searchTermTokens.length - new Set(searchTermTokens).size;
  const legacy = LEGACY_SEO_PHRASES.filter((phrase) => lower.includes(phrase)).length;
  const filler = findFillerWords(text);
  const canonicalPhrase = source.canonicalPhraseEnglish || '';
  const canonicalMatch = canonicalPhrase ? countPhraseMatches(canonicalPhrase, [text]).ratio : 0;
  const critical = canonicalPhrase && canonicalMatch === 0 ? 1 : 0;
  const integrity100 = Math.max(0, computeSemanticIntegrityScore({ stuffed, legacy, critical }) - Math.min(20, repeatedSearchTerms * 2));
  const categoryPoints = scale((integrity100 / 100) * CATEGORY_WEIGHTS.semantic_integrity, CATEGORY_WEIGHTS.semantic_integrity);
  const checks = [
    makeCheck('integrity_formula', 'Semantic integrity formula', categoryPoints >= 4 ? 'pass' : categoryPoints > 0 ? 'warning' : 'fail', categoryPoints, CATEGORY_WEIGHTS.semantic_integrity, `Integrity ${integrity100}/100 using 100 - (stuffed x 5) - (legacy x 8) - (critical x 15), with backend search term repetition checked as a hidden relevance risk.`, { stuffed, legacy, critical, filler, repeatedSearchTerms, backendSearchTermsProvided: Boolean(backendSearchTerms) }),
  ];
  return scoreFromChecks('semantic_integrity', 'Semantic Integrity / Anti-Stuffing', CATEGORY_WEIGHTS.semantic_integrity, checks);
}

function buildRecommendations(categories) {
  const recommendations = [];
  for (const category of Object.values(categories)) {
    for (const check of category.checks || []) {
      if (check.status === 'pass') continue;
      recommendations.push({
        id: check.id,
        title: check.label,
        category: category.id,
        priority: category.id === 'canonical_relevance_alignment' || category.id === 'buyer_intent_coverage' ? 'high' : 'medium',
        difficulty: 'easy',
        goal: 'Improve Amazon AI relevance and listing interpretability.',
        issue: check.evidence,
        whyItMatters: 'Clear product, attribute, buyer intent, and question-answer signals help marketplace AI systems understand and match the listing.',
        fix: recommendationFix(category.id, check.id),
        developerTasks: [recommendationFix(category.id, check.id)],
        copyableFix: recommendationFix(category.id, check.id),
      });
    }
  }
  return recommendations.slice(0, 12);
}

function recommendationFix(categoryId, checkId) {
  if (categoryId === 'canonical_relevance_alignment') return 'Add the canonical phrase concepts to the title, first two bullets, and A+ content using concrete product facts.';
  if (categoryId === 'buyer_intent_coverage') return 'Rewrite at least one bullet using [Noun] + [Benefit] + [Context], and name the target shopper or use case explicitly.';
  if (categoryId === 'attribute_taxonomy_completeness') return 'Add the missing category attribute as a concrete spec, material, compatibility note, or included-item statement.';
  if (categoryId === 'question_answerability') return 'Add a concise answer to this buyer question in bullets, description, or A+ content.';
  if (checkId === 'aplus_content_type_visibility') return 'Move key A+ claims out of image-only modules and into readable A+ text modules, product description, bullets, or product details/specs.';
  if (categoryId === 'a_plus_knowledge_base') return 'Expand A+ content with specific facts, comparison/use-case modules, and trust or material context.';
  if (categoryId === 'media_relevance') return 'Use descriptive image filenames and alt text that name the product, feature, and use case.';
  if (categoryId === 'semantic_integrity') return 'Remove repeated keyword phrases, unsupported superlatives, and claims that are not backed by listing facts.';
  if (checkId === 'mobile_title_identity') return `Move the core product noun into the first ${RUFUS_CHAT_TRUNCATION} title characters.`;
  return 'Add clearer product identity, benefit, and context signals to the listing.';
}

function buildCopyAllInstructionsMarkdown({ source, scores, recommendations }) {
  const sections = recommendations.map((rec, index) => [
    `## ${index + 1}. ${rec.title}`,
    '',
    `Priority: ${rec.priority}`,
    `Category: ${rec.category}`,
    '',
    `Issue: ${rec.issue}`,
    '',
    `Fix: ${rec.fix}`,
  ].join('\n'));
  return [
    '# Amazon AI Relevance Fix Instructions',
    '',
    `Marketplace: ${source.marketplace || 'unknown'}`,
    `ASIN: ${source.asin || 'not provided'}`,
    `Canonical phrase: ${source.canonicalPhraseEnglish || 'not available'}`,
    `Amazon AI Relevance Score: ${scores.amazonAiRelevanceScore}/100`,
    '',
    sections.length ? sections.join('\n\n---\n\n') : 'No priority fix instructions generated.',
  ].join('\n');
}

function scoreToLevel(score) {
  if (score >= 80) return 'Strong AI Relevance';
  if (score >= 60) return 'AI-Relevant';
  return 'Needs Relevance Improvement';
}

function runAmazonRelevanceRules({ source, listing, profile }) {
  const categoryList = [
    analyzeCanonicalRelevance(source, listing),
    analyzeProductIdentity(listing, profile),
    analyzeAttributeCoverage(listing, profile),
    analyzeBuyerIntent(listing, profile),
    analyzeQuestionAnswerability(listing, profile),
    analyzeAPlus(listing, profile),
    analyzeMedia(listing, profile),
    analyzeSemanticIntegrity(source, listing),
  ];
  const categories = Object.fromEntries(categoryList.map((category) => [category.id, category]));
  const total = categoryList.reduce((sum, category) => sum + category.score, 0);
  const scores = {
    amazonAiRelevanceScore: scale(total, 100),
    canonicalAlignmentScore: categories.canonical_relevance_alignment.score,
    productIdentityScore: categories.product_identity_clarity.score,
    attributeCompletenessScore: categories.attribute_taxonomy_completeness.score,
    buyerIntentCoverageScore: categories.buyer_intent_coverage.score,
    questionAnswerabilityScore: categories.question_answerability.score,
    aPlusKnowledgeBaseScore: categories.a_plus_knowledge_base.score,
    mediaRelevanceScore: categories.media_relevance.score,
    semanticIntegrityScore: categories.semantic_integrity.score,
  };
  const checks = categoryList.flatMap((category) => category.checks.map((check) => ({ ...check, category: category.id })));
  const recommendations = buildRecommendations(categories);
  return {
    scores,
    level: scoreToLevel(scores.amazonAiRelevanceScore),
    categories,
    checks,
    canonicalRelevance: categories.canonical_relevance_alignment,
    buyerIntentCoverage: categories.buyer_intent_coverage,
    sectionAnalysis: {
      titleLength: (listing.title || '').length,
      bulletCount: (listing.bullets || []).length,
      descriptionLength: (listing.description || '').length,
      aPlusContentLength: (listing.aPlusContent || '').length,
      productDetailsSpecsLength: (listing.productDetailsSpecs || '').length,
      faqInformationLength: (listing.faqInformation || '').length,
      reviewInformationLength: (listing.reviewInformation || '').length,
      productNicheKnowledgeLength: (listing.productNicheKnowledge || '').length,
      aPlusContentType: listing.aPlusContentType || null,
      aPlusVisibilityWarning: listing.aPlusContentType === 'images_only_text_embedded_seo_invisible'
        ? 'Your A+ content may visually communicate benefits, but if key claims are embedded only inside images, Amazon AI and external AI crawlers may not reliably parse them as structured text.'
        : null,
      mobileSubChecks: {
        RUFUS_CHAT_TRUNCATION,
        MOBILE_BULLET,
      },
    },
    attributeCoverage: categories.attribute_taxonomy_completeness,
    questionAnswerability: categories.question_answerability,
    semanticIntegrity: categories.semantic_integrity,
    mediaRelevance: categories.media_relevance,
    recommendations,
    copyAllInstructionsMarkdown: buildCopyAllInstructionsMarkdown({ source, scores, recommendations }),
  };
}

module.exports = {
  CATEGORY_WEIGHTS,
  MOBILE_BULLET,
  RUFUS_CHAT_TRUNCATION,
  computeSemanticIntegrityScore,
  runAmazonRelevanceRules,
};
