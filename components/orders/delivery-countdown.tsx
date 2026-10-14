'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Truck } from 'lucide-react';
import { STORE_TIME_ZONE, storeDateStamp, type DeliveryPromiseDto } from '@StrikerStore/contract';
import { cn } from '@/lib/cn';
import type { Locale } from '@/lib/i18n';

/** How often the page re-reads the order, so a new "out for delivery" time shows up. */
const REFRESH_MS = 60_000;

/**
 * "Arriving in 3h 12m 05s" — the delivery promise, counting down.
 *
 * The promise is worked out on the server (`deliveryPromiseFor`): four hours
 * from confirmation inside the delivery window, the next morning outside it,
 * and the time the shop gave once the order is out for delivery. This only
 * draws it, and re-reads the order every minute so a revised time from the
 * shop replaces the old countdown without the customer refreshing.
 *
 * The clock starts after mount. The server renders the "by" time alone, so the
 * first paint never disagrees with the browser's clock.
 */
export function DeliveryCountdown({
  delivery,
  locale,
}: {
  delivery: DeliveryPromiseDto;
  locale: Locale;
}) {
  const hi = locale === 'hi';
  const router = useRouter();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const refresh = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, REFRESH_MS);
    return () => clearInterval(refresh);
  }, [router]);

  const by = new Date(delivery.by);
  const startsAt = delivery.countdownFrom ? Date.parse(delivery.countdownFrom) : null;
  const waiting = now !== null && startsAt !== null && now < startsAt;
  const remaining = now === null ? null : by.getTime() - now;
  const scheduled = delivery.kind === 'SCHEDULED';

  const time = by.toLocaleTimeString(hi ? 'hi-IN' : 'en-IN', {
    timeZone: STORE_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
  });
  const day = relativeDay(by, now === null ? new Date() : new Date(now), hi);
  const headline = hi ? `${day} ${time} तक पहुँचेगा` : `Arriving by ${time} ${day}`;

  return (
    <section
      className={cn(
        'rounded-card border p-4',
        scheduled ? 'border-success/30 bg-success-bg' : 'border-hairline bg-surface',
      )}
      aria-live="polite"
    >
      <p className="flex items-center gap-2 text-heading6 text-ink">
        {scheduled ? (
          <Truck className="size-4 text-success" aria-hidden />
        ) : (
          <Clock className="size-4 text-brand-text" aria-hidden />
        )}
        {scheduled
          ? hi
            ? 'आपका ऑर्डर रास्ते में है'
            : 'Your order is on its way'
          : hi
            ? 'डिलीवरी का समय'
            : 'Delivery time'}
      </p>

      {/* The day word can differ between server and browser right at midnight. */}
      <p className="mt-1 text-body2 text-ink-muted" suppressHydrationWarning>
        {waiting
          ? hi
            ? `आपका ऑर्डर ${day} ${time} तक डिलीवर हो जाएगा।`
            : `Your order will be delivered ${day} by ${time}.`
          : headline}
      </p>

      {remaining !== null && !waiting && (
        <div className="mt-3">
          {remaining > 0 ? (
            <Clockface ms={remaining} hi={hi} />
          ) : (
            <p className="text-heading4 text-ink">
              {hi ? 'बस पहुँचने ही वाला है' : 'Arriving any moment now'}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

/** Hours, minutes and seconds, each in its own box. */
function Clockface({ ms, hi }: { ms: number; hi: boolean }) {
  const total = Math.floor(ms / 1000);
  const parts = [
    { value: Math.floor(total / 3600), label: hi ? 'घंटे' : 'hours' },
    { value: Math.floor((total % 3600) / 60), label: hi ? 'मिनट' : 'min' },
    { value: total % 60, label: hi ? 'सेकंड' : 'sec' },
  ];

  return (
    <div className="flex items-start gap-2" role="timer">
      {parts.map((part, index) => (
        <div key={part.label} className="flex items-start gap-2">
          {index > 0 && <span className="pt-1.5 text-heading3 text-ink-faint">:</span>}
          <div className="flex min-w-[56px] flex-col items-center rounded-box bg-surface-muted px-2 py-1.5">
            <span className="tabular-nums text-heading2 text-ink">
              {String(part.value).padStart(2, '0')}
            </span>
            <span className="text-body5 text-ink-muted">{part.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/** "today", "tomorrow", or the date — in the store's calendar, not the device's. */
function relativeDay(at: Date, now: Date, hi: boolean): string {
  const target = storeDateStamp(at);
  if (target === storeDateStamp(now)) return hi ? 'आज' : 'today';
  if (target === storeDateStamp(new Date(now.getTime() + 86_400_000))) {
    return hi ? 'कल' : 'tomorrow';
  }
  const date = at.toLocaleDateString(hi ? 'hi-IN' : 'en-IN', {
    timeZone: STORE_TIME_ZONE,
    day: 'numeric',
    month: 'short',
  });
  return hi ? date : `on ${date}`;
}
