import { formatINR } from '@StrikerStore/contract';
import { currentDeliveryTerms } from '@/lib/location';
import type { Locale } from '@/lib/i18n';

/**
 * The delivery promise, at the top of the product page.
 *
 * Above the brand and the name because it answers the question this audience
 * asks before the price: *will you bring it to my site, when, and can I pay the
 * driver*. One line, read left to right — the promise in a capsule, then the
 * condition on it, then the time, then the payment.
 *
 * The terms are the **chosen area's**, not the shop's defaults — every
 * `ServiceablePincode` carries its own charge, free-delivery threshold and
 * promise, and a far suburb honestly being six hours is the reason that column
 * exists. `promiseHours` falls back to the global setting only when no area has
 * been chosen yet.
 *
 * What it will not do is promise free delivery that checkout then charges for.
 * An area with a delivery charge and no threshold gets the charge stated
 * plainly instead — the one case where "Free delivery" would be a lie.
 */
export async function DeliveryLine({
  fallbackHours,
  codEnabled,
  locale,
}: {
  /** The shop-wide promise, used until the customer has chosen an area. */
  fallbackHours: number;
  /**
   * Whether cash on delivery is on.
   *
   * Shop-wide, from the `payments.cod` setting — the schema has no per-product
   * COD flag, so this segment is on every product or on none.
   */
  codEnabled: boolean;
  locale: Locale;
}) {
  const hi = locale === 'hi';
  const terms = await currentDeliveryTerms();
  const serviced = terms?.serviced === true;

  const hours = (serviced ? terms.promiseHours : null) ?? fallbackHours;
  const charge = serviced ? terms.deliveryCharge : null;
  const freeAbove = serviced ? terms.freeAbove : null;

  // '0.00' means the area is free outright, which makes any threshold on it
  // moot — saying "above ₹5,000" there would invent a condition.
  const alwaysFree = charge === '0.00';
  const isFree = !serviced || alwaysFree || freeAbove !== null;

  const threshold = (() => {
    if (!isFree) return hi ? `डिलीवरी ${formatINR(charge!)}` : `Delivery ${formatINR(charge!)}`;
    if (alwaysFree || freeAbove === null) return null;
    return hi
      ? `${formatINR(freeAbove)} से ऊपर के ऑर्डर पर`
      : `on orders above ${formatINR(freeAbove)}`;
  })();

  /*
   * Everything after the capsule, in reading order.
   *
   * A list rather than three spans with pipes written between them, so a
   * missing segment — a free area with no threshold, a shop with COD off —
   * takes its separator with it instead of leaving a stranded "| |".
   */
  const segments = [
    threshold,
    hi ? `${hours} घंटे में डिलीवरी` : `Delivery in ${hours} hours`,
    codEnabled ? (hi ? 'कैश ऑन डिलीवरी' : 'Cash on Delivery') : null,
  ].filter((segment): segment is string => segment !== null);

  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {isFree && (
        /*
         * `Badge`'s shape, a step up the ramp.
         *
         * Not the `Badge` component itself: that is 11px, sized to sit on a
         * product tile, and here — under a 24px product name — it read as an
         * afterthought rather than as the page's promise.
         */
        <span className="inline-flex shrink-0 items-center rounded-pill bg-success-bg px-2.5 py-1 text-heading6 text-success-fg">
          {hi ? 'फ़्री डिलीवरी' : 'Free delivery'}
        </span>
      )}

      {segments.map((segment, index) => (
        <span key={segment} className="flex items-center gap-x-2 text-body3 text-ink-muted">
          {/* Decoration between two facts, not a word — announcing "vertical
              line" between them helps nobody. */}
          {index > 0 && (
            <span aria-hidden className="text-hairline-strong">
              |
            </span>
          )}
          {segment}
        </span>
      ))}
    </p>
  );
}
