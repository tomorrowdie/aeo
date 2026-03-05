'use client';

import { useEffect, useState } from 'react';
import { fetchLeaderboard, type ShopSummary, type LeaderboardData } from '@/lib/api';

function scoreColor(score: number | null): string {
  if (!score) return '#6b7280';
  if (score >= 80) return '#00ff88';
  if (score >= 60) return '#eab308';
  if (score >= 40) return '#f97316';
  return '#ef4444';
}

function medal(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `${rank}`;
}

function timeAgo(iso: string | undefined): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} 分鐘前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小時前`;
  return `${Math.floor(h / 24)} 天前`;
}

function ShopRow({ shop, rank }: { shop: ShopSummary; rank: number }) {
  const color = scoreColor(shop.score);
  const isTop3 = rank <= 3;
  return (
    <a
      href={`/aeo/shops/${shop.slug}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-xl border border-[#374151] bg-[#111827] p-4 hover:border-[#374151] hover:bg-[#1f2937] transition-colors"
    >
      {/* Rank */}
      <div className={`w-8 shrink-0 text-center font-bold ${isTop3 ? 'text-xl' : 'text-gray-400'}`}>
        {medal(rank)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-white text-sm truncate">
          {shop.title || shop.url}
        </div>
        <div className="text-xs text-gray-500 truncate">{shop.url}</div>
      </div>

      {/* Category */}
      {shop.category && (
        <span className="shrink-0 rounded-lg border border-[#374151] px-2 py-0.5 text-xs text-gray-400">
          {shop.category}
        </span>
      )}

      {/* Score */}
      <div className="shrink-0 text-xl font-bold" style={{ color }}>
        {shop.score ?? '—'}
      </div>
    </a>
  );
}

function NewcomerRow({ shop, rank }: { shop: ShopSummary; rank: number }) {
  const color = scoreColor(shop.score);
  return (
    <a
      href={`/aeo/shops/${shop.slug}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-xl border border-[#374151] bg-[#111827] p-4 hover:bg-[#1f2937] transition-colors"
    >
      <div className="w-6 shrink-0 text-center font-bold text-gray-400 text-sm">{rank}</div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-white text-sm truncate">
          {shop.title || shop.url}
        </div>
        <div className="text-xs text-gray-500 truncate">
          {shop.url} · {timeAgo(shop.createdAt)}
        </div>
      </div>
      {shop.category && (
        <span className="shrink-0 rounded-lg border border-[#374151] px-2 py-0.5 text-xs text-gray-400">
          {shop.category}
        </span>
      )}
      <div className="shrink-0 text-lg font-bold" style={{ color }}>
        {shop.score ?? '—'}
      </div>
    </a>
  );
}

export default function LeaderboardSection() {
  const [data, setData]       = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard().then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <section className="w-full max-w-5xl">
      <h2 className="mb-2 text-center text-3xl font-bold text-white">
        🏆 <span className="text-[#00ff88]">Leaderboard</span>
      </h2>
      <p className="mb-8 text-center text-sm text-gray-400">
        AI-Friendliness TOP 10 — Most likely to be recommended by AI
      </p>

      {loading ? (
        <div className="text-center text-gray-500">Loading…</div>
      ) : !data ? (
        <div className="text-center text-gray-500">Failed to load leaderboard.</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-8">
          {/* Top 10 */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="text-[#eab308]">📁</span>
              <span className="font-semibold text-gray-200">全部排行</span>
              <span className="rounded-full bg-[#1f2937] px-2 py-0.5 text-xs text-gray-400">TOP 10</span>
            </div>
            <div className="flex flex-col gap-2">
              {data.topTen.map((shop, i) => (
                <ShopRow key={shop.id} shop={shop} rank={i + 1} />
              ))}
              {data.topTen.length === 0 && (
                <div className="text-center text-sm text-gray-500 py-4">No data yet.</div>
              )}
            </div>
          </div>

          {/* Newcomers */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span>🆕</span>
              <span className="font-semibold text-gray-200">Newcomers</span>
              <span className="rounded-full bg-[#1f2937] px-2 py-0.5 text-xs text-gray-400">10 NEW</span>
            </div>
            <div className="flex flex-col gap-2">
              {data.newcomers.map((shop, i) => (
                <NewcomerRow key={shop.id} shop={shop} rank={i + 1} />
              ))}
              {data.newcomers.length === 0 && (
                <div className="text-center text-sm text-gray-500 py-4">No data yet.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
