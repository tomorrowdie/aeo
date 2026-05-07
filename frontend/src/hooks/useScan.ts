'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { postScan, pollScan, type ScanPollResult } from '@/lib/api';
import { useLanguage } from '@/hooks/useLanguage';

export type ScanPhase = 'idle' | 'scanning' | 'complete' | 'failed';

export interface UseScanReturn {
  phase: ScanPhase;
  result: ScanPollResult | null;
  error: string | null;
  startScan: (payload: string | Record<string, any>) => void;
  reset: () => void;
}

export function useScan(): UseScanReturn {
  const [phase, setPhase]   = useState<ScanPhase>('idle');
  const [result, setResult] = useState<ScanPollResult | null>(null);
  const [error, setError]   = useState<string | null>(null);
  const pollRef             = useRef<ReturnType<typeof setInterval> | null>(null);
  const { t } = useLanguage();

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // Ensure polling stops on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  const startScan = useCallback(async (payload: string | Record<string, any>) => {
    stopPolling();
    setPhase('scanning');
    setResult(null);
    setError(null);

    let websiteId: string;
    try {
      const init = await postScan(payload);
      websiteId = init.websiteId;
    } catch (e) {
      console.error('Scan init failed:', e);
      if (e instanceof TypeError) {
        // Network errors or CORS
        setError(t.errorNetwork);
      } else {
        // Backend returned a specific error or 500
        setError(t.errorFailed);
      }
      setPhase('failed');
      return;
    }

    // Poll every 3 seconds
    const startTime = Date.now();
    const TIMEOUT_MS = 120 * 1000;

    pollRef.current = setInterval(async () => {
      if (Date.now() - startTime > TIMEOUT_MS) {
        stopPolling();
        setError(t.errorTimeout);
        setPhase('failed');
        return;
      }

      try {
        const poll = await pollScan(websiteId);
        if (poll.status === 'COMPLETE') {
          stopPolling();
          setResult(poll);
          setPhase('complete');
        } else if (poll.status === 'FAILED') {
          stopPolling();
          console.error('Backend returned FAILED status for scan:', websiteId);
          setError(t.errorFailed);
          setPhase('failed');
        }
        // else still SCANNING — keep polling
      } catch (err) {
        console.error('Poll transient error:', err);
        // transient error — keep polling
      }
    }, 3000);
  }, [t, stopPolling]);

  const reset = useCallback(() => {
    stopPolling();
    setPhase('idle');
    setResult(null);
    setError(null);
  }, [stopPolling]);

  return { phase, result, error, startScan, reset };
}
