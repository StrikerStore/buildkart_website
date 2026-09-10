import { formatINR } from '@StrikerStore/contract';
import { currentDeliveryTerms } from '@/lib/location';
import type { Locale } from '@/lib/i18n';

/**
 * The delivery promise, at the top of the product page.
 *
 * Above the brand and the name because it answers the question this audience
 * asks before the price: *will you bring it to my site, and when*.
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
  locale,
}: {
  /** The shop-wide promise, used until the customer has chosen an area. */
  fallbackHours: number;
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

  const qualifier = (() => {
    if (!isFree) return hi ? `डिलीवरी ${formatINR(charge!)}` : `Delivery ${formatINR(charge!)}`;
    if (alwaysFree || freeAbove === null) return null;
    return hi ? `${formatINR(freeAbove)} से ऊपर के ऑर्डर पर` : `on orders above ${formatINR(freeAbove)}`;
  })();

  return (
    <p className="flex flex-wrap items-baseline gap-1.5">
      {/* `text-heading7` rather than a raw weight: this ramp carries weight with
          size, and 13px/600 is the emphasis step beside `text-body3`. */}
      {isFree && (
        <span className="text-heading7 text-success">
          {hi ? 'फ़्री डिलीवरी' : 'Free delivery'}
        </span>
      )}

      {qualifier && <span className="text-body5 text-ink-muted">{qualifier}</span>}

      <span className="text-body5 text-ink-muted">
        {isFree || qualifier ? '· ' : ''}
        {hi ? `${hours} घंटे में डिलीवरी` : `Delivery in ${hours} hours`}
      </span>
    </p>
  );
}
