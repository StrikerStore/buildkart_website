import { formatINR, type PricingKind } from '@StrikerStore/contract';
import { currentDeliveryTerms, currentLocation } from '@/lib/location';
import type { Locale } from '@/lib/i18n';

/**
 * The delivery promise, at the top of the product page.
 *
 * Above the brand and the name because it answers the question this audience
 * asks before the price: *will you bring it to my site, what will that cost,
 * when, and can I pay the driver*. One line, read left to right — the promise
 * in a capsule, then the condition on it, then the time, then the payment.
 *
 * What delivery costs depends on the product:
 *
 * - **Distance-priced**: the price already includes bringing it here, so
 *   delivery is free outright — and the line says the price is for this
 *   location, or asks for one when it is only the "from" price.
 * - **Same price everywhere**: delivery is charged on the order and is free
 *   above the shop's threshold. The charge itself is shown in the cart.
 *
 * How that charge is worked out — the value slabs and distance ranges — is the
 * shop's own business and stays in the admin. Only the free-delivery threshold
 * reaches this component, so the rates cannot leak onto the page.
 *
 * What it will not do is promise free delivery that checkout then charges for.
 */
export async function DeliveryLine({
  fallbackHours,
  codEnabled,
  pricingKind,
  located,
  freeAbove,
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
  pricingKind: PricingKind;
  /** Whether the page was priced for the shopper's location. */
  located: boolean;
  /** The order value above which delivery is free, or null when it never is. */
  freeAbove: string | null;
  locale: Locale;
}) {
  const hi = locale === 'hi';
  const [terms, location] = await Promise.all([currentDeliveryTerms(), currentLocation()]);
  const serviced = terms?.serviced === true;
  const hours = (serviced ? terms.promiseHours : null) ?? fallbackHours;
  const distancePriced = pricingKind === 'DISTANCE';
  const area = location?.areaName ?? location?.city ?? null;

  const condition = (() => {
    if (distancePriced) {
      if (!located) return hi ? 'अपनी लोकेशन चुनें, अपना भाव देखें' : 'Set your location for your price';
      return area
        ? hi
          ? `${area} तक डिलीवरी भाव में शामिल`
          : `Price includes delivery to ${area}`
        : hi
          ? 'डिलीवरी भाव में शामिल'
          : 'Price includes delivery';
    }
    if (freeAbove !== null) {
      return hi
        ? `${formatINR(freeAbove)} से ऊपर के ऑर्डर पर`
        : `on orders above ${formatINR(freeAbove)}`;
    }
    return hi ? 'डिलीवरी चार्ज कार्ट में दिखेगा' : 'Delivery charge shown in cart';
  })();

  // Free outright, or free above a threshold — the capsule either way, with the
  // condition beside it saying which.
  const showFree = distancePriced || freeAbove !== null;

  /*
   * Everything after the capsule, in reading order.
   *
   * A list rather than three spans with pipes written between them, so a
   * missing segment — a shop with COD off — takes its separator with it
   * instead of leaving a stranded "| |".
   */
  const segments = [
    condition,
    hi ? `${hours} घंटे में डिलीवरी` : `Delivery in ${hours} hours`,
    codEnabled ? (hi ? 'कैश ऑन डिलीवरी' : 'Cash on Delivery') : null,
  ].filter((segment): segment is string => segment !== null);

  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {showFree && (
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
