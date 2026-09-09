import 'server-only';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { LOCATION_COOKIE, parseLocation, type StoredLocation } from './location-shared';

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
