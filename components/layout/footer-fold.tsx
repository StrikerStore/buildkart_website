'use client';

import { useId, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Locale } from '@/lib/i18n';

/**
 * The footer, folded away on a phone.
 *
 * A footer is the longest thing on a page and the least often wanted: address,
 * GSTIN, policy links and a copyright line, none of which a shopper scrolled
 * down to read. On a 360px screen that is most of a screenful standing between
 * the last product and the bottom of the page. Collapsed it is one row, and the
 * plus says there is more behind it.
 *
 * Desktop keeps the whole thing open. The room exists there, and a footer
 * nobody can see is a footer whose policy links nobody can find — which for the
 * pages a payment gateway checks before approving a merchant account is not a
 * cosmetic problem.
 *
 * The children stay mounted and are hidden with CSS rather than removed from
 * the tree. Two reasons: the links are in the HTML a crawler reads whatever the
 * fold is doing, and the desktop layout needs no hydration to appear — a footer
 * that popped in after JavaScript loaded would shift the page under a cursor
 * already on its way to a link.
 */
export function FooterFold({
  name,
  locale,
  children,
}: {
  name: string;
  locale: Locale;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  const hi = locale === 'hi';

  return (
    <>
      {/*
       * The whole row is the control, not just the icon. It is the shape
       * Blinkit uses and the reason is the thumb: a 24px plus in the corner of
       * a 360px screen is a target you miss, and missing it does nothing
       * visible, so it reads as a dead footer rather than a missed tap.
       */}
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={bodyId}
        className="flex w-full items-center justify-between gap-4 py-4 text-left md:hidden"
      >
        <span className="text-heading4 text-ink">{name}</span>
        <span className="grid size-6 shrink-0 place-items-center text-ink-muted">
          {open ? (
            <Minus className="size-5" aria-hidden />
          ) : (
            <Plus className="size-5" aria-hidden />
          )}
        </span>
        <span className="sr-only">
          {open
            ? hi
              ? 'फ़ुटर बंद करें'
              : 'Hide footer details'
            : hi
              ? 'फ़ुटर खोलें'
              : 'Show footer details'}
        </span>
      </button>

      <div id={bodyId} className={cn('pb-8 md:block md:pb-0', open ? 'block' : 'hidden')}>
        {children}
      </div>
    </>
  );
}
