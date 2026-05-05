'use client';

import { useState, useEffect } from 'react';

import { useDashboard }     from '@/hooks/useDashboard';
import { useScan }          from '@/hooks/useScan';
import { useLanguage }      from '@/hooks/useLanguage';
import MetricCards          from '@/components/Dashboard/MetricCards';
import ScanInputCard        from '@/components/Scanner/ScanInputCard';
import BotGrid              from '@/components/Dashboard/BotGrid';
import LogFeed              from '@/components/Dashboard/LogFeed';
import ScoreCard            from '@/components/Results/ScoreCard';
import ScoreBreakdown       from '@/components/Results/ScoreBreakdown';
import OutputTabs           from '@/components/Results/OutputTabs';
import LeaderboardSection   from '@/components/Leaderboard/LeaderboardSection';
import LanguageSwitcher     from '@/components/LanguageSwitcher';
import { Alert, AlertDescription } from '@/components/ui/alert';

function TickerBar({ logs, title }: { logs: { bot: string; path: string; ts: string }[], title: string }) {
  if (logs.length === 0) return null;

  const items = [...logs, ...logs];

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-[#374151] bg-[#111827]">
      <div className="px-4 py-2 text-xs text-gray-500 border-b border-[#374151]">
        {title}
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
  const { lang, setLang, t } = useLanguage();
  const [leaderboardTrigger, setLeaderboardTrigger] = useState(0);

  useEffect(() => {
    if (phase === 'complete') {
      setLeaderboardTrigger(prev => prev + 1);
    }
  }, [phase]);

  const botBreakdown = dashboard?.botBreakdown ?? [];
  const recentLogs   = dashboard?.recentLogs   ?? [];

  return (
    <div className="min-h-screen bg-[#030712] text-gray-300 font-sans selection:bg-[#a855f7] selection:text-white">
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <header className="w-full border-b border-[#1f2937] bg-[#111827]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-[#a855f7] to-[#ec4899] flex items-center justify-center font-bold text-white shadow-lg shadow-purple-500/20">
              A
            </div>
            <span className="font-semibold text-white tracking-wide">AEO Platform</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline-flex items-center gap-2 text-xs font-medium px-2.5 py-1 rounded-full bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff88] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00ff88]"></span>
              </span>
              API Online
            </span>
            <LanguageSwitcher currentLang={lang} setLang={setLang} />
          </div>
        </div>
      </header>

      <main className="flex flex-col items-center px-4 py-16">
        {/* ── Hero ────────────────────────────────────────────────────────────── */}
        <section className="flex flex-col items-center gap-6 text-center w-full max-w-3xl">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white drop-shadow-sm">
            {t.heroTitle.split(' ').map((word, i) => 
              word === 'AEO' || word.toUpperCase() === 'AI' || word === '掃描器' || word === '扫描器' ? (
                <span key={i} className="bg-clip-text text-transparent bg-gradient-to-r from-[#a855f7] to-[#ec4899] pr-2">{word} </span>
              ) : (
                <span key={i}>{word} </span>
              )
            )}
          </h1>
          <p className="text-xl text-gray-300 font-medium">{t.heroSubtitle}</p>
          <p className="text-sm text-gray-500 leading-relaxed max-w-xl">
            {t.heroDesc}
          </p>

          {/* Metric Cards */}
          <MetricCards data={dashboard} loading={dashLoading} />

          {/* URL Input */}
          <ScanInputCard
            phase={phase}
            onScan={startScan}
            onReset={reset}
          />

          <p className="text-xs text-gray-500 font-medium tracking-wide uppercase mt-2">
            Free scan → AI score → Generate fix code → Get found
            <span className="mx-2">|</span>
            <a href="#leaderboard" className="text-[#a855f7] hover:underline font-bold">🏆 View Leaderboard</a>
          </p>

          {/* Error */}
          {error && (
            <Alert variant="destructive" className="w-full max-w-2xl bg-red-950/50 border-red-900/50 text-red-400">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Scanning indicator */}
          {phase === 'scanning' && (
            <div className="w-full max-w-2xl rounded-2xl border border-[#374151] bg-[#111827] p-8 text-center shadow-xl shadow-black/50">
              <div className="flex items-center justify-center gap-4">
                <div className="h-5 w-5 rounded-full border-2 border-[#a855f7] border-t-transparent animate-spin" />
                <span className="text-gray-200 font-medium text-lg">{t.scanningState}</span>
              </div>
              <p className="mt-3 text-sm text-gray-500">
                {t.scanningDesc}
              </p>
            </div>
          )}
        </section>

        {/* ── Scan Result ─────────────────────────────────────────────────────── */}
        {phase === 'complete' && result && (
          <section className="mt-16 w-full max-w-6xl animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {/* Left Column: Output Tabs */}
              <div className="lg:col-span-2 w-full">
                <OutputTabs result={result} />
              </div>
              
              {/* Right Column: Quick Status & Score */}
              <div className="lg:col-span-1 flex flex-col gap-6 w-full">
                <ScoreCard result={result} onRescan={reset} />
                <ScoreBreakdown result={result} />
              </div>
            </div>
          </section>
        )}

        {/* ── Recent visits ticker ─────────────────────────────────────────────── */}
        {recentLogs.length > 0 && phase !== 'complete' && (
          <div className="mt-16 w-full max-w-5xl">
            <TickerBar logs={recentLogs} title={t.botGridTitle} />
          </div>
        )}

        {/* ── Bot Grid ─────────────────────────────────────────────────────────── */}
        <section className="mt-16 w-full max-w-5xl">
          <BotGrid botBreakdown={botBreakdown} />
        </section>

        {/* ── Leaderboard ──────────────────────────────────────────────────────── */}
        <section className="mt-20 w-full max-w-5xl">
          <LeaderboardSection refreshTrigger={leaderboardTrigger} />
        </section>

        {/* ── Footer ───────────────────────────────────────────────────────────── */}
        <footer className="mt-24 border-t border-[#1f2937] w-full max-w-5xl pt-8 pb-4 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500">
          <span>{t.footerText}</span>
          <span className="mt-2 sm:mt-0 flex items-center gap-1">
            Powered by <span className="text-[#a855f7] font-semibold">Claude</span> & <span className="text-[#ec4899] font-semibold">Playwright</span>
          </span>
        </footer>
      </main>
    </div>
  );
}
