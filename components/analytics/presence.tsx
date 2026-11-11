'use client';

import { useEffect } from 'react';
import { recordVisit } from '@/lib/visit';

/** How often an open, visible tab says "still here". */
const BEAT_MS = 30_000;
/** No tap, key or scroll for this long, and the tab stops saying it. */
const IDLE_MS = 30 * 60_000;

/**
 * Keeps the shopper's session fresh while they are actually here, so the
 * admin's "Live now" count is right to within a minute.
 *
 * Every 30 seconds while the tab is visible, one tiny `heartbeat` goes to the
 * same first-party beacon as page views (`recordVisit`, which checks for a yes
 * to analytics itself). Nothing while the tab is hidden or the phone is locked,
 * and nothing after half an hour without any activity, so a forgotten tab does
 * not count as a visitor or cost the API anything.
 *
 * Coming back to the tab counts as activity and says "still here" at once.
 */
export function Presence() {
  useEffect(() => {
    let lastActivity = Date.now();
    const active = () => {
      lastActivity = Date.now();
    };

    const beat = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastActivity > IDLE_MS) return;
      recordVisit('heartbeat');
    };

    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      active();
      beat();
    };

    const activity = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const;
    for (const name of activity) window.addEventListener(name, active, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    const timer = window.setInterval(beat, BEAT_MS);

    return () => {
      for (const name of activity) window.removeEventListener(name, active);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(timer);
    };
  }, []);

  return null;
}
