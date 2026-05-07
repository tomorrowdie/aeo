// ── Dashboard ──────────────────────────────────────────────────────────────────

export interface BotStat {
  name: string;
  company: string;
  countTotal: number;
  count24h: number;
  lastSeenAt: string | null;
}

export interface LogEntry {
  bot: string;
  company: string;
  path: string;
  status: number;
  requestType?: 'ai_discovery' | 'security_probe';
  ts: string;
}

export interface DashboardData {
  totalVisits: number;
  last24h: number;
  activeBotCount: number;
  lastVisitAt: string | null;
  botBreakdown: BotStat[];
  recentLogs: LogEntry[];
}

// ── Scan ──────────────────────────────────────────────────────────────────────

export interface ScanInit {
  websiteId: string;
  slug: string;
  status: 'SCANNING';
}

export interface ScanResult {
  score: number;
  scoreTitle: number;
  scoreMetaDesc: number;
  scoreOgTags: number;
  scoreJsonLd: number;
  scoreFaqSchema: number;
  scoreLlmsTxt: number;
  scoreContact: number;
  scoreImages: number;
  hasTitle: boolean;
  hasMetaDesc: boolean;
  hasOgTags: boolean;
  hasJsonLd: boolean;
  hasFaqSchema: boolean;
  hasLlmsTxt: boolean;
  hasPhone: boolean;
  hasEmail: boolean;
  hasAddress: boolean;
  hasImages: boolean;
  scannedAt: string;
}

export type AgentReadinessStatus = 'pass' | 'fail' | 'warning' | 'future';
export type AgentReadinessPriority = 'critical' | 'high' | 'medium' | 'low' | 'future';
export type AgentReadinessDifficulty = 'easy' | 'medium' | 'hard';

export interface AgentReadinessCheck {
  id: string;
  label: string;
  category: string;
  status: AgentReadinessStatus;
  scoreImpact: number;
  scoreAwarded: number;
  priority: AgentReadinessPriority;
  evidence?: string;
  detectedUrl?: string;
  detectedValue?: string;
  informational?: boolean;
  details?: Record<string, unknown>;
}

export interface AgentReadinessRecommendation {
  id: string;
  checkId: string;
  title: string;
  category: string;
  status: AgentReadinessStatus;
  priority: AgentReadinessPriority;
  difficulty: AgentReadinessDifficulty;
  goal: string;
  issue: string;
  whyItMatters: string;
  fix: string;
  developerTasks: string[];
  copyableFix?: string;
}

export interface AgentReadinessCategory {
  id: string;
  label: string;
  score: number;
  passed: number;
  total: number;
  weight: number;
  checks: AgentReadinessCheck[];
}

export interface AgentReadinessResult {
  schemaVersion: 'v1';
  scannedAt: string;
  score: number;
  agentReadinessScore: number;
  level: string;
  summary: string;
  categories: Record<string, AgentReadinessCategory>;
  checks: AgentReadinessCheck[];
  agentReadinessChecks: AgentReadinessCheck[];
  recommendations: AgentReadinessRecommendation[];
  agentReadinessRecommendations: AgentReadinessRecommendation[];
  copyAllInstructionsMarkdown: string;
  informationalChecks?: AgentReadinessCheck[];
  warnings?: { id: string; evidence?: string }[];
  aeo_site_readiness_packet?: Record<string, unknown>;
}

export interface AeoContent {
  llmsTxt: string;
  faqJsonLd: string;
  addressHtml: string;
  llmsTxtLinkTag: string;
  businessName: string;
  tagline: string;
  about: string;
  features: string[];
  productsServices: string[];
  faq: { q: string; a: string }[];
  searchKeywords: string[];
  recommendations: string[];
  contact: { phone: string | null; email: string | null; address: string | null };
  agentReadiness?: AgentReadinessResult | null;
  lang: string;
}

export interface ScanPollResult {
  websiteId: string;
  slug: string;
  url: string;
  title: string | null;
  score: number | null;
  status: 'SCANNING' | 'COMPLETE' | 'FAILED';
  lastScannedAt: string | null;
  latestScan: ScanResult | null;
  aeoContent: AeoContent | null;
  agentReadiness?: AgentReadinessResult | null;
  scanType?: 'website' | 'amazon_ai_relevance';
  amazonAiRelevance?: {
    level: string;
    summary: string;
    scores: Record<string, number>;
    categories: any[];
    recommendations: string[];
    copyAllInstructionsMarkdown: string;
    usageCost?: number;
    source?: {
      marketplace?: string;
      asin?: string;
      canonicalPhraseEnglish?: string;
    };
  };
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

export interface ShopSummary {
  id: string;
  url: string;
  slug: string;
  title: string | null;
  category: string | null;
  score: number | null;
  lastScannedAt?: string;
  createdAt?: string;
}

export interface LeaderboardData {
  topTen: ShopSummary[];
  newcomers: ShopSummary[];
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || '';

export async function fetchDashboard(): Promise<DashboardData> {
  const res = await fetch(`${BASE}/api/dashboard`, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error('Dashboard fetch failed');
  return res.json();
}

export async function postScan(payload: string | Record<string, any>, lang = 'en'): Promise<ScanInit> {
  const body = typeof payload === 'string' ? { url: payload, lang } : { ...payload, lang };
  const res = await fetch(`${BASE}/api/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error(`[postScan] Backend returned ${res.status} ${res.statusText}`);
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Scan failed with status ${res.status}`);
  }
  return res.json();
}

export async function pollScan(websiteId: string): Promise<ScanPollResult> {
  const res = await fetch(`${BASE}/api/scan/${websiteId}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Poll failed');
  return res.json();
}

export async function fetchLeaderboard(): Promise<LeaderboardData> {
  const res = await fetch(`${BASE}/api/leaderboard`, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error('Leaderboard fetch failed');
  return res.json();
}
