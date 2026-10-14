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
 */
export function OrderCapsule({
  order,
  locale,
  wide,
  hidden,
}: {
  order: MyActiveDeliveryDto;
  locale: Locale;
  /** Filling a slot in the scrolling bar, rather than sized to its content. */
  wide: boolean;
  /** Leaving: out of the tab order and the accessibility tree. */
  hidden: boolean;
}) {
  const hi = locale === 'hi';
  const now = useNow();
  const { waiting, remaining, time, day } = readPromise(order.delivery, now, hi);
  const Icon = order.delivery.kind === 'SCHEDULED' ? Truck : Clock;
  const by = hi ? `${day} ${time} तक` : `by ${time} ${day}`;

  const counting = remaining !== null && !waiting && remaining > 0;
  const overdue = remaining !== null && !waiting && remaining <= 0;
  const title = counting
    ? hi
      ? `${clock(remaining)} में पहुँचेगा`
      : `Arriving in ${clock(remaining)}`
    : overdue
      ? hi
        ? 'बस पहुँचने ही वाला है'
        : 'Arriving any moment now'
      : hi
        ? `${day} ${time} तक पहुँचेगा`
        : `Arriving by ${time} ${day}`;

  return (
    <Link
      href={`/account/orders/${order.id}`}
      tabIndex={hidden ? -1 : undefined}
      aria-hidden={hidden || undefined}
      // A name that does not change every second: the ticking title is for
      // the eye, and a screen reader re-announcing it would be noise.
      aria-label={
        hi
          ? `ऑर्डर ${order.orderNumber}, ${day} ${time} तक पहुँचेगा`
          : `Order ${order.orderNumber}, arriving by ${time} ${day}`
      }
      className={cn(
        'h-14 items-center gap-3 rounded-pill bg-ink py-1.5 pr-1.5 pl-2 text-ink-inverted shadow-sheet',
        wide ? 'flex w-full' : 'inline-flex max-w-full',
      )}
    >
      <span
        className="grid size-10 shrink-0 place-items-center rounded-full bg-surface text-ink"
        aria-hidden
      >
        <Icon className="size-[18px]" />
      </span>

      <span className={cn('min-w-0 pr-2 leading-tight', wide && 'flex-1')}>
        <span className="block truncate text-heading5 tabular-nums">{title}</span>
        <span className="block truncate text-body4 text-ink-inverted/75">
          {counting ? `${order.orderNumber} · ${by}` : order.orderNumber}
        </span>
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

/** "03:12:05". Hours are not capped: a time the shop gave can be a day out. */
function clock(ms: number): string {
  const { hours, minutes, seconds } = clockParts(ms);
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
}
