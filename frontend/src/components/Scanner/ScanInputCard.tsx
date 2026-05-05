'use client';

import { useState, type FormEvent } from 'react';
import type { ScanPhase } from '@/hooks/useScan';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/hooks/useLanguage';

interface Props {
  phase: ScanPhase;
  onScan: (url: string) => void;
  onReset: () => void;
  defaultValue?: string;
}

export default function ScanInputCard({ phase, onScan, onReset, defaultValue = '' }: Props) {
  const [url, setUrl] = useState(defaultValue);
  const { t } = useLanguage();
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
      <Input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder={t.inputPlaceholder}
        disabled={scanning}
        required
        className="flex-1 h-14 bg-[#111827] border-[#374151] text-white text-base rounded-xl placeholder:text-gray-500 focus-visible:ring-[#a855f7]"
      />
      <Button
        type="submit"
        disabled={scanning || !url.trim()}
        className="h-14 px-8 rounded-xl bg-[#a855f7] hover:bg-[#9333ea] text-white font-semibold flex items-center justify-center gap-2 transition-all active:scale-95"
      >
        {scanning ? (
          <>
            <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
            <span className="hidden sm:inline">...</span>
          </>
        ) : (
          t.submitButton
        )}
      </Button>
    </form>
  );
}
