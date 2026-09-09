import { Check, Circle } from 'lucide-react';
import type { OrderStatus } from '@StrikerStore/contract';
import { cn } from '@/lib/cn';
import type { Locale } from '@/lib/i18n';

/**
 * The five states an order moves through, and where this one has reached.
 *
 * PLAN.md §6.8 asks for a visual timeline, and the reason is the four-hour
 * promise: a contractor who has been told materials arrive this afternoon wants
 * to know they are *packed*, not merely that the money went through. "Where is
 * it" is the question this page exists to answer without a phone call.
 */
const FLOW: OrderStatus[] = ['PLACED', 'CONFIRMED', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED'];

const LABELS: Record<OrderStatus, { en: string; hi: string }> = {
  PLACED: { en: 'Order placed', hi: 'ऑर्डर मिला' },
  CONFIRMED: { en: 'Confirmed', hi: 'कन्फ़र्म' },
  PACKED: { en: 'Packed', hi: 'पैक हो गया' },
  OUT_FOR_DELIVERY: { en: 'Out for delivery', hi: 'रास्ते में' },
  DELIVERED: { en: 'Delivered', hi: 'पहुँच गया' },
  CANCELLED: { en: 'Cancelled', hi: 'रद्द' },
};

export function statusLabel(status: OrderStatus, locale: Locale): string {
  const entry = LABELS[status];
  return locale === 'hi' ? entry.hi : entry.en;
}

/** A compact pill for the list; the full ladder is `OrderTimeline`. */
export function StatusPill({ status, locale }: { status: OrderStatus; locale: Locale }) {
  const tone =
    status === 'DELIVERED'
      ? 'bg-success-bg text-success'
      : status === 'CANCELLED'
        ? 'bg-error-bg text-error'
        : 'bg-info-bg text-info';

  return (
    <span className={cn('inline-flex items-center rounded-pill px-2 py-0.5 text-heading9', tone)}>
      {statusLabel(status, locale)}
    </span>
  );
}

export function OrderTimeline({
  status,
  timeline,
  locale,
}: {
  status: OrderStatus;
  timeline: Array<{ status: OrderStatus; at: string }>;
  locale: Locale;
}) {
  /*
   * A cancelled order does not belong on the ladder. It left the flow rather
   * than stopping partway along it, and drawing it as "stuck at Confirmed"
   * would say something untrue about what happened.
   */
  if (status === 'CANCELLED') {
    return (
      <div className="rounded-card border border-error/20 bg-error-bg p-4">
        <p className="text-heading6 text-error">{statusLabel('CANCELLED', locale)}</p>
        <p className="mt-1 text-body3 text-ink-muted">
          {locale === 'hi'
            ? 'यह ऑर्डर रद्द कर दिया गया था।'
            : 'This order was cancelled. Call us if that looks wrong.'}
        </p>
      </div>
    );
  }

  const reachedAt = new Map(timeline.map((entry) => [entry.status, entry.at]));
  const position = FLOW.indexOf(status);

  return (
    <ol className="rounded-card border border-hairline bg-surface p-4">
      {FLOW.map((step, index) => {
        const done = index <= position;
        const at = reachedAt.get(step);

        return (
          <li key={step} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'grid size-6 shrink-0 place-items-center rounded-pill',
                  done ? 'bg-success text-ink-inverted' : 'bg-surface-muted text-ink-faint',
                )}
              >
                {done ? <Check className="size-3.5" aria-hidden /> : <Circle className="size-2" aria-hidden />}
              </span>
              {/* The connector, on every step but the last. */}
              {index < FLOW.length - 1 && (
                <span
                  className={cn('w-0.5 flex-1', index < position ? 'bg-success' : 'bg-hairline')}
                  style={{ minHeight: 20 }}
                />
              )}
            </div>

            <div className={cn('pb-4', !done && 'opacity-50')}>
              <p className="text-heading7 text-ink">{statusLabel(step, locale)}</p>
              {at && (
                <p className="text-body5 text-ink-muted">
                  {new Date(at).toLocaleString(locale === 'hi' ? 'hi-IN' : 'en-IN', {
                    day: 'numeric',
                    month: 'short',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
