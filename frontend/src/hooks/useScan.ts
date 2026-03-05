'use client';

import { useState, useRef, useCallback } from 'react';
import { postScan, pollScan, type ScanPollResult } from '@/lib/api';

export type ScanPhase = 'idle' | 'scanning' | 'complete' | 'failed';

export interface UseScanReturn {
  phase: ScanPhase;
  result: ScanPollResult | null;
  error: string | null;
  startScan: (url: string) => void;
  reset: () => void;
}

export function useScan(): UseScanReturn {
  const [phase, setPhase]   = useState<ScanPhase>('idle');
  const [result, setResult] = useState<ScanPollResult | null>(null);
  const [error, setError]   = useState<string | null>(null);
  const pollRef             = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const startScan = useCallback(async (url: string) => {
    stopPolling();
    setPhase('scanning');
    setResult(null);
    setError(null);

    let websiteId: string;
    try {
      const init = await postScan(url);
      websiteId = init.websiteId;
    } catch (e) {
      setError((e as Error).message);
      setPhase('failed');
      return;
    }

    // Poll every 2 seconds
    pollRef.current = setInterval(async () => {
      try {
        const poll = await pollScan(websiteId);
        if (poll.status === 'COMPLETE') {
          stopPolling();
          setResult(poll);
          setPhase('complete');
        } else if (poll.status === 'FAILED') {
          stopPolling();
          setError('Scan failed. Please try again.');
          setPhase('failed');
        }
        // else still SCANNING — keep polling
      } catch {
        // transient error — keep polling
      }
    }, 2000);
  }, []);

  const reset = useCallback(() => {
    stopPolling();
    setPhase('idle');
    setResult(null);
    setError(null);
  }, []);

  return { phase, result, error, startScan, reset };
}
