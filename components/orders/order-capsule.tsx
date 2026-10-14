'use client';

import Link from 'next/link';
import { ChevronRight, Clock, Truck } from 'lucide-react';
import type { MyActiveDeliveryDto } from '@StrikerStore/contract';
import { cn } from '@/lib/cn';
import type { Locale } from '@/lib/i18n';
import { clockParts, readPromise, useNow } from './delivery-countdown';

/**
 * An order on its way, counting down — the floating cart capsule's shape, for
 * the home screen.
 *
 * Ink rather than the cart's green: the two sit side by side in the same bar,
 * and they should read as siblings, never as the same button. The words come
 * from the order page's own countdown (`readPromise`), so the capsule and the
 * page it opens cannot disagree about when the lorry arrives.
 *
 * **Held to the cart capsule's width** when the two share the bar, so the rail
 * reads as one row of equal pills. That leaves about "View cart" worth of room
 * for words, which is why it says two short things, small over large —
 * "Arriving in" over the ticking clock — and leaves the order number and the
 * full sentence to its accessible name and the page it opens. The cart's width
 * is a floor, not a cap: should the clock ever need more room, the capsule
 * grows a little rather than cutting a countdown off with an ellipsis.
 */
export function OrderCapsule({
  order,
  locale,
  matchWidth,
  hidden,
}: {
  order: MyActiveDeliveryDto;
  locale: Locale;
  /** The cart capsule's width in px, to match. Null sizes it to its content. */
  matchWidth: number | null;
  /** Leaving: out of the tab order and the accessibility tree. */
  hidden: boolean;
}) {
  const hi = locale === 'hi';
  const now = useNow();
  const { waiting, remaining, time, day } = readPromise(order.delivery, now, hi);
  const Icon = order.delivery.kind === 'SCHEDULED' ? Truck : Clock;

  const counting = remaining !== null && !waiting && remaining > 0;
  const overdue = remaining !== null && !waiting && remaining <= 0;
  const [label, value] = counting
    ? [hi ? 'पहुँचने में' : 'Arriving in', clock(remaining)]
    : overdue
      ? [hi ? 'डिलीवरी' : 'Arriving', hi ? 'अभी' : 'Now']
      : // Not counting yet: a next-morning order overnight says when, not how long.
        [hi ? day : `${day.charAt(0).toUpperCase()}${day.slice(1)} by`, time];

  return (
    <Link
      href={`/account/orders/${order.id}`}
      tabIndex={hidden ? -1 : undefined}
      aria-hidden={hidden || undefined}
      // A name that does not change every second: the ticking clock is for
      // the eye, and a screen reader re-announcing it would be noise.
      aria-label={
        hi
          ? `ऑर्डर ${order.orderNumber}, ${day} ${time} तक पहुँचेगा`
          : `Order ${order.orderNumber}, arriving by ${time} ${day}`
      }
      className="inline-flex h-14 max-w-full items-center gap-3 rounded-pill bg-ink py-1.5 pr-1.5 pl-2 text-ink-inverted shadow-sheet"
      style={matchWidth ? { minWidth: matchWidth } : undefined}
    >
      <span
        className="grid size-10 shrink-0 place-items-center rounded-full bg-surface text-ink"
        aria-hidden
      >
        <Icon className="size-[18px]" />
      </span>

      {/* Grows to the cart's width when held to it, so the arrow stays at the end. */}
      <span className={cn('min-w-0 pr-2 leading-tight', matchWidth && 'flex-1')}>
        <span className="block truncate text-body4 text-ink-inverted/75">{label}</span>
        <span className="block truncate text-heading5 tabular-nums">{value}</span>
      </span>

      <span
        className="grid size-11 shrink-0 place-items-center rounded-full bg-ink-inverted/15"
        aria-hidden
      >
        <ChevronRight className="size-5" />
      </span>
    </Link>
  );
}

/**
 * "3:12:05". No leading zero on the hours — that one digit is what lets the
 * clock fit a capsule held to the cart's width. Hours are not capped: a time
 * the shop gave can be a day out.
 */
function clock(ms: number): string {
  const { hours, minutes, seconds } = clockParts(ms);
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${hours}:${pad(minutes)}:${pad(seconds)}`;
}
