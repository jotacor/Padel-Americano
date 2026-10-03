import { useEffect, useRef } from 'react';

/** Calls `fn` now and every `intervalMs` while the page is visible; right away when it becomes visible again */
export const usePolling = (fn: () => void, intervalMs: number, key: unknown) => {
  const latest = useRef(fn);
  latest.current = fn;

  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible') latest.current(); };
    latest.current();
    const interval = setInterval(tick, intervalMs);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [intervalMs, key]);
};
