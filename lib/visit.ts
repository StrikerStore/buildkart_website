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
 * While the tab is visible it also says "still here" every 30 seconds, so the
 * admin's live view counts a shopper reading a page between clicks. That only
 * touches a session already open; it never starts one, and never stretches
 * the thirty minutes, which only a real event renews.
 *
 * Neither is a credential or carries anything about the person. The beacon is
 * first-party, so an ad blocker that stops the Meta Pixel does not stop it —
 * but it still waits for a yes to analytics on the cookie banner, and sets no
 * cookie at all before one.
 *
 * **Without that yes, a visit is only counted.** Once per visit — a page
 * opened from outside the site, not a reload, a Back, or a return from the
 * payment page — `/api/v` adds one to a daily tally. Nothing is stored on the
 * device for it and nothing is sent but "a visit happened": no id, page,
 * referrer or source. If the shopper then says yes on the same page, that
 * count is taken back and the visit starts as a session instead, so nobody is
 * counted twice.
 */
import type { ConsentChoices } from '@StrikerStore/contract';
import { readCookie, writeCookie } from './browser-cookies';
import { isPaymentReferrer, touchFromLocation } from './attribution';
import { analyticsAllowed } from './consent-state';
import type { PixelEvent } from './meta-pixel';

export const VISITOR_COOKIE = 'bk_vid';
export const SESSION_COOKIE_NAME = 'bk_sid';
const VISITOR_MAX_AGE = 60 * 60 * 24 * 365;
const SESSION_IDLE_SECONDS = 30 * 60;
/** "Still here", while the tab is visible. The live view counts the last minute. */
const HEARTBEAT_MS = 30_000;

type VisitEvent = 'page_view' | 'product_view' | 'add_to_cart' | 'checkout_start';

/** The funnel step a pixel event stands for, if any. */
const FOR_PIXEL: Partial<Record<PixelEvent, VisitEvent>> = {
  PageView: 'page_view',
  ViewContent: 'product_view',
  AddToCart: 'add_to_cart',
  InitiateCheckout: 'checkout_start',
};

/** True until the first session event of this document has gone. */
let firstOfDocument = true;
/**
 * The URL and referrer this document was opened with, kept from the first
 * call. A shopper who says yes after clicking about has a different URL by
 * then — the ad's tags are gone — but their session should still start from
 * where they came in.
 */
let landing: { href: string; referrer: string } | null = null;
/** Whether this document has had its chance to be counted anonymously. */
let anonymousChecked = false;
/** When this document's visit was counted anonymously; null when it was not. */
let anonymousAt: number | null = null;
/** Whether this document's heartbeat is running. */
let heartbeatOn = false;

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function send(url: string, payload: object) {
  const body = JSON.stringify(payload);
  const sent =
    typeof navigator.sendBeacon === 'function' &&
    navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
  if (!sent) {
    void fetch(url, {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/json' },
      keepalive: true,
    }).catch(() => {});
  }
}

/**
 * Whether this document is the start of a visit: opened from another site, an
 * app, a bookmark or a typed address. A reload or Back is the same visit, and
 * so is a page this site opened (a new tab, the return from a payment page).
 */
function startsVisit(referrer: string): boolean {
  const navigation = performance.getEntriesByType?.('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (navigation && navigation.type !== 'navigate') return false;
  if (!referrer) return true;
  try {
    return new URL(referrer).host !== location.host && !isPaymentReferrer(referrer);
  } catch {
    return true;
  }
}

/** The anonymous count — at most once per document, and never once a session began. */
function countAnonymously(referrer: string) {
  if (anonymousChecked || !firstOfDocument) return;
  anonymousChecked = true;
  if (!startsVisit(referrer)) return;
  anonymousAt = Date.now();
  send('/api/v', { event: 'visit', at: anonymousAt });
}

/** Still here — for a session that is still open, from a tab someone can see. */
function heartbeat() {
  try {
    if (document.visibilityState !== 'visible' || !analyticsAllowed()) return;
    const sessionId = readCookie(SESSION_COOKIE_NAME);
    const visitorId = readCookie(VISITOR_COOKIE);
    // The session lapsed (thirty minutes without a real event): the next real
    // event starts a new one. Not this.
    if (!sessionId || !visitorId) return;
    send('/api/t', { sessionId, visitorId, event: 'heartbeat', path: location.pathname });
  } catch {
    // Blocked cookies: the live view misses one tab.
  }
}

function startHeartbeat() {
  if (heartbeatOn) return;
  heartbeatOn = true;
  window.setInterval(heartbeat, HEARTBEAT_MS);
  // Back on the tab: say so now rather than up to 30 seconds later.
  document.addEventListener('visibilitychange', heartbeat);
}

export function recordVisit(event: VisitEvent) {
  if (typeof window === 'undefined') return;
  try {
    landing ??= { href: location.href, referrer: document.referrer };
    // Nothing — not even the two ids — until the shopper has said yes to
    // analytics on the banner. See `lib/consent.ts`.
    if (!analyticsAllowed()) {
      countAnonymously(landing.referrer);
      return;
    }

    const visitorId = readCookie(VISITOR_COOKIE) || newId();
    const sessionId = readCookie(SESSION_COOKIE_NAME) || newId();
    writeCookie(VISITOR_COOKIE, visitorId, VISITOR_MAX_AGE);
    writeCookie(SESSION_COOKIE_NAME, sessionId, SESSION_IDLE_SECONDS);

    // Where this page load came from — only meaningful on the first event of
    // a document, from the landing URL and the referrer it was opened with.
    const touch = firstOfDocument ? touchFromLocation(landing.href, landing.referrer) : null;
    firstOfDocument = false;

    send('/api/t', {
      sessionId,
      visitorId,
      event,
      path: location.pathname,
      ...(touch ? { touch } : {}),
    });
    startHeartbeat();
  } catch {
    // Blocked cookies or storage: a lost count is not worth a broken page.
  }
}

/**
 * The banner's answer changed. On a yes to analytics, this visit is taken off
 * the anonymous count and starts as a session from the page the shopper is
 * on — without it, a shopper who said yes and left from that page would be
 * counted nowhere.
 */
export function onConsentChanged(choices: ConsentChoices | null) {
  if (typeof window === 'undefined' || choices?.analytics !== true) return;
  if (anonymousAt !== null) {
    send('/api/v', { event: 'retract', at: anonymousAt });
    anonymousAt = null;
  }
  if (firstOfDocument) recordVisit('page_view');
}

/** Called by `track()` so every pixel call site also feeds the funnel. */
export function recordVisitForPixel(event: PixelEvent) {
  const visit = FOR_PIXEL[event];
  if (visit) recordVisit(visit);
}
