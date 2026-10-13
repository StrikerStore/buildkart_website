import 'server-only';
import { cookies, headers } from 'next/headers';
import { ATTRIBUTION_COOKIE, parseAttribution } from './attribution';
import { clientIp } from './api/server';
import { SESSION_COOKIE_NAME } from './visit';

/**
 * The `attribution` an order is placed with: the landing cookie, Meta's two
 * browser cookies, and the shopper's user agent and IP.
 *
 * Read here, on the server, at the moment of checkout — never posted by the
 * page — because the user agent and IP must be the shopper's, and a server
 * action is the one place both are to hand. The API treats all of it as a
 * marketing hint (bounded, and dropped if malformed), never as anything the
 * order's price or acceptance depends on.
 *
 * The user agent and IP are what let Meta match the server-side Purchase to
 * the person who saw the ad; the API keeps the IP for ten days and then
 * clears it.
 */
export async function orderAttribution() {
  const [store, headerList, ip] = await Promise.all([cookies(), headers(), clientIp()]);
  const stored = parseAttribution(store.get(ATTRIBUTION_COOKIE)?.value);

  return {
    ...(stored?.first ? { first: stored.first } : {}),
    ...(stored?.last ? { last: stored.last } : {}),
    fbp: store.get('_fbp')?.value,
    fbc: store.get('_fbc')?.value,
    userAgent: headerList.get('user-agent') ?? undefined,
    ipAddress: ip ?? undefined,
    // The visit this order closes, so its session counts as converted.
    sessionId: store.get(SESSION_COOKIE_NAME)?.value,
  };
}
