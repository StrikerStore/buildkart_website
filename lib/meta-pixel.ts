/**
 * The Meta (Facebook) Pixel, as the rest of the storefront sees it: `track()`.
 *
 * Client-safe and dependency-free. Every call site goes through `track` rather
 * than touching `window.fbq`, for three reasons:
 *
 *   - **Order.** Effects run children-first, so a product page's ViewContent
 *     fires before the layout's `<MetaPixel>` has called `init`. Events that
 *     arrive early wait in `pending` and go out, in order, the moment `init`
 *     runs — instead of reaching Meta before the pixel id they belong to.
 *   - **Off is silent.** With no `META_PIXEL_ID` set (local dev, previews),
 *     `initPixel` is never called and every `track` is a no-op. No call site
 *     has to know whether the pixel is on.
 *   - **Dedup.** Each event can carry an `eventID`. Meta uses it to collapse
 *     the browser copy and a later server-side (Conversions API) copy of the
 *     same event into one — see `backend/docs/ANALYTICS.md`, phase 2.
 *
 * **`content_ids` are product handles**, everywhere. The handle is the only
 * identifier present on a card, a cart line, an order item and the product page
 * alike; the variant id is missing from order items and the product id from
 * cards. A catalog feed for Meta must use the same id or catalog ads will not
 * match these events.
 */

import { recordVisitForPixel } from './visit';

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push: Fbq;
  loaded: boolean;
  version: string;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

/** Every price on this storefront is rupees; there is no currency column. */
export const CURRENCY = 'INR';

export type PixelEvent =
  | 'PageView'
  | 'ViewContent'
  | 'Search'
  | 'AddToCart'
  | 'InitiateCheckout'
  | 'AddPaymentInfo'
  | 'Purchase'
  | 'CompleteRegistration'
  | 'Contact';

export type PixelParams = Record<string, unknown>;

/** What `Stepper` and friends need to describe an AddToCart. */
export type PixelProduct = { handle: string; name: string; price: string };

let initialised = false;
const pending: Array<[PixelEvent, PixelParams | undefined, string | undefined]> = [];

/**
 * Meta's own bootstrap stub, minus the `<script>` tag (`next/script` loads
 * that). Calls made before fbevents.js arrives are queued on the stub and
 * replayed by the library when it loads.
 */
function installStub(): Fbq {
  if (window.fbq) return window.fbq;
  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue.push(args);
  } as Fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = '2.0';
  fbq.queue = [];
  window.fbq = fbq;
  window._fbq ??= fbq;
  return fbq;
}

/**
 * Idempotent: strict mode and remounts call it more than once.
 *
 * `externalId` is the signed-in customer's id, already SHA-256 hashed on the
 * server — the same value the API sends with its Conversions API events, so
 * Meta can tie the browser and server copies to one person.
 *
 * `consentGranted: false` starts the pixel **revoked**: Meta's library loads
 * and accepts calls but sends nothing until `grantConsent()` — the shop's
 * consent banner, when the owner has switched it on.
 */
export function initPixel(
  pixelId: string,
  externalId?: string | null,
  { consentGranted = true }: { consentGranted?: boolean } = {},
) {
  if (typeof window === 'undefined' || initialised) return;
  initialised = true;
  const fbq = installStub();
  if (!consentGranted) fbq('consent', 'revoke');
  if (externalId) fbq('init', pixelId, { external_id: externalId });
  else fbq('init', pixelId);
  for (const [event, params, eventId] of pending.splice(0)) send(fbq, event, params, eventId);
}

/** The shopper accepted on the consent banner: the pixel may send from now on. */
export function grantConsent() {
  if (typeof window !== 'undefined') window.fbq?.('consent', 'grant');
}

/** The shopper declined: nothing more is sent. */
export function revokeConsent() {
  if (typeof window !== 'undefined') window.fbq?.('consent', 'revoke');
}

function send(fbq: Fbq, event: PixelEvent, params?: PixelParams, eventId?: string) {
  if (eventId) fbq('track', event, params ?? {}, { eventID: eventId });
  else if (params) fbq('track', event, params);
  else fbq('track', event);
}

export function track(event: PixelEvent, params?: PixelParams, eventId?: string) {
  if (typeof window === 'undefined') return;
  // The shop's own funnel first, and whether or not the pixel is on: page
  // views, product views, cart adds and checkouts are also session steps.
  recordVisitForPixel(event);
  if (!initialised || !window.fbq) {
    // Bounded: if the pixel is off, nothing ever drains this, and a long
    // session should not quietly grow an array of events nobody will send.
    if (pending.length < 50) pending.push([event, params, eventId]);
    return;
  }
  send(window.fbq, event, params, eventId);
}

/** A fresh id for an event that has no natural key (everything but Purchase). */
export function eventId(prefix: string) {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${random}`;
}

/** Decimal strings ("415.00") to the number Meta expects; junk becomes 0. */
export function toValue(price: string | number | null | undefined) {
  const value = Number(price);
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
}

/** AddToCart for `delta` more units of one product. */
export function trackAddToCart(product: PixelProduct, delta: number) {
  if (delta <= 0) return;
  track(
    'AddToCart',
    {
      content_ids: [product.handle],
      content_name: product.name,
      content_type: 'product',
      contents: [{ id: product.handle, quantity: delta, item_price: toValue(product.price) }],
      value: toValue(toValue(product.price) * delta),
      currency: CURRENCY,
    },
    eventId('atc'),
  );
}
