'use client';

import type { BotStat } from '@/lib/api';

// 16 canonical bots shown in the grid (matches the reference screenshots)
const CANONICAL_BOTS: { name: string; company: string; color: string }[] = [
  { name: 'GPTBot',        company: 'OpenAI',       color: '#22c55e' },
  { name: 'ChatGPT',       company: 'OpenAI',       color: '#16a34a' },
  { name: 'ClaudeBot',     company: 'Anthropic',    color: '#a855f7' },
  { name: 'PerplexityBot', company: 'Perplexity',   color: '#6366f1' },
  { name: 'Bytespider',    company: 'ByteDance',    color: '#374151' },
  { name: 'Meta AI',       company: 'Meta',         color: '#1d4ed8' },
  { name: 'Google AI',     company: 'Google',       color: '#dc2626' },
  { name: 'Apple AI',      company: 'Apple',        color: '#9ca3af' },
  { name: 'Bingbot',       company: 'Microsoft',    color: '#0ea5e9' },
  { name: 'DuckDuckBot',   company: 'DuckDuckGo',   color: '#f97316' },
  { name: 'YandexBot',     company: 'Yandex',       color: '#ef4444' },
  { name: 'PetalBot',      company: 'Huawei',       color: '#eab308' },
  { name: 'Amazonbot',     company: 'Amazon',       color: '#f59e0b' },
  { name: 'CCBot',         company: 'Common Crawl', color: '#ea580c' },
  { name: 'Cohere',        company: 'Cohere',       color: '#14b8a6' },
  { name: 'YouBot',        company: 'You.com',      color: '#3b82f6' },
];

function timeAgo(iso: string | null): string {
  if (!iso) return 'Awaiting';
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface Props {
  botBreakdown: BotStat[];
}

export default function BotGrid({ botBreakdown }: Props) {
  // Merge live data into canonical list
  const stats = new Map(botBreakdown.map((b) => [b.name, b]));

  return (
    <section className="w-full max-w-5xl">
      <h2 className="mb-2 text-center text-3xl font-bold text-white">
        Live <span className="gradient-text">AI Crawler</span> Activity
      </h2>
      <p className="mb-8 text-center text-sm text-gray-400">
        Live AI crawler tracking. Auto-refreshes every 60 seconds.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {CANONICAL_BOTS.map((bot) => {
          const live = stats.get(bot.name);
          const count24h  = live?.count24h  ?? 0;
          const lastSeen  = live?.lastSeenAt ?? null;
          const awaiting  = count24h === 0;

          return (
            <div
              key={bot.name}
              className="card-glow rounded-2xl border border-[#374151] bg-[#111827] p-4 flex items-start gap-3 transition-shadow"
            >
              {/* Avatar */}
              <div
                className="mt-0.5 h-10 w-10 shrink-0 rounded-full"
                style={{ background: `radial-gradient(circle at 35% 35%, ${bot.color}cc, ${bot.color}55)` }}
              />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white text-sm truncate">{bot.name}</div>
                <div className="text-xs text-gray-400">{bot.company}</div>
                <div className="text-xs text-gray-500 mt-0.5">{timeAgo(lastSeen)}</div>
              </div>

              {/* Count */}
              <div className="text-right shrink-0">
                {awaiting ? (
                  <span className="text-xs text-gray-500">Awaiting...</span>
                ) : (
                  <>
                    <div className="text-xl font-bold text-[#00ff88]">{count24h.toLocaleString()}</div>
                    <div className="text-xs text-[#00ff88]">+{count24h} today</div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
