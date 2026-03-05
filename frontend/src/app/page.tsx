'use client';

import { useDashboard }     from '@/hooks/useDashboard';
import { useScan }          from '@/hooks/useScan';
import MetricCards          from '@/components/Dashboard/MetricCards';
import UrlInput             from '@/components/Scanner/UrlInput';
import BotGrid              from '@/components/Dashboard/BotGrid';
import LogFeed              from '@/components/Dashboard/LogFeed';
import ScoreCard            from '@/components/Results/ScoreCard';
import ScoreBreakdown       from '@/components/Results/ScoreBreakdown';
import CodeBlock            from '@/components/Results/CodeBlock';
import LeaderboardSection   from '@/components/Leaderboard/LeaderboardSection';

// Ticker bar entries (static; live events come from LogFeed)
function TickerBar({ logs }: { logs: { bot: string; path: string; ts: string }[] }) {
  if (logs.length === 0) return null;

  // Duplicate for seamless loop
  const items = [...logs, ...logs];

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-[#374151] bg-[#111827]">
      <div className="px-4 py-2 text-xs text-gray-500 border-b border-[#374151]">
        Recently visited by AI
      </div>
      <div className="overflow-hidden py-2">
        <div className="ticker-inner">
          {items.map((log, i) => (
            <span key={i} className="mx-6 inline-flex items-center gap-1.5 text-sm whitespace-nowrap">
              <span className="h-2 w-2 rounded-full bg-[#00ff88] inline-block" />
              <span className="font-semibold text-white">{log.bot}</span>
              <span className="text-gray-500">→</span>
              <span className="text-[#00ff88]">{log.path}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { data: dashboard, loading: dashLoading } = useDashboard(60_000);
  const { phase, result, error, startScan, reset } = useScan();

  const botBreakdown = dashboard?.botBreakdown ?? [];
  const recentLogs   = dashboard?.recentLogs   ?? [];

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-16">
      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="flex flex-col items-center gap-6 text-center w-full max-w-3xl">
        {/* Heading */}
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white">
          被 <span className="gradient-text">AI</span> 找到
        </h1>
        <p className="text-lg text-gray-300">Paste your URL. Get found by AI. Free.</p>
        <p className="text-sm text-gray-500 leading-relaxed">
          AI 爬蟲每天都來。貼上網址，免費掃描，一起被 ChatGPT、Claude、Perplexity 找到。<br />
          URLを貼るだけ。AIがあなたのサイトを診断し、修正コードを自動生成します。無料。
        </p>

        {/* Metric Cards */}
        <MetricCards data={dashboard} loading={dashLoading} />

        {/* URL Input */}
        <UrlInput
          phase={phase}
          onScan={startScan}
          onReset={reset}
        />

        <p className="text-xs text-gray-500">
          Free scan → AI score → Generate fix code → Get found
        </p>

        {/* Error */}
        {error && (
          <div className="w-full rounded-xl border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Scanning indicator */}
        {phase === 'scanning' && (
          <div className="w-full max-w-2xl rounded-2xl border border-[#374151] bg-[#111827] p-8 text-center">
            <div className="flex items-center justify-center gap-3">
              <span className="live-dot" />
              <span className="text-gray-300">Analyzing your site with AI…</span>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              This takes 15–30 seconds. Playwright is scraping and Claude is extracting…
            </p>
          </div>
        )}

        {/* Info banner */}
        {phase === 'idle' && (
          <div className="w-full max-w-2xl rounded-xl border border-[#374151] bg-[#111827] flex items-start gap-3 px-5 py-4">
            <span className="text-lg shrink-0 mt-0.5">📰</span>
            <p className="text-sm text-gray-400">
              Real visit data from 6 major AI crawlers: ClaudeBot, GPTBot, Bytespider,
              PerplexityBot, Amazonbot, Meta AI.
            </p>
            <a
              href="#"
              className="ml-auto shrink-0 text-sm text-[#eab308] hover:underline"
            >
              Read our Blog →
            </a>
          </div>
        )}
      </section>

      {/* ── Scan Result (inline, below hero) ────────────────────────────────── */}
      {phase === 'complete' && result && (
        <section className="mt-10 flex flex-col items-center gap-6 w-full max-w-2xl">
          <ScoreCard result={result} onRescan={reset} />
          <ScoreBreakdown result={result} />

          {/* Copy code section */}
          <div className="w-full">
            <h3 className="mb-4 text-center font-semibold text-gray-300">
              📋 Copy code, paste on your site
            </h3>

            {/* One-click copy all */}
            <button
              onClick={async () => {
                const all = [
                  result.aeoContent?.faqJsonLd,
                  result.aeoContent?.addressHtml,
                  result.aeoContent?.llmsTxtLinkTag,
                ].filter(Boolean).join('\n\n');
                await navigator.clipboard.writeText(all).catch(() => {});
              }}
              className="mb-4 w-full rounded-xl border border-[#a855f7] bg-[#a855f7]/10 py-3 text-sm font-semibold text-[#a855f7] hover:bg-[#a855f7]/20 transition-colors"
            >
              ✨ 一鍵複製所有程式碼
            </button>

            <div className="flex flex-col gap-4">
              {result.aeoContent?.faqJsonLd && (
                <CodeBlock
                  title="📝 網頁說明 + 常見問答"
                  subtitle="讓 AI 知道你賣什麼，FAQ 讓問答搜尋更容易找到你"
                  code={result.aeoContent.faqJsonLd}
                  points="+10分"
                />
              )}
              {result.aeoContent?.addressHtml && (
                <CodeBlock
                  title="⚙️ 聯絡資訊"
                  subtitle="貼到頁尾，讓 AI 偵測到你的電話、Email、地址"
                  code={result.aeoContent.addressHtml}
                  points="+4分"
                />
              )}
              {result.aeoContent?.llmsTxtLinkTag && (
                <CodeBlock
                  title="🔗 AI 連結"
                  subtitle="讓 AI 爬蟲自動找到你的商家資料"
                  code={result.aeoContent.llmsTxtLinkTag}
                />
              )}
            </div>
          </div>

          {/* Recommendations */}
          {result.aeoContent?.recommendations && result.aeoContent.recommendations.length > 0 && (
            <div className="w-full rounded-2xl border border-[#374151] bg-[#111827] p-6">
              <h3 className="mb-4 font-semibold text-white">💡 AI Recommendations</h3>
              <ul className="flex flex-col gap-2">
                {result.aeoContent.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="mt-0.5 text-[#00ff88] shrink-0">→</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* ── Recent visits ticker ─────────────────────────────────────────────── */}
      {recentLogs.length > 0 && (
        <div className="mt-12 w-full max-w-5xl">
          <TickerBar logs={recentLogs} />
        </div>
      )}

      {/* ── Bot Grid ─────────────────────────────────────────────────────────── */}
      <section className="mt-16 w-full max-w-5xl">
        <BotGrid botBreakdown={botBreakdown} />
      </section>

      {/* ── Log Feed ─────────────────────────────────────────────────────────── */}
      <section className="mt-12 w-full max-w-5xl">
        <LogFeed logs={recentLogs} />
      </section>

      {/* ── Leaderboard ──────────────────────────────────────────────────────── */}
      <section className="mt-20 w-full max-w-5xl">
        <LeaderboardSection />
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="mt-20 border-t border-[#374151] w-full max-w-5xl pt-8 pb-4 text-center text-xs text-gray-600">
        AI-Friendliness Optimization · Free Scan · Powered by Claude AI
      </footer>
    </main>
  );
}
