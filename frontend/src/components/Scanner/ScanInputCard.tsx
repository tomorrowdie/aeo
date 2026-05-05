'use client';

import { useState, type FormEvent } from 'react';
import type { ScanPhase } from '@/hooks/useScan';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/hooks/useLanguage';
import { normalizeUrl } from '@/lib/normalizeUrl';

interface Props {
  phase: ScanPhase;
  onScan: (url: string) => void;
  onReset: () => void;
  defaultValue?: string;
  error?: string | null;
}

export default function ScanInputCard({ phase, onScan, onReset, defaultValue = '', error }: Props) {
  const [url, setUrl] = useState(defaultValue);
  const [localError, setLocalError] = useState<string | null>(null);
  const { t } = useLanguage();
  const scanning = phase === 'scanning';

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);
    if (!url.trim() || scanning) return;

    let normalized = url.trim();
    try {
      normalized = normalizeUrl(normalized);
    } catch {
      setLocalError(t.errorInvalidUrl);
      return;
    }

    if (phase === 'complete' || phase === 'failed') {
      onReset();
    }
    onScan(normalized);
  }

  return (
    <div className="flex flex-col w-full max-w-2xl gap-2">
      <form onSubmit={handleSubmit} className="flex w-full gap-3">
        <Input
          type="text"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setLocalError(null);
          }}
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
      {/* Helper Text / Local Error */}
      {localError ? (
        <p className="text-sm text-red-400 pl-1">{localError}</p>
      ) : (
        <p className="text-sm text-gray-500 pl-1">{t.inputHelper}</p>
      )}
      {scanning && (
        <p className="text-sm text-gray-400 pl-1 mt-1 text-center sm:text-left">
          Scanning: <span className="text-[#a855f7]">{normalizeUrl(url).substring(0, 50)}</span>
        </p>
      )}
    </div>
  );
}
