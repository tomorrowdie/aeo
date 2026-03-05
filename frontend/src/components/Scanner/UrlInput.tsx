'use client';

import { useState, type FormEvent } from 'react';
import type { ScanPhase } from '@/hooks/useScan';

interface Props {
  phase: ScanPhase;
  onScan: (url: string) => void;
  onReset: () => void;
  defaultValue?: string;
}

export default function UrlInput({ phase, onScan, onReset, defaultValue = '' }: Props) {
  const [url, setUrl] = useState(defaultValue);
  const scanning = phase === 'scanning';

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!url.trim() || scanning) return;
    if (phase === 'complete' || phase === 'failed') {
      onReset();
    }
    onScan(url.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-2xl gap-3">
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://your-website.com"
        disabled={scanning}
        className="
          flex-1 rounded-xl border border-[#374151] bg-[#111827]
          px-5 py-4 text-white placeholder-gray-500
          outline-none transition-colors
          focus:border-[#a855f7] disabled:opacity-60
        "
      />
      <button
        type="submit"
        disabled={scanning || !url.trim()}
        className="
          min-w-[110px] rounded-xl bg-[#a855f7] px-6 py-4 font-semibold text-white
          transition-all hover:bg-[#9333ea] active:scale-95
          disabled:opacity-60 disabled:cursor-not-allowed
          flex items-center justify-center gap-2
        "
      >
        {scanning ? (
          <>
            <span className="live-dot" />
            Scanning
          </>
        ) : (
          'Scan'
        )}
      </button>
    </form>
  );
}
