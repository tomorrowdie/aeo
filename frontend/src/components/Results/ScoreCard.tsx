'use client';

import type { ScanPollResult } from '@/lib/api';

function scoreColor(score: number): string {
  if (score >= 80) return '#00ff88';
  if (score >= 60) return '#eab308';
  if (score >= 40) return '#f97316';
  return '#ef4444';
}

interface Props {
  result: ScanPollResult;
  onRescan: () => void;
}

export default function ScoreCard({ result, onRescan }: Props) {
  const score = result.score ?? 0;
  const color = scoreColor(score);

  return (
    <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-8 text-center">
      {/* Score */}
      <div className="text-5xl font-bold" style={{ color }}>
        {score}<span className="text-3xl text-muted-foreground">/100</span>
      </div>

      {/* Rescan button */}
      <button
        onClick={onRescan}
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted px-4 py-2 text-sm text-foreground hover:border-purple-500 hover:text-purple-500 transition-colors"
      >
        🔄 重新掃描
      </button>

      {/* Business name */}
      {result.aeoContent?.businessName && (
        <div className="mt-4 text-lg font-semibold text-foreground">
          {result.aeoContent.businessName}
        </div>
      )}

      {/* Link to shop page */}
      {result.slug && (
        <a
          href={`${process.env.NEXT_PUBLIC_BACKEND_URL || ''}/aeo/shops/${result.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm text-success hover:border-success transition-colors"
        >
          📋 Your AEO business page is ready
          <span className="text-muted-foreground">View page →</span>
        </a>
      )}
    </div>
  );
}
