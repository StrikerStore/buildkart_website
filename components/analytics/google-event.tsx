'use client';

import { useEffect, type DependencyList } from 'react';
import type { PurchaseMeasurementDto } from '@StrikerStore/contract';
import { CONSENT_CHANGED } from '@/lib/consent-state';
import { googleAnalyticsEvent, googleConversion } from '@/lib/google-tag';
import { CURRENCY, toValue } from '@/lib/meta-pixel';
import { onceSeen, rememberOnce } from './track-event';

/**
 * Runs `report` when mounted and, if it was turned away for want of a yes,
 * again when a yes is given while this is still on screen.
 *
 * Most shoppers answer the banner on the page they land on, and from an ad
 * that is usually a product. What they are looking at when they say yes is
 * the current page, reported the way `config` reports the current page's
 * view; a page seen before the yes and left is never sent.
 *
 * `report` returns true once nothing is left to send.
 */
export function useReportOnYes(report: () => boolean, deps: DependencyList) {
  useEffect(() => {
    if (report()) return;
    const onChange = () => {
      if (report()) window.removeEventListener(CONSENT_CHANGED, onChange);
    };
    window.addEventListener(CONSENT_CHANGED, onChange);
    return () => window.removeEventListener(CONSENT_CHANGED, onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Sends one GA4 event when it mounts. Renders nothing.
 *
 * `<TrackEvent>`'s counterpart for GA4, so a Server Component can report with
 * data it already has. It fires again when `name` or `id` changes (a product
 * opened from another product, a second search) and not when the page merely
 * re-renders with new figures: the cart re-renders on every quantity change,
 * and that is not the cart viewed again.
 */
export function GoogleEvent({
  name,
  id,
  params,
}: {
  name: string;
  /** What this event is about; a new one fires the event again. */
  id: string;
  params: Record<string, unknown>;
}) {
  useReportOnYes(() => googleAnalyticsEvent(name, params), [name, id]);

  return null;
}

/**
 * Reports a sale to Google Ads and GA4 when it mounts, once per browser for
 * each.
 *
 * Both get the same order number and value, worked out by the server along
 * with whether the order counts at all (`measurement`); this only relays it.
 * Each destination still needs its own yes, which `google-tag.ts` checks, and
 * is remembered separately, so a yes to the other one given on this page
 * reports the sale there too. Where storage is unavailable it fires anyway,
 * and Google counts the order number once.
 */
export function GooglePurchase({
  measurement,
  adsSendTo,
  onceKey,
}: {
  measurement: PurchaseMeasurementDto;
  /** Google Ads' Purchase conversion, "AW-…/label". Null reports to GA4 only. */
  adsSendTo: string | null;
  onceKey: string;
}) {
  useReportOnYes(() => {
    // Not while ineligible: an online order whose payment the live refresh
    // later confirms should still be reported then. The bare key is the one
    // a browser kept before each destination had its own.
    if (!measurement.eligible || onceSeen(onceKey)) return true;
    const value = toValue(measurement.value);
    const reports: Array<[string, () => boolean]> = [
      [
        `${onceKey}:ads`,
        () =>
          adsSendTo === null ||
          googleConversion(adsSendTo, {
            value,
            currency: CURRENCY,
            transaction_id: measurement.transactionId,
          }),
      ],
      [
        `${onceKey}:ga4`,
        () =>
          googleAnalyticsEvent('purchase', {
            transaction_id: measurement.transactionId,
            value,
            currency: CURRENCY,
            tax: toValue(measurement.tax),
            shipping: toValue(measurement.shipping),
            ...(measurement.coupon ? { coupon: measurement.coupon } : {}),
            items: measurement.items.map((item) => ({
              ...(item.id ? { item_id: item.id } : {}),
              item_name: item.name,
              ...(item.variant ? { item_variant: item.variant } : {}),
              ...(item.category ? { item_category: item.category } : {}),
              ...(item.brand ? { item_brand: item.brand } : {}),
              price: toValue(item.price),
              quantity: item.quantity,
            })),
          }),
      ],
    ];
    let done = true;
    for (const [key, send] of reports) {
      if (onceSeen(key)) continue;
      if (send()) rememberOnce(key);
      else done = false;
    }
    return done;
  }, [onceKey, measurement.eligible]);

  return null;
}
