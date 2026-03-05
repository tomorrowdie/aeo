import { notFound }   from 'next/navigation';
import type { Metadata } from 'next';

// ── Types (subset of backend ScanPollResult) ──────────────────────────────────

interface AeoContent {
  businessName: string;
  tagline: string;
  about: string;
  features: string[];
  productsServices: string[];
  faq: { q: string; a: string }[];
  searchKeywords: string[];
  contact: { phone: string | null; email: string | null; address: string | null };
  llmsTxt: string;
  lang: string;
}

interface ScanResult {
  hasTitle: boolean;
  hasMetaDesc: boolean;
  hasOgTags: boolean;
  hasJsonLd: boolean;
  hasFaqSchema: boolean;
  hasLlmsTxt: boolean;
  hasImages: boolean;
  hasPhone: boolean;
  hasEmail: boolean;
  hasAddress: boolean;
  score: number;
  scannedAt: string;
}

interface ShopData {
  websiteId: string;
  slug: string;
  url: string;
  title: string | null;
  score: number | null;
  status: string;
  lastScannedAt: string | null;
  latestScan: ScanResult | null;
  aeoContent: AeoContent | null;
}

// ── Data fetching ─────────────────────────────────────────────────────────────

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:3001';

async function getShopData(slug: string): Promise<ShopData | null> {
  // Find the website by slug using the leaderboard / directory approach:
  // Backend doesn't have a direct /api/shops/:slug endpoint, but aeo route
  // returns the shop profile. We use the scan status endpoint by finding
  // the website. The backend /aeo/shops/:slug/llms.txt serves the file.
  // We fetch from /api/leaderboard and filter, or use a direct endpoint.
  // Best: fetch /aeo/shops/:slug which returns the shop JSON.
  try {
    const res = await fetch(`${BACKEND}/aeo/shops/${slug}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const data = await getShopData(params.slug);
  if (!data) return { title: 'Not Found' };

  const name = data.aeoContent?.businessName || data.title || data.url;
  return {
    title: `${name} — AEO Profile`,
    description: data.aeoContent?.tagline || `AI-Friendliness score: ${data.score ?? '?'}/100`,
  };
}

// ── Check badge ───────────────────────────────────────────────────────────────

function CheckBadge({ pass, label }: { pass: boolean; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium"
      style={{
        background: pass ? '#052e16' : '#450a0a',
        color:      pass ? '#00ff88' : '#f87171',
        border:     `1px solid ${pass ? '#166534' : '#7f1d1d'}`,
      }}
    >
      {pass ? '✅' : '❌'} {label}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ShopPage({ params }: { params: { slug: string } }) {
  const data = await getShopData(params.slug);
  if (!data || data.status !== 'COMPLETE') notFound();

  const c    = data.aeoContent;
  const scan = data.latestScan;
  const name = c?.businessName || data.title || data.url;

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      {/* Breadcrumb */}
      <nav className="mb-8 flex items-center gap-3 text-sm text-gray-400">
        <a href="/" className="hover:text-white transition-colors">🏠 Home</a>
        <span>·</span>
        <a href="/" className="hover:text-white transition-colors">← Back to Directory</a>
        {c?.llmsTxt && (
          <>
            <span>·</span>
            <a
              href={`/aeo/shops/${data.slug}/llms.txt`}
              className="hover:text-white transition-colors"
            >
              llms.txt
            </a>
          </>
        )}
        <span>·</span>
        <a
          href={data.url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white transition-colors"
        >
          Official Website
        </a>
      </nav>

      {/* Title */}
      <h1 className="text-2xl font-bold text-[#eab308]">{name}</h1>

      {/* Score badge */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="rounded-lg bg-[#78350f] px-3 py-1 text-sm font-semibold text-[#eab308]">
          AEO Score: {data.score ?? '?'}/100
        </span>
        {data.lastScannedAt && (
          <span className="text-sm text-gray-400">
            Last Scanned: {new Date(data.lastScannedAt).toISOString().split('T')[0]}
          </span>
        )}
      </div>

      {/* AEO scan results grid */}
      {scan && (
        <section className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-white">
            AEO Scan Results ({
              [scan.hasJsonLd, scan.hasLlmsTxt, scan.hasOgTags, scan.hasMetaDesc,
               scan.hasFaqSchema, scan.hasTitle, (scan.hasPhone || scan.hasEmail), scan.hasImages]
                .filter(Boolean).length
            }/8 passed)
          </h2>
          <div className="flex flex-wrap gap-2">
            <CheckBadge pass={scan.hasJsonLd}    label="JSON-LD 結構化數據" />
            <CheckBadge pass={scan.hasLlmsTxt}   label="llms.txt" />
            <CheckBadge pass={scan.hasOgTags}    label="Open Graph 標籤" />
            <CheckBadge pass={scan.hasMetaDesc}  label="Meta Description" />
            <CheckBadge pass={scan.hasFaqSchema} label="FAQ 問答" />
            <CheckBadge pass={scan.hasTitle}     label="網頁標題" />
            <CheckBadge pass={scan.hasPhone || scan.hasEmail} label="聯絡資訊" />
            <CheckBadge pass={scan.hasImages}    label="圖片" />
          </div>
        </section>
      )}

      {/* AI-Readable Profile link */}
      {c?.llmsTxt && (
        <a
          href={`/aeo/shops/${data.slug}/llms.txt`}
          className="mt-4 inline-block text-sm text-[#00ff88] hover:underline"
        >
          AI-Readable Structured Profile →
        </a>
      )}

      {/* Business Details */}
      {c && (
        <section className="mt-10 flex flex-col gap-6">
          {c.tagline && (
            <p className="text-gray-300 italic border-l-2 border-[#a855f7] pl-4">{c.tagline}</p>
          )}

          {c.about && (
            <div>
              <h3 className="mb-2 font-semibold text-white">About</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{c.about}</p>
            </div>
          )}

          {c.features.length > 0 && (
            <div>
              <h3 className="mb-2 font-semibold text-white">Key Features</h3>
              <ul className="list-disc list-inside text-sm text-gray-400 space-y-1">
                {c.features.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </div>
          )}

          {c.productsServices.length > 0 && (
            <div>
              <h3 className="mb-2 font-semibold text-white">Products & Services</h3>
              <div className="flex flex-wrap gap-2">
                {c.productsServices.map((p, i) => (
                  <span key={i} className="rounded-lg border border-[#374151] px-3 py-1 text-xs text-gray-300">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {c.faq.length > 0 && (
            <div>
              <h3 className="mb-3 font-semibold text-white">FAQ</h3>
              <div className="flex flex-col gap-3">
                {c.faq.map((item, i) => (
                  <div key={i} className="rounded-xl border border-[#374151] bg-[#111827] p-4">
                    <div className="font-medium text-white text-sm">{item.q}</div>
                    <div className="mt-1 text-xs text-gray-400 leading-relaxed">{item.a}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Evidence & Sources */}
      <section className="mt-10 rounded-2xl border border-[#374151] bg-[#111827] p-6">
        <h3 className="mb-4 font-semibold text-[#00ff88]">🔗 Evidence &amp; Sources</h3>
        <ul className="flex flex-col gap-2 text-sm text-gray-300">
          {c?.llmsTxt && (
            <li>
              ✓{' '}
              <a href={`/aeo/shops/${data.slug}/llms.txt`} className="text-[#00ff88] hover:underline">
                AI-Readable Structured Profile
              </a>
            </li>
          )}
          <li>
            ✓ Official Website:{' '}
            <a href={data.url} target="_blank" rel="noopener noreferrer" className="text-[#00ff88] hover:underline">
              {data.url}
            </a>
          </li>
          <li>✓ AEO Directory (2,000+ businesses)</li>
        </ul>
      </section>

      {/* Footer */}
      <footer className="mt-12 text-center text-xs text-gray-600">
        AI-Friendliness Optimization · Free Scan ·{' '}
        <a href="/" className="hover:text-gray-400">Back to Scanner</a>
      </footer>
    </main>
  );
}
