import { formatINR, type DeliveryChargesDto, type PricingKind } from '@StrikerStore/contract';
import { currentDeliveryTerms, currentLocation } from '@/lib/location';
import type { Locale } from '@/lib/i18n';

/** "5", "7.5" — km without trailing zeros. */
const km = (value: number) => String(Math.round(value * 1000) / 1000);

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
 * - **Same price everywhere**: delivery is charged on the order, by its value
 *   and the distance, and is free above the shop's threshold. The rules are a
 *   tap away, because "how much is delivery" has no single answer here.
 *
 * What it will not do is promise free delivery that checkout then charges for.
 */
export async function DeliveryLine({
  fallbackHours,
  codEnabled,
  pricingKind,
  located,
  rules,
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
  rules: DeliveryChargesDto;
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
    if (rules.freeAbove !== null) {
      return hi
        ? `${formatINR(rules.freeAbove)} से ऊपर के ऑर्डर पर`
        : `on orders above ${formatINR(rules.freeAbove)}`;
    }
    return hi ? 'डिलीवरी ऑर्डर और दूरी के अनुसार' : 'Delivery by order value and distance';
  })();

  // Free outright, or free above a threshold — the capsule either way, with the
  // condition beside it saying which.
  const showFree = distancePriced || rules.freeAbove !== null;

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

  const sortedSlabs = [...rules.slabs].sort((a, b) => Number(a.from) - Number(b.from));
  const sortedRanges = [...rules.ranges].sort((a, b) => a.upToKm - b.upToKm);
  const lastRange = sortedRanges[sortedRanges.length - 1];
  const lastWidth =
    lastRange && sortedRanges.length > 1
      ? lastRange.upToKm - sortedRanges[sortedRanges.length - 2]!.upToKm
      : lastRange?.upToKm;
  const charges = sortedSlabs.some((slab) => slab.base !== '0.00') || sortedRanges.some((range) => range.addition !== '0.00');

  return (
    <div className="flex flex-col gap-1">
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

      {/* The rules, for a flat-priced product — a native disclosure, so it
          costs no script and works before anything hydrates. */}
      {!distancePriced && charges && (
        <details className="text-body4 text-ink-muted">
          <summary className="cursor-pointer select-none text-ink-muted underline underline-offset-2">
            {hi ? 'डिलीवरी चार्ज कैसे लगता है' : 'How delivery is charged'}
          </summary>
          <div className="mt-2 flex flex-col gap-2 rounded-box border border-hairline p-3">
            <div>
              <p className="text-heading9 text-ink">{hi ? 'ऑर्डर के हिसाब से' : 'By order value'}</p>
              <ul className="tabular">
                {sortedSlabs.map((slab, index) => {
                  const next = sortedSlabs[index + 1];
                  return (
                    <li key={slab.from} className="flex justify-between gap-4">
                      <span>
                        {next
                          ? `${formatINR(slab.from)} – ${formatINR(next.from)}`
                          : hi
                            ? `${formatINR(slab.from)} और ऊपर`
                            : `${formatINR(slab.from)} and above`}
                      </span>
                      <span>{formatINR(slab.base)}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div>
              <p className="text-heading9 text-ink">
                {hi ? 'दूरी के हिसाब से, हर हिस्सा जुड़ता है' : 'Plus distance — every range on the way adds up'}
              </p>
              <ul className="tabular">
                {sortedRanges.map((range, index) => (
                  <li key={range.upToKm} className="flex justify-between gap-4">
                    <span>
                      {km(index === 0 ? 0 : sortedRanges[index - 1]!.upToKm)}–{km(range.upToKm)} km
                    </span>
                    <span>+{formatINR(range.addition)}</span>
                  </li>
                ))}
                {lastRange && lastWidth !== undefined && (
                  <li className="flex justify-between gap-4">
                    <span>
                      {hi
                        ? `${km(lastRange.upToKm)} km के बाद, हर ${km(lastWidth)} km`
                        : `Beyond ${km(lastRange.upToKm)} km, every ${km(lastWidth)} km`}
                    </span>
                    <span>+{formatINR(lastRange.addition)}</span>
                  </li>
                )}
              </ul>
            </div>
            {rules.freeAbove !== null && (
              <p>
                {hi
                  ? `${formatINR(rules.freeAbove)} या उससे ऊपर के ऑर्डर पर डिलीवरी फ़्री, दूरी कुछ भी हो।`
                  : `Free on orders of ${formatINR(rules.freeAbove)} or more, at any distance.`}
              </p>
            )}
          </div>
        </details>
      )}
    </div>
  );
}
