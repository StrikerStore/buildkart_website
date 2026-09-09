'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { StorefrontAnnouncementsDto } from '@StrikerStore/contract';
import { cn } from '@/lib/cn';
import type { Locale } from '@/lib/i18n';

/**
 * The thin strip above the header, on every page.
 *
 * Fixed height and one line, which is what makes the text limit in the schema
 * load-bearing rather than fussy: a message that wrapped would push the header
 * down the page on a phone, and one that is allowed to be any length would
 * either wrap or be cut mid-word.
 *
 * It scrolls away rather than sticking. The header below it is the sticky part,
 * and two stacked sticky bars would cost a phone a fifth of its screen for the
 * whole session to say something that is read once.
 *
 * Every message is in the DOM at all times, stacked and faded between. A screen
 * reader therefore gets the full set in order, at the reader's own pace, and
 * there is no `aria-live` interrupting whatever the customer was doing every
 * few seconds to re-read a strip they have already heard.
 */
export function AnnouncementBar({
  bar,
  locale,
}: {
  bar: StorefrontAnnouncementsDto;
  locale: Locale;
}) {
  const { items, rotateSeconds } = bar;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  /*
   * Nothing runs for a single message, which is the common case — a lone
   * announcement should not cost a timer that fires forever on every page.
   */
  useEffect(() => {
    if (items.length < 2 || paused) return;

    const id = setInterval(
      () => setIndex((current) => (current + 1) % items.length),
      rotateSeconds * 1000,
    );
    return () => clearInterval(id);
  }, [items.length, rotateSeconds, paused]);

  if (items.length === 0) return null;

  const text = (item: { textEn: string; textHi: string }) =>
    locale === 'hi' && item.textHi ? item.textHi : item.textEn;

  return (
    <div
      /*
       * Hovering or tabbing into the bar stops the rotation. WCAG 2.2.2 asks
       * for a way to pause content that moves on its own, and on a strip this
       * size a visible pause button would take a third of the width to solve a
       * problem that pointing at it solves. It also fixes the more ordinary
       * annoyance: a message rotating away mid-click.
       */
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      /*
       * Charcoal text on the yellow, not white.
       *
       * White on #faae0a is 1.89:1 — unreadable, and the single easiest way to
       * fail a contrast audit with this palette. Charcoal is 6.76:1. It is the
       * same pairing the brand button uses, and for the same reason.
       */
      className="relative h-8 overflow-hidden bg-brand text-brand-foreground print:hidden"
    >
      {items.map((item, i) => {
        const label = text(item);
        const shown = i === index;

        return (
          <div
            key={`${item.url}-${label}`}
            aria-hidden={!shown}
            className={cn(
              'absolute inset-0 flex items-center justify-center px-4 transition-opacity duration-500 motion-reduce:transition-none',
              shown ? 'opacity-100' : 'pointer-events-none opacity-0',
            )}
          >
            {item.url ? (
              <Link
                href={item.url}
                // Not focusable while faded out, or a keyboard user would tab
                // into a message nobody can see.
                tabIndex={shown ? undefined : -1}
                className="truncate text-body4 underline-offset-2 hover:underline"
              >
                {label}
              </Link>
            ) : (
              <span className="truncate text-body4">{label}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
