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

const BASE = typeof window === 'undefined' ? '' : '';

export async function fetchDashboard(): Promise<DashboardData> {
  const res = await fetch(`${BASE}/api/dashboard`, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error('Dashboard fetch failed');
  return res.json();
}

export async function postScan(url: string, lang = 'en'): Promise<ScanInit> {
  const res = await fetch(`${BASE}/api/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, lang }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? 'Scan failed');
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
