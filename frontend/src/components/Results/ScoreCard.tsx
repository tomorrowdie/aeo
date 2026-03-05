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
    <div className="w-full max-w-2xl rounded-2xl border border-[#374151] bg-[#111827] p-8 text-center">
      {/* Score */}
      <div className="text-5xl font-bold" style={{ color }}>
        {score}<span className="text-3xl text-gray-400">/100</span>
      </div>

      {/* Rescan button */}
      <button
        onClick={onRescan}
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-[#374151] bg-[#1f2937] px-4 py-2 text-sm text-gray-300 hover:border-[#a855f7] hover:text-white transition-colors"
      >
        🔄 重新掃描
      </button>

      {/* Business name */}
      {result.aeoContent?.businessName && (
        <div className="mt-4 text-lg font-semibold text-white">
          {result.aeoContent.businessName}
        </div>
      )}

      {/* Link to shop page */}
      {result.slug && (
        <a
          href={`/aeo/shops/${result.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#374151] bg-[#0d0f1a] px-4 py-2 text-sm text-[#00ff88] hover:border-[#00ff88] transition-colors"
        >
          📋 Your AEO business page is ready
          <span className="text-gray-400">View page →</span>
        </a>
      )}
    </div>
  );
}
