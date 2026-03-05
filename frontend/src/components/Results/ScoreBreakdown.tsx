'use client';

import type { ScanPollResult } from '@/lib/api';

function scoreColor(score: number): string {
  if (score >= 80) return '#00ff88';
  if (score >= 60) return '#eab308';
  if (score >= 40) return '#f97316';
  return '#ef4444';
}

interface CategoryRowProps {
  icon: string;
  label: string;
  score: number;
  pass: boolean;
  passMsg: string;
  failMsg: string;
  gainPts?: string;
}

function CategoryRow({ icon, label, score, pass, passMsg, failMsg, gainPts }: CategoryRowProps) {
  const color = scoreColor(score);
  return (
    <div className="flex items-start gap-4 py-4 border-b border-[#1f2937] last:border-0">
      {/* Icon */}
      <span className="text-xl mt-0.5 shrink-0">{icon}</span>

      {/* Score + Label */}
      <div className="w-32 shrink-0">
        <span className="text-2xl font-bold" style={{ color }}>{score}</span>
        <span className="ml-2 font-semibold text-white">{label}</span>
      </div>

      {/* Status */}
      <div className="flex-1">
        <div className={`text-sm ${pass ? 'text-gray-300' : 'text-red-400'}`}>
          {pass ? `✅ ${passMsg}` : `❌ ${failMsg}`}
        </div>
        {!pass && gainPts && (
          <div className="mt-1 text-xs text-[#a855f7]">
            Complete Step 1 for instant {gainPts} →
          </div>
        )}
      </div>
    </div>
  );
}

interface Props {
  result: ScanPollResult;
}

export default function ScoreBreakdown({ result }: Props) {
  const scan = result.latestScan;
  if (!scan) return null;

  // 5 display categories (grouped from 8 raw checks)
  const pageInfoScore = Math.round((scan.scoreMetaDesc + scan.scoreFaqSchema) / 2);

  const categories: CategoryRowProps[] = [
    {
      icon:     '🤖',
      label:    'AI Search',
      score:    scan.scoreLlmsTxt,
      pass:     scan.hasLlmsTxt,
      passMsg:  'AI crawlers can discover your structured data',
      failMsg:  "ChatGPT, Perplexity can't find you",
      gainPts:  '+20pts',
    },
    {
      icon:     '📋',
      label:    'Business ID',
      score:    scan.scoreJsonLd,
      pass:     scan.hasJsonLd,
      passMsg:  'AI knows your business type',
      failMsg:  'No business schema detected',
      gainPts:  '+20pts',
    },
    {
      icon:     '📱',
      label:    'Social Share',
      score:    scan.scoreOgTags,
      pass:     scan.hasOgTags,
      passMsg:  'LINE/FB shares show image & title',
      failMsg:  'Open Graph tags missing',
      gainPts:  '+15pts',
    },
    {
      icon:     '✏️',
      label:    'Page Info',
      score:    pageInfoScore,
      pass:     scan.hasMetaDesc && scan.hasFaqSchema,
      passMsg:  'Description and FAQ detected',
      failMsg:  scan.hasMetaDesc ? 'Description too short or no FAQ' : 'No meta description',
      gainPts:  '+10pts',
    },
    {
      icon:     '⚙️',
      label:    'Contact Info',
      score:    scan.scoreContact,
      pass:     scan.hasPhone || scan.hasEmail,
      passMsg:  `${[scan.hasPhone && 'Phone', scan.hasEmail && 'Email', scan.hasAddress && 'Address'].filter(Boolean).join(' & ')} found`,
      failMsg:  'No contact info detected',
      gainPts:  '+4pts',
    },
  ];

  return (
    <div className="w-full max-w-2xl rounded-2xl border border-[#374151] bg-[#111827] overflow-hidden">
      {/* Header */}
      <div className="border-b border-[#374151] px-6 py-4 text-center">
        <span className="font-semibold text-white">📊 Score Breakdown</span>
      </div>

      <div className="px-6">
        {categories.map((cat) => (
          <CategoryRow key={cat.label} {...cat} />
        ))}
      </div>
    </div>
  );
}
