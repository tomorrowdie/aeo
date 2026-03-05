'use client';

import type { DashboardData } from '@/lib/api';

function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

interface Props {
  data: DashboardData | null;
  loading: boolean;
}

export default function MetricCards({ data, loading }: Props) {
  const placeholder = loading || !data;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-3xl">
      {/* AI Visits */}
      <div className="rounded-2xl border border-[#374151] bg-[#111827] p-5 text-center">
        <div className="text-3xl font-bold text-[#00ff88]">
          {placeholder ? '—' : data.totalVisits.toLocaleString()}
        </div>
        <div className="mt-1 text-sm text-gray-400">AI Visits</div>
      </div>

      {/* Last 24h */}
      <div className="rounded-2xl border border-[#374151] bg-[#111827] p-5 text-center">
        <div className="text-3xl font-bold text-[#00ff88]">
          {placeholder ? '—' : data.last24h.toLocaleString()}
        </div>
        <div className="mt-1 text-sm text-gray-400">Last 24h</div>
      </div>

      {/* Active Bots */}
      <div className="rounded-2xl border border-[#374151] bg-[#111827] p-5 text-center">
        <div className="text-3xl font-bold text-[#00ff88]">
          {placeholder ? '—' : data.activeBotCount}
        </div>
        <div className="mt-1 text-sm text-gray-400">Active Bots</div>
      </div>

      {/* Last Visit */}
      <div className="rounded-2xl border border-[#374151] bg-[#111827] p-5 text-center">
        <div className="flex items-center justify-center gap-1.5 text-base font-semibold text-white">
          {!placeholder && data.lastVisitAt && (
            <span className="live-dot" />
          )}
          {placeholder ? '—' : timeAgo(data.lastVisitAt)}
        </div>
        <div className="mt-1 text-sm text-gray-400">最近造訪</div>
      </div>
    </div>
  );
}
