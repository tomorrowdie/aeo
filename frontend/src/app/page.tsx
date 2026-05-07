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
import ThemeToggle          from '@/components/ThemeToggle';
import { Alert, AlertDescription } from '@/components/ui/alert';

function TickerBar({ logs, title }: { logs: { bot: string; path: string; ts: string }[], title: string }) {
  if (logs.length === 0) return null;

  const items = [...logs, ...logs];

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-border bg-card">
      <div className="px-4 py-2 text-xs text-muted-foreground border-b border-border">
        {title}
      </div>
      <div className="overflow-hidden py-2">
        <div className="ticker-inner">
          {items.map((log, i) => (
            <span key={i} className="mx-6 inline-flex items-center gap-1.5 text-sm whitespace-nowrap">
              <span className="h-2 w-2 rounded-full bg-success inline-block" />
              <span className="font-semibold text-foreground">{log.bot}</span>
              <span className="text-muted-foreground">→</span>
              <span className="text-success">{log.path}</span>
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
  const recentLogs   = (dashboard?.recentLogs ?? []).filter(log => 
    log.requestType !== 'security_probe' &&
    !log.path.match(/\/\.(env|npmrc|cursor|git|vscode)|wp-config|phpmyadmin|\.php$|\.sql$|\.bak$/i)
  );

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-purple-500 selection:text-white">
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <header className="w-full border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-white shadow-lg shadow-purple-500/20">
              A
            </div>
            <span className="font-semibold text-foreground tracking-wide">AEO Platform</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline-flex items-center gap-2 text-xs font-medium px-2.5 py-1 rounded-full bg-success/10 text-success border border-success/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
              </span>
              API Online
            </span>
            <ThemeToggle />
            <LanguageSwitcher currentLang={lang} setLang={setLang} />
          </div>
        </div>
      </header>

      <main className="flex flex-col items-center px-4 py-16">
        {/* ── Hero ────────────────────────────────────────────────────────────── */}
        <section className="flex flex-col items-center gap-6 text-center w-full max-w-3xl">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-foreground drop-shadow-sm">
            {t.heroTitle.split(' ').map((word, i) => 
              word === 'AEO' || word.toUpperCase() === 'AI' || word === '掃描器' || word === '扫描器' ? (
                <span key={i} className="bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-pink-500 pr-2">{word} </span>
              ) : (
                <span key={i}>{word} </span>
              )
            )}
          </h1>
          <p className="text-xl text-foreground font-medium">{t.heroSubtitle}</p>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
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

          <p className="text-xs text-muted-foreground font-medium tracking-wide uppercase mt-2">
            {t.processLine}
            <span className="mx-2">|</span>
            <a href="#leaderboard" className="text-purple-500 hover:underline font-bold">🏆 View Leaderboard</a>
          </p>

          {/* Error */}
          {error && (
            <Alert variant="destructive" className="w-full max-w-2xl bg-danger/10 border-danger/20 text-danger">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Scanning indicator */}
          {phase === 'scanning' && (
            <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-8 text-center shadow-xl shadow-black/20">
              <div className="flex items-center justify-center gap-4">
                <div className="h-5 w-5 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                <span className="text-foreground font-medium text-lg">{t.scanningState}</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {t.scanningDesc}
              </p>
            </div>
          )}
        </section>

        {/* ── Scan Result ─────────────────────────────────────────────────────── */}
        {phase === 'complete' && result && (
          <section className="mt-16 w-full max-w-7xl animate-in fade-in slide-in-from-bottom-8 duration-700">
            <OutputTabs 
              result={result} 
              rightSidebar={
                <>
                  <ScoreCard result={result} onRescan={reset} />
                  <ScoreBreakdown result={result} />
                </>
              }
            />
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
          <BotGrid botBreakdown={botBreakdown} t={t} />
        </section>

        {/* ── Leaderboard ──────────────────────────────────────────────────────── */}
        <section className="mt-20 w-full max-w-5xl">
          <LeaderboardSection refreshTrigger={leaderboardTrigger} />
        </section>

        {/* ── Footer ───────────────────────────────────────────────────────────── */}
        <footer className="mt-24 border-t border-border w-full max-w-5xl pt-8 pb-4 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground">
          <span>{t.footerText}</span>
          <span className="mt-2 sm:mt-0 flex items-center gap-1">
            Powered by <span className="text-purple-500 font-semibold">Claude</span> & <span className="text-pink-500 font-semibold">Playwright</span>
          </span>
        </footer>
      </main>
    </div>
  );
}
