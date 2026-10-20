/**
 * The storefront's own visit beacon: sessions and the conversion funnel.
 *
 * Shopify's headline number is "online store conversion rate" — sessions that
 * ordered ÷ sessions — and it needs sessions counted by the shop itself, not
 * by an ad platform. Each page view and funnel step posts one tiny event to
 * `/api/t`; the API keeps one row per session.
 *
 * **The browser mints the ids**, synchronously, before anything is sent. A
 * product page fires a page view and a product view in the same tick; if the
 * server minted the session cookie, both requests would arrive without one and
 * become two sessions. Here the first call writes `bk_sid`, the second reads
 * it.
 *
 *   - `bk_vid` — the visitor, one year. "Returning" means this was seen before.
 *   - `bk_sid` — the session, rolled after thirty minutes with no event: the
 *     same idle rule Shopify and Google Analytics use. Every event renews it.
 *
 * Neither is a credential or carries anything about the person. The beacon is
 * first-party, so an ad blocker that stops the Meta Pixel does not stop it —
 * but it still waits for a yes to analytics on the cookie banner, and sets no
 * cookie at all before one.
 */
import { readCookie, writeCookie } from './browser-cookies';
import { touchFromLocation } from './attribution';
import { analyticsAllowed } from './consent-state';
import type { PixelEvent } from './meta-pixel';

export const VISITOR_COOKIE = 'bk_vid';
export const SESSION_COOKIE_NAME = 'bk_sid';
const VISITOR_MAX_AGE = 60 * 60 * 24 * 365;
const SESSION_IDLE_SECONDS = 30 * 60;

type VisitEvent = 'page_view' | 'product_view' | 'add_to_cart' | 'checkout_start';

/** The funnel step a pixel event stands for, if any. */
const FOR_PIXEL: Partial<Record<PixelEvent, VisitEvent>> = {
  PageView: 'page_view',
  ViewContent: 'product_view',
  AddToCart: 'add_to_cart',
  InitiateCheckout: 'checkout_start',
};

/** True until the first event of this document has gone. */
let firstOfDocument = true;

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function recordVisit(event: VisitEvent) {
  if (typeof window === 'undefined') return;
  // Nothing — not even the two ids — until the shopper has said yes to
  // analytics on the banner. See `lib/consent.ts`.
  if (!analyticsAllowed()) return;
  try {
    const visitorId = readCookie(VISITOR_COOKIE) || newId();
    const sessionId = readCookie(SESSION_COOKIE_NAME) || newId();
    writeCookie(VISITOR_COOKIE, visitorId, VISITOR_MAX_AGE);
    writeCookie(SESSION_COOKIE_NAME, sessionId, SESSION_IDLE_SECONDS);

    // Where this page load came from — only meaningful on the first event of
    // a document, when the URL is the landing URL and the referrer is real.
    const touch = firstOfDocument ? touchFromLocation(location.href, document.referrer) : null;
    firstOfDocument = false;

    const body = JSON.stringify({
      sessionId,
      visitorId,
      event,
      path: location.pathname,
      ...(touch ? { touch } : {}),
    });

    const sent =
      typeof navigator.sendBeacon === 'function' &&
      navigator.sendBeacon('/api/t', new Blob([body], { type: 'application/json' }));
    if (!sent) {
      void fetch('/api/t', {
        method: 'POST',
        body,
        headers: { 'content-type': 'application/json' },
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Blocked cookies or storage: a lost count is not worth a broken page.
  }
}

/** Called by `track()` so every pixel call site also feeds the funnel. */
export function recordVisitForPixel(event: PixelEvent) {
  const visit = FOR_PIXEL[event];
  if (visit) recordVisit(visit);
}
