'use server';

import { cookies } from 'next/headers';
import {
  parseSeen,
  SEEN_COOKIE,
  SEEN_MAX_AGE,
  serializeSeen,
  withSeen,
} from '@/lib/recently-viewed-shared';

/**
 * Remembers that this browser looked at a product.
 *
 * A Server Action rather than something the page does while rendering, because
 * a Server Component cannot set a cookie mid-render — Next allows it only from
 * an action, a route handler or middleware, and this site has no middleware.
 * `RecordView` fires it once after paint, so it never delays the page.
 *
 * Writes a handle and nothing else. See `recently-viewed-shared.ts` for why the
 * prices are deliberately not cached alongside it.
 */
export async function recordViewed(handle: string): Promise<void> {
  const store = await cookies();
  const next = withSeen(parseSeen(store.get(SEEN_COOKIE)?.value), handle);

  store.set(SEEN_COOKIE, serializeSeen(next), {
    // Readable by the server on the next request, which is the whole point;
    // there is nothing secret in a list of product handles.
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SEEN_MAX_AGE,
  });
}
