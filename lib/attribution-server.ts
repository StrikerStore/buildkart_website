import 'server-only';
import { cookies, headers } from 'next/headers';
import { ATTRIBUTION_COOKIE, parseAttribution } from './attribution';
import { clientIp } from './api/server';
import { SESSION_COOKIE_NAME } from './visit';
import { CONSENT_COOKIE, consentForApi, parseConsent } from './consent';

/**
 * The `attribution` an order or a sign-in is sent with — only as much of it as
 * the shopper agreed to on the cookie banner.
 *
 *   - **analytics** yes: where the visit came from (`bk_attr`) and the session
 *     it closes (`bk_sid`).
 *   - **marketing** yes: Meta's two browser cookies, the user agent and the IP
 *     — what lets Meta match the server-side event to the person who saw the
 *     ad. The API keeps the IP for ten days and then clears it.
 *
 * The answers themselves always go along, so the API can record what applied
 * and refuse anything the shopper did not agree to, whatever a page sends.
 *
 * Read here, on the server, at the moment of checkout — never posted by the
 * page — because the user agent and IP must be the shopper's, and a server
 * action is the one place both are to hand.
 */
export async function orderAttribution() {
  const [store, headerList, ip] = await Promise.all([cookies(), headers(), clientIp()]);
  const consent = parseConsent(store.get(CONSENT_COOKIE)?.value);
  const analytics = consent?.analytics === true;
  const marketing = consent?.marketing === true;
  const stored = analytics ? parseAttribution(store.get(ATTRIBUTION_COOKIE)?.value) : null;

  return {
    ...(stored?.first ? { first: stored.first } : {}),
    ...(stored?.last ? { last: stored.last } : {}),
    ...(analytics ? { sessionId: store.get(SESSION_COOKIE_NAME)?.value } : {}),
    ...(marketing
      ? {
          fbp: store.get('_fbp')?.value,
          fbc: store.get('_fbc')?.value,
          userAgent: headerList.get('user-agent') ?? undefined,
          ipAddress: ip ?? undefined,
        }
      : {}),
    ...consentForApi(consent),
  };
}
