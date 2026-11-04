'use client';

import { useEffect } from 'react';
import type { PurchaseMeasurementDto } from '@StrikerStore/contract';
import { googleAnalyticsEvent, googleConversion } from '@/lib/google-tag';
import { CURRENCY, toValue } from '@/lib/meta-pixel';
import { onceSeen, rememberOnce } from './track-event';

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
  useEffect(() => {
    googleAnalyticsEvent(name, params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, id]);

  return null;
}

/**
 * Reports a sale to Google Ads and GA4 when it mounts, once per browser.
 *
 * Both get the same order number and value, worked out by the server along
 * with whether the order counts at all (`measurement`); this only relays it.
 * `onceKey` works as on `<TrackEvent>`: a refresh of the confirmation reports
 * nothing again, and where storage is unavailable it fires anyway and Google
 * counts the order number once.
 *
 * Each destination still needs its own yes, which `google-tag.ts` checks: a
 * shopper who allowed ad measurement but not analytics reaches Google Ads only.
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
  useEffect(() => {
    // Not remembered while ineligible: an online order whose payment the
    // live refresh later confirms should still be reported then.
    if (!measurement.eligible || onceSeen(onceKey)) return;
    const value = toValue(measurement.value);
    if (adsSendTo) {
      googleConversion(adsSendTo, {
        value,
        currency: CURRENCY,
        transaction_id: measurement.transactionId,
      });
    }
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
    });
    rememberOnce(onceKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onceKey, measurement.eligible]);

  return null;
}
