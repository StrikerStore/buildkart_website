'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MessageCircleQuestion } from 'lucide-react';
import { ABOVE_BUY_BAR } from '@/components/cart/cart-bar';
import type { Locale } from '@/lib/i18n';
import { AssistPanel } from './assist-panel';

/**
 * Pages where it would get in the way: paying, signing in, a printable page, a
 * chat with its own composer at the bottom, the map, and the quote page it
 * would only link back to.
 */
const HIDE_ON = ['/cart', '/checkout', '/login', '/invoice', '/support', '/location', '/quote'];

/**
 * The bottom-right button that opens Help, Contact us and Get a quote.
 *
 * Its height on a phone comes from `.assist-fab` in globals.css: it stacks above
 * the cart capsule and the buy bar, because a three-faced capsule leaves no room
 * beside it at 360px.
 *
 * `bg-ink` rather than a brand colour: the design tokens keep yellow for price
 * and green for spending money, and this does neither.
 */
export function AssistButton({
  locale,
  supportPhone,
  whatsapp,
  customer,
}: {
  locale: Locale;
  supportPhone: string | null;
  whatsapp: string | null;
  customer: { name: string | null; phone: string } | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Arriving somewhere closes it, or the sheet survives the client-side
  // transition and covers the page it was asked to open.
  useEffect(() => setOpen(false), [pathname]);

  const matches = (paths: string[]) =>
    paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  if (matches(HIDE_ON)) return null;

  const label = locale === 'hi' ? 'मदद और कोटेशन' : 'Help & quote';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-above-buy-bar={matches(ABOVE_BUY_BAR)}
        className="assist-fab fixed right-3 z-[35] flex size-12 items-center justify-center gap-2 rounded-pill bg-ink text-ink-inverted shadow-raised print:hidden md:right-6 md:bottom-6 md:size-auto md:h-13 md:px-5"
      >
        <MessageCircleQuestion className="size-6 shrink-0" aria-hidden />
        <span className="hidden text-cta2 md:inline">{label}</span>
      </button>

      {/* A sibling of the button, not a child, so the sheet is not caught in the
          button's stacking context. */}
      {open && (
        <AssistPanel
          locale={locale}
          supportPhone={supportPhone}
          whatsapp={whatsapp}
          customer={customer}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
