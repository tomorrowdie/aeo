'use client';

import { useState } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  code: string;
  points?: string;
}

export default function CodeBlock({ title, subtitle, code, points }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="rounded-2xl border border-[#374151] bg-[#111827] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#374151] px-5 py-3">
        <div>
          <div className="flex items-center gap-2 font-semibold text-white">
            <span>{title}</span>
            {points && (
              <span className="rounded-lg border border-[#00ff88] px-2 py-0.5 text-xs text-[#00ff88]">
                {points}
              </span>
            )}
          </div>
          {subtitle && <div className="mt-0.5 text-xs text-gray-400">{subtitle}</div>}
        </div>
      </div>

      {/* Code */}
      <div className="overflow-x-auto bg-[#0d0f1a] p-5 font-mono text-xs leading-relaxed text-gray-300 max-h-64 overflow-y-auto">
        <pre className="whitespace-pre-wrap break-words">{code}</pre>
      </div>

      {/* Copy button */}
      <div className="flex justify-center border-t border-[#374151] py-3">
        <button
          onClick={handleCopy}
          className="rounded-lg border border-[#374151] px-4 py-1.5 text-sm text-gray-300 hover:border-[#00ff88] hover:text-[#00ff88] transition-colors"
        >
          {copied ? '✅ Copied!' : '📋 複製'}
        </button>
      </div>
    </div>
  );
}
