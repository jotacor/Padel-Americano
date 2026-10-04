import { useEffect } from 'react';

// TV screens: when the page is taller than the screen it scrolls by itself. Pause at the top,
// slow scroll down, pause at the bottom, quick scroll back up, and again. Touching the page
// (wheel, touch, keys, click) pauses it for a while.
const DOWN_SPEED = 40; // px/s, readable from a distance
const UP_SPEED = 800; // px/s
const PAUSE_MS = 4000;
const USER_PAUSE_MS = 15000;

export const useAutoScroll = (enabled: boolean) => {
  useEffect(() => {
    if (!enabled) return;
    let phase: 'top' | 'down' | 'bottom' | 'up' = 'top';
    let phaseStart = performance.now();
    let last = phaseStart;
    let pos = window.scrollY;
    let userUntil = 0;
    let raf = 0;
    const setPhase = (p: typeof phase, now: number) => { phase = p; phaseStart = now; };
    const onUser = () => { userUntil = performance.now() + USER_PAUSE_MS; };

    const tick = (now: number) => {
      const dt = Math.min(now - last, 100) / 1000; // big gaps (hidden tab) don't jump
      last = now;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (now < userUntil) {
        pos = window.scrollY; // continue from wherever the user left it
      } else if (max <= 1) {
        pos = 0;
        setPhase('top', now);
      } else {
        pos = Math.min(pos, max); // the list may have shrunk
        if (phase === 'top' && now - phaseStart >= PAUSE_MS) setPhase('down', now);
        else if (phase === 'bottom' && now - phaseStart >= PAUSE_MS) setPhase('up', now);
        else if (phase === 'down') {
          pos = Math.min(max, pos + DOWN_SPEED * dt);
          if (pos >= max) setPhase('bottom', now);
          window.scrollTo(0, pos);
        } else if (phase === 'up') {
          pos = Math.max(0, pos - UP_SPEED * dt);
          if (pos <= 0) setPhase('top', now);
          window.scrollTo(0, pos);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const events = ['wheel', 'touchstart', 'keydown', 'mousedown'] as const;
    events.forEach(e => window.addEventListener(e, onUser, { passive: true }));
    return () => {
      cancelAnimationFrame(raf);
      events.forEach(e => window.removeEventListener(e, onUser));
    };
  }, [enabled]);
};
