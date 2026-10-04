import { useCallback, useEffect, useRef, useState } from 'react';
import type { Tournament } from '../types.ts';

// Organizer side of live sharing: create/delete the share and keep it in sync with the tournament.

const STORAGE_KEY = 'padel_share_state';
const DEBOUNCE_MS = 1200; // also keeps under KV's ~1 write/second per key
const RETRY_DELAYS_S = [2, 5, 15, 30];

export interface Share {
  shareId: string;
  pin: string; // write token (never shown)
  shareUrl: string;
  tournamentId?: string; // the tournament this link shows (legacy saves: bound on load)
}
export type SyncStatus = 'synced' | 'syncing' | 'retrying';
export type ShareEnd = 'expired' | 'revoked';

/** What to do after a sync PUT, by HTTP status (0 = network error) */
export const syncOutcome = (status: number): 'ok' | ShareEnd | 'retry' => {
  if (status >= 200 && status < 300) return 'ok';
  if (status === 404) return 'expired';
  if (status === 401 || status === 403) return 'revoked';
  return 'retry';
};

export const retryDelayMs = (attempt: number) => RETRY_DELAYS_S[Math.min(attempt, RETRY_DELAYS_S.length - 1)] * 1000;

const loadShare = (): Share | null => {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!v?.isSharing || !v.shareId || !v.pin) return null;
    return { shareId: v.shareId, pin: v.pin, shareUrl: v.shareUrl || `${window.location.origin}/game/${v.shareId}`, tournamentId: v.tournamentId };
  } catch {
    return null;
  }
};

const saveShare = (s: Share | null) => {
  try {
    if (s) localStorage.setItem(STORAGE_KEY, JSON.stringify({ isSharing: true, ...s }));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage unavailable: sharing still works for this session
  }
};

export const useShareSync = (tournament: Tournament | null) => {
  const [share, setShareState] = useState<Share | null>(loadShare);
  const [status, setStatus] = useState<SyncStatus>('synced');
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [creating, setCreating] = useState(false);
  const [ended, setEnded] = useState<ShareEnd | null>(null);

  // Latest values for the async sync loop
  const shareRef = useRef(share);
  const latest = useRef(tournament);
  const version = useRef(0); // bumps on every tournament change
  const sentVersion = useRef(0); // last version the server confirmed
  const inFlight = useRef(false); // one PUT at a time, so an older one can't land last
  const attempt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const setShare = useCallback((s: Share | null) => {
    shareRef.current = s;
    setShareState(s);
    saveShare(s);
  }, []);

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    const s = shareRef.current, t = latest.current;
    if (!s || !t || inFlight.current || sentVersion.current === version.current) return;
    if (s.tournamentId && s.tournamentId !== t.id) return; // the link shows another tournament
    const v = version.current;
    inFlight.current = true;
    setStatus('syncing');
    let code = 0;
    try {
      const res = await fetch(`/api/game/${s.shareId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Tournament-Pin': s.pin },
        body: JSON.stringify({ tournament: t }),
      });
      code = res.status;
    } catch {
      code = 0;
    }
    inFlight.current = false;
    if (shareRef.current?.shareId !== s.shareId) return; // stopped meanwhile

    const outcome = syncOutcome(code);
    if (outcome === 'ok') {
      sentVersion.current = Math.max(sentVersion.current, v);
      attempt.current = 0;
      setLastSynced(new Date());
      if (sentVersion.current !== version.current) timer.current = setTimeout(flush, DEBOUNCE_MS);
      else setStatus('synced');
    } else if (outcome === 'retry') {
      setStatus('retrying');
      timer.current = setTimeout(flush, retryDelayMs(attempt.current++));
    } else {
      setShare(null);
      setStatus('synced');
      setEnded(outcome);
    }
  }, [setShare]);

  // Every tournament change → sync after a short pause
  useEffect(() => {
    latest.current = tournament;
    if (!tournament) return;
    if (shareRef.current && !shareRef.current.tournamentId) setShare({ ...shareRef.current, tournamentId: tournament.id });
    version.current++;
    if (!shareRef.current) {
      sentVersion.current = version.current;
      return;
    }
    clearTimeout(timer.current);
    if (!inFlight.current) timer.current = setTimeout(flush, DEBOUNCE_MS);
  }, [tournament, flush, setShare]);

  // Back online / back to the tab → retry right away
  useEffect(() => {
    const kick = () => {
      if (document.visibilityState === 'visible' && sentVersion.current !== version.current) {
        attempt.current = 0;
        flush();
      }
    };
    window.addEventListener('online', kick);
    document.addEventListener('visibilitychange', kick);
    return () => {
      window.removeEventListener('online', kick);
      document.removeEventListener('visibilitychange', kick);
      clearTimeout(timer.current);
    };
  }, [flush]);

  /** Create a share for `t`; false if the server failed */
  const start = useCallback(async (t: Tournament): Promise<boolean> => {
    setCreating(true);
    try {
      const res = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournament: t }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { id: string; pin: string };
      sentVersion.current = version.current;
      attempt.current = 0;
      setShare({ shareId: data.id, pin: data.pin, shareUrl: `${window.location.origin}/game/${data.id}`, tournamentId: t.id });
      setLastSynced(new Date());
      setStatus('synced');
      setEnded(null);
      return true;
    } catch (e) {
      console.error('Failed to start sharing:', e);
      return false;
    } finally {
      setCreating(false);
    }
  }, [setShare]);

  /** Stop sharing and delete the link (viewers see "not found") */
  const end = useCallback(async () => {
    const s = shareRef.current;
    clearTimeout(timer.current);
    setShare(null);
    setStatus('synced');
    setLastSynced(null);
    if (!s) return;
    try {
      await fetch(`/api/game/${s.shareId}`, { method: 'DELETE', headers: { 'X-Tournament-Pin': s.pin } });
    } catch (e) {
      console.error('Failed to delete shared game:', e);
    }
  }, [setShare]);

  const retry = useCallback(() => {
    attempt.current = 0;
    flush();
  }, [flush]);

  const dismissEnded = useCallback(() => setEnded(null), []);

  return { share, status, lastSynced, creating, ended, start, end, retry, dismissEnded };
};
