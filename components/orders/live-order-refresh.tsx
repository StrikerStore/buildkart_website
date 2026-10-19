'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { OrderStatus } from '@StrikerStore/contract';

/**
 * The statuses that can still change while the customer watches — including
 * part delivered, where the next load can go out at any moment.
 */
const OPEN: OrderStatus[] = [
  'PLACED',
  'CONFIRMED',
  'PACKED',
  'OUT_FOR_DELIVERY',
  'PARTIALLY_DELIVERED',
];

/**
 * Waiting on confirmation. It lands about a minute after placing, and with it
 * the timeline's next step and a countdown measured from the real moment.
 */
const PLACED_REFRESH_MS = 15_000;

/** On its way: packed, sent out, a revised time from the shop. */
const OPEN_REFRESH_MS = 30_000;

/**
 * Keeps an open order's page current without the customer pulling to refresh.
 *
 * Re-renders the page on the server on a timer, quicker while the order waits
 * on its confirmation, and straight away whenever the tab comes back into
 * view. On a phone that is the moment it matters: a customer switching back
 * from WhatsApp after the "out for delivery" message should see the driver's
 * time, not the one from before they left. Nothing is asked of the server
 * while the tab is hidden.
 *
 * `router.refresh` merges the new render in place, so the countdown keeps
 * ticking and the scroll stays put. Stops once the order is delivered or
 * cancelled: nothing on the page changes after that.
 */
export function LiveOrderRefresh({ status }: { status: OrderStatus }) {
  const router = useRouter();
  const open = OPEN.includes(status);
  const every = status === 'PLACED' ? PLACED_REFRESH_MS : OPEN_REFRESH_MS;

  useEffect(() => {
    if (!open) return;
    const refresh = () => {
      if (document.visibilityState === 'visible') router.refresh();
    };
    const timer = setInterval(refresh, every);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [open, every, router]);

  return null;
}
