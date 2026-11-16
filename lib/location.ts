import 'server-only';
import { cookies } from 'next/headers';
import { cache } from 'react';
import {
  ADDRESS_COOKIE,
  BROWSE_COOKIE,
  LOCATION_COOKIE,
  parseLocation,
  parseOutside,
  type OutsideSpot,
  type StoredLocation,
} from './location-shared';
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
 * Where an out-of-area visitor said they are, or null.
 *
 * Only while there is no delivery area: the two cookies are kept exclusive by
 * the actions that write them, but a real area must win even if they are not.
 */
export const currentOutside = cache(async (): Promise<OutsideSpot | null> => {
  if (await currentLocation()) return null;
  return parseOutside((await cookies()).get(BROWSE_COOKIE)?.value);
});

/** Closed or skipped the location popup without saying where they are. */
export const locationSkipped = cache(async (): Promise<boolean> => {
  if (await currentLocation()) return false;
  return (await cookies()).get(BROWSE_COOKIE)?.value === '1';
});

/**
 * Whether anything can go into the cart: only with a serviced delivery area.
 *
 * The website's own check, so an out-of-area visitor's ADD does nothing even
 * if the button is bypassed. The order itself is refused again by the API,
 * which checks the delivery address — this only keeps an undeliverable cart
 * from being built.
 */
export const canOrderHere = cache(async (): Promise<boolean> => {
  return (await currentLocation()) !== null;
});

/**
 * The pincode a cart or quote is priced against: the delivery area's, else the
 * out-of-area spot's.
 *
 * The second is sent on purpose. The API answers it with `serviced: false`, and
 * that is what makes the cart say "We do not deliver to 462001 yet" and hold
 * checkout back — rather than an anonymous "set your area" for somebody who
 * already did. No coordinate goes with it: see `currentPoint`.
 */
export const currentPricingPincode = cache(async (): Promise<string | null> => {
  const location = await currentLocation();
  if (location) return location.pincode;
  return (await currentOutside())?.pincode ?? null;
});

/**
 * Where the shopper is, for pricing distance-priced products — spread into
 * every catalogue query, so a card, a product page and the cart all quote the
 * price for here. Empty when no area is chosen yet: those products then show
 * their price at the warehouse, as "from".
 *
 * Empty for an out-of-area visitor too, on purpose. Their spot is never sent:
 * the distance addition has no ceiling, and a price for somewhere we do not
 * deliver is a number nobody can buy at. They see the warehouse rate instead,
 * with no "from" before it (`PriceFromLabel`).
 *
 * Read off the cookie, which a shopper can edit — and harmless for it: this
 * only moves a preview. What is charged is priced again from the address the
 * order is sent to.
 */
export const currentPoint = cache(async (): Promise<{ latitude?: number; longitude?: number }> => {
  const location = await currentLocation();
  if (!location?.latitude || !location.longitude) return {};
  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : {};
});

/** The saved address chosen for delivery, if any. Validated against the book by the caller. */
export const currentAddressId = cache(async (): Promise<string | null> => {
  const raw = (await cookies()).get(ADDRESS_COOKIE)?.value ?? '';
  return /^[A-Za-z0-9_-]{1,64}$/.test(raw) ? raw : null;
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
