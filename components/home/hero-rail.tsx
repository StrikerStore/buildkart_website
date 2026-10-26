'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/** How long each banner stays before the next slides in. The owner's choice. */
const ADVANCE_MS = 3000;

/**
 * The hero's rail, advancing itself every three seconds.
 *
 * Only the movement lives here. The slides are rendered on the server and
 * passed in as children, and this moves the same CSS scroll-snap rail a thumb
 * moves — so swiping works exactly as it did, and a page whose script has not
 * loaded yet still shows every banner.
 *
 * A hero that moves on its own can swap the offer out from under a thumb
 * already travelling toward it, so it holds still whenever someone is using
 * it: a finger on it, a mouse over it, keyboard focus inside it, or the tab in
 * the background. After a swipe it carries on from wherever the shopper left
 * it, three seconds after they let go. Someone who has asked their phone for
 * reduced motion gets a still hero they swipe themselves.
 */
export function HeroRail({ count, children }: { count: number; children: ReactNode }) {
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail || count < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let timer: number | undefined;
    /*
     * Why it is holding still, by source. Separate reasons rather than one flag,
     * so the mouse leaving does not restart a rail that still has keyboard
     * focus inside it.
     */
    const holds = new Set<'touch' | 'hover' | 'focus'>();

    const slides = () => Array.from(rail.children) as HTMLElement[];

    /** The banner currently in view: slides are full-width, so it is a division. */
    const currentIndex = (all: HTMLElement[]) => {
      const step = all[1]!.offsetLeft - all[0]!.offsetLeft;
      return step > 0 ? Math.round(rail.scrollLeft / step) : 0;
    };

    /*
     * Banners after the first are lazy-loaded, so without this the next one can
     * slide in as an empty box on a slow connection. Asking for it a full three
     * seconds early gives it time to arrive.
     */
    const warmUp = (slide: HTMLElement | undefined) => {
      slide?.querySelectorAll('img').forEach((img) => {
        img.loading = 'eager';
      });
    };

    const stop = () => {
      window.clearTimeout(timer);
      timer = undefined;
    };

    const advance = () => {
      const all = slides();
      const next = (currentIndex(all) + 1) % all.length;
      // Into the rail's own scroll position, never `scrollIntoView` — that
      // would also drag the page back up to the hero if the shopper had
      // scrolled past it.
      rail.scrollTo({ left: all[next]!.offsetLeft - all[0]!.offsetLeft, behavior: 'smooth' });
      schedule(next);
    };

    const schedule = (from = currentIndex(slides())) => {
      stop();
      if (holds.size > 0 || document.hidden) return;
      const all = slides();
      warmUp(all[(from + 1) % all.length]);
      timer = window.setTimeout(advance, ADVANCE_MS);
    };

    const hold = (reason: 'touch' | 'hover' | 'focus') => {
      holds.add(reason);
      stop();
    };
    const release = (reason: 'touch' | 'hover' | 'focus') => {
      holds.delete(reason);
      schedule();
    };

    /*
     * Touch events, not pointer events, for the finger: once the browser takes
     * over a swipe it cancels the pointer, which would read as "let go" while
     * the finger is still down. `touchend` waits for the lift.
     */
    const onTouchStart = () => hold('touch');
    const onTouchEnd = () => release('touch');
    /*
     * Hover from a real mouse only. A tap on a phone also fires emulated mouse
     * events, and a "mouse" that never leaves would stop the hero for good.
     */
    const onPointerEnter = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') hold('hover');
    };
    const onPointerLeave = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') release('hover');
    };
    const onFocusIn = () => hold('focus');
    const onFocusOut = (event: FocusEvent) => {
      if (!rail.contains(event.relatedTarget as Node | null)) release('focus');
    };
    const onVisibility = () => (document.hidden ? stop() : schedule());

    rail.addEventListener('touchstart', onTouchStart, { passive: true });
    rail.addEventListener('touchend', onTouchEnd, { passive: true });
    rail.addEventListener('touchcancel', onTouchEnd, { passive: true });
    rail.addEventListener('pointerenter', onPointerEnter);
    rail.addEventListener('pointerleave', onPointerLeave);
    rail.addEventListener('focusin', onFocusIn);
    rail.addEventListener('focusout', onFocusOut);
    document.addEventListener('visibilitychange', onVisibility);

    schedule(0);

    return () => {
      stop();
      rail.removeEventListener('touchstart', onTouchStart);
      rail.removeEventListener('touchend', onTouchEnd);
      rail.removeEventListener('touchcancel', onTouchEnd);
      rail.removeEventListener('pointerenter', onPointerEnter);
      rail.removeEventListener('pointerleave', onPointerLeave);
      rail.removeEventListener('focusin', onFocusIn);
      rail.removeEventListener('focusout', onFocusOut);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [count]);

  return (
    <div ref={railRef} className="rail flex gap-3 rounded-card">
      {children}
    </div>
  );
}
