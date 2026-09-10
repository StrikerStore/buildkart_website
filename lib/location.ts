import 'server-only';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { LOCATION_COOKIE, parseLocation, type StoredLocation } from './location-shared';
import { api } from './api/server';

export * from './location-shared';

/**
 * The delivery area chosen for this request, or null if none has been.
 *
 * `cache`d for the same reason `currentLocale` is: the header pill, a delivery
 * line in the cart and a product page's ETA all ask, and they should cost one
 * cookie read between them.
 */
export const currentLocation = cache(async (): Promise<StoredLocation | null> => {
  return parseLocation((await cookies()).get(LOCATION_COOKIE)?.value);
});

/**
 * The owner's terms for the chosen area — charge, free-delivery threshold and
 * the promise — or null when no area has been chosen.
 *
 * Re-read from the API rather than taken off the cookie, for the reason
 * `location-shared.ts` states: these are the owner's settings, and a cookie a
 * customer can edit must never be what decides a delivery fee. `cache`d so the
 * product page's delivery line and anything else asking cost one query between
 * them.
 */
export const currentDeliveryTerms = cache(async () => {
  const location = await currentLocation();
  if (!location) return null;

  return (await api()).content.checkPincode.query({ pincode: location.pincode });
});
