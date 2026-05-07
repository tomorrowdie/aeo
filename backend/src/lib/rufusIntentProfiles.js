'use strict';

const STANDARD_QA_TEMPLATES = [
  { id: 'what_is_it', question: 'What is this product?', signals: ['product noun', 'product type', 'brand'] },
  { id: 'who_is_it_for', question: 'Who is this for?', signals: ['customer', 'audience', 'use case'] },
  { id: 'why_buy_it', question: 'Why should a shopper buy it?', signals: ['benefit', 'differentiator', 'proof'] },
  { id: 'what_problem', question: 'What problem does it solve?', signals: ['problem', 'pain point', 'solution'] },
  { id: 'how_to_use', question: 'How do I use it?', signals: ['usage', 'instructions', 'context'] },
  { id: 'whats_included', question: 'What is included?', signals: ['included', 'package', 'box'] },
  { id: 'safety_compatibility', question: 'Is it safe or compatible?', signals: ['safety', 'material', 'compatibility'] },
];

const PROFILES = {
  generic: {
    id: 'generic',
    label: 'Generic Product',
    productNouns: ['product', 'item', 'kit', 'set', 'system', 'device', 'tool'],
    requiredAttributes: ['brand', 'product type', 'size', 'material', 'use case', 'included items', 'compatibility'],
    buyerIntentSignals: ['easy', 'durable', 'gift', 'home', 'travel', 'daily', 'comfortable', 'safe'],
    benefitSignals: ['easy', 'durable', 'protect', 'save', 'support', 'comfortable', 'safe', 'convenient'],
    contextSignals: ['home', 'office', 'travel', 'daily', 'outdoor', 'family', 'work'],
  },
  electronics_desktop: {
    id: 'electronics_desktop',
    label: 'Electronics - Desktop Computer',
    productNouns: ['desktop', 'tower', 'pc', 'computer', 'processor', 'workstation'],
    requiredAttributes: ['processor', 'gpu', 'ram', 'storage', 'operating system', 'ports', 'warranty', 'compatibility'],
    buyerIntentSignals: ['gaming', 'creator', 'work', 'productivity', 'ai', 'video', 'streaming', 'upgrade', 'performance'],
    benefitSignals: ['accelerate', 'performance', 'fast', 'smooth', 'powerful', 'render', 'multitask', 'upgrade'],
    contextSignals: ['gaming', 'creator', 'office', 'work', 'ai', 'streaming', 'editing'],
    inferSignals: ['desktop', 'tower', 'processor', 'gpu', 'ram', 'rtx', 'intel', 'amd', 'pc'],
  },
  baby_product: {
    id: 'baby_product',
    label: 'Baby Product',
    productNouns: ['baby', 'infant', 'toddler', 'feeder', 'teether', 'pacifier', 'bottle'],
    requiredAttributes: ['age range', 'material', 'safety', 'bpa-free', 'cleaning', 'size', 'included accessories', 'use case'],
    buyerIntentSignals: ['safe', 'first foods', 'teething', 'soft', 'clean', 'portable', 'parent', 'baby-led'],
    benefitSignals: ['safe', 'soothe', 'comfort', 'clean', 'protect', 'easy', 'gentle'],
    contextSignals: ['baby', 'infant', 'teething', 'feeding', 'travel', 'home'],
    inferSignals: ['baby', 'infant', 'toddler', 'feeder', 'teether', 'pacifier'],
  },
  home_kitchen: {
    id: 'home_kitchen',
    label: 'Home & Kitchen',
    productNouns: ['kitchen', 'container', 'organizer', 'maker', 'machine', 'tool', 'appliance'],
    requiredAttributes: ['material', 'capacity', 'dimensions', 'cleaning', 'power', 'included items', 'use case'],
    buyerIntentSignals: ['easy clean', 'space saving', 'meal prep', 'family', 'durable', 'countertop', 'storage'],
    benefitSignals: ['save', 'organize', 'clean', 'prepare', 'durable', 'easy', 'compact'],
    contextSignals: ['kitchen', 'home', 'meal', 'family', 'countertop', 'storage'],
    inferSignals: ['kitchen', 'cook', 'food', 'container', 'organizer', 'appliance'],
  },
};

function inferProfileKey({ category, productType, title, canonicalPhrase }) {
  const text = [category, productType, title, canonicalPhrase].filter(Boolean).join(' ').toLowerCase();
  if (!text) return 'generic';

  for (const [key, profile] of Object.entries(PROFILES)) {
    if (key === 'generic') continue;
    if ((profile.inferSignals || []).some((signal) => text.includes(signal))) return key;
  }
  return 'generic';
}

function getIntentProfile(input = {}) {
  const key = inferProfileKey(input);
  return PROFILES[key] || PROFILES.generic;
}

module.exports = {
  PROFILES,
  STANDARD_QA_TEMPLATES,
  getIntentProfile,
  inferProfileKey,
};

