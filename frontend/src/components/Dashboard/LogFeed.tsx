'use client';

import type { LogEntry } from '@/lib/api';

// Bot → dot color (matches BotGrid)
const BOT_COLORS: Record<string, string> = {
  GPTBot:        '#22c55e',
  ChatGPT:       '#16a34a',
  ClaudeBot:     '#a855f7',
  PerplexityBot: '#6366f1',
  Bytespider:    '#374151',
  'Meta AI':     '#1d4ed8',
  'Google AI':   '#dc2626',
  'Apple AI':    '#9ca3af',
  Bingbot:       '#0ea5e9',
  DuckDuckBot:   '#f97316',
  YandexBot:     '#ef4444',
  PetalBot:      '#eab308',
  Amazonbot:     '#f59e0b',
  CCBot:         '#ea580c',
  Cohere:        '#14b8a6',
  YouBot:        '#3b82f6',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

interface Props {
  logs: LogEntry[];
}

export default function LogFeed({ logs }: Props) {
  return (
    <section className="w-full max-w-5xl">
      <div className="rounded-2xl border border-[#374151] bg-[#111827] overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[#374151] px-5 py-3">
          <span className="text-base">🔗</span>
          <span className="font-semibold text-gray-200">最近造訪</span>
        </div>

        {logs.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-500">
            No crawler visits recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-[#1f2937]">
            {logs.map((log, i) => {
              const color = BOT_COLORS[log.bot] ?? '#6b7280';
              return (
                <div key={i} className="flex items-center gap-4 px-5 py-3 hover:bg-[#1f2937] transition-colors">
                  {/* Bot name + dot */}
                  <div className="flex items-center gap-2 w-32 shrink-0">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ background: color }}
                    />
                    <span className="font-semibold text-sm text-white truncate">{log.bot}</span>
                  </div>

                  {/* Path */}
                  <div className="flex-1 text-sm text-gray-400 truncate font-mono">
                    {log.path}
                  </div>

                  {/* Status badge */}
                  <div>
                    <span
                      className="rounded px-2 py-0.5 text-xs font-mono font-bold"
                      style={{
                        background: log.status === 200 ? '#052e16' : '#450a0a',
                        color:      log.status === 200 ? '#00ff88' : '#f87171',
                      }}
                    >
                      {log.status}
                    </span>
                  </div>

                  {/* Time */}
                  <div className="text-xs text-gray-500 w-20 text-right shrink-0">
                    {timeAgo(log.ts)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
