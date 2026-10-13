/**
 * Where a shopper came from, remembered until they buy.
 *
 * Shared by the browser, which writes the cookie on landing, and the checkout
 * actions, which read it and send it with the order. The API decides the
 * channel (`deriveChannel` in the backend's shared package); this file only
 * records what the URL and the referrer said.
 *
 * **First touch and last touch.** `first` is how the shopper found the shop
 * and is kept for as long as the cookie lives; `last` is overwritten by every
 * later visit that arrives *with* a source — an ad click, a tagged WhatsApp
 * link, a search result. A visit with no source (typed address, bookmark,
 * internal link) leaves both alone, so returning by habit does not erase the
 * ad that brought them.
 *
 * First-party and plain: no third-party script involved, so an ad blocker that
 * stops the Meta Pixel does not stop this.
 */

export const ATTRIBUTION_COOKIE = 'bk_attr';
/** Thirty days, renewed by every visit that carries a source. */
export const ATTRIBUTION_MAX_AGE = 60 * 60 * 24 * 30;

export type Touch = {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  fbclid?: string;
  gclid?: string;
  referrer?: string;
  landingPath?: string;
  at?: string;
};

export type StoredAttribution = { first?: Touch; last?: Touch };

/*
 * Hosts that send a shopper back here mid-checkout. A return from PayU or a
 * bank's 3-D Secure page is the end of a purchase, not a new source, and
 * crediting it would turn every online payer into a "referral" for their next
 * order.
 */
const PAYMENT_HOSTS =
  /(^|\.)(razorpay\.com|payu\.in|payumoney\.com|snapmint\.com|cashfree\.com|paytm\.(com|in)|phonepe\.com|billdesk\.com|ccavenue\.com)$/i;

/** Caps every value so the cookie stays far under the 4 KB a browser allows. */
const LIMITS: Record<keyof Touch, number> = {
  source: 100,
  medium: 100,
  campaign: 150,
  content: 150,
  term: 150,
  fbclid: 255,
  gclid: 255,
  referrer: 300,
  landingPath: 300,
  at: 32,
};

function clip(touch: Touch): Touch {
  const out: Touch = {};
  for (const key of Object.keys(LIMITS) as Array<keyof Touch>) {
    const value = touch[key]?.trim();
    if (value) out[key] = value.slice(0, LIMITS[key]);
  }
  return out;
}

export function parseAttribution(raw: string | undefined | null): StoredAttribution | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== 'object') return null;
    const { first, last } = value as StoredAttribution;
    return {
      ...(first && typeof first === 'object' ? { first: clip(first) } : {}),
      ...(last && typeof last === 'object' ? { last: clip(last) } : {}),
    };
  } catch {
    return null;
  }
}

/**
 * What this page load says about where the shopper came from, or null when it
 * says nothing (no tags, no click id, no outside referrer).
 */
export function touchFromLocation(href: string, referrer: string): Touch | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  const param = (name: string) => url.searchParams.get(name) ?? undefined;

  let outsideReferrer: string | undefined;
  if (referrer) {
    try {
      const from = new URL(referrer);
      // A referrer from this site is navigation, not a source. Only the origin
      // is kept: a full referrer can carry another site's search terms.
      if (from.host !== url.host && !PAYMENT_HOSTS.test(from.hostname)) {
        outsideReferrer = `${from.origin}/`;
      }
    } catch {
      // Not a URL; ignore it.
    }
  }

  const touch = clip({
    source: param('utm_source'),
    medium: param('utm_medium'),
    campaign: param('utm_campaign'),
    content: param('utm_content'),
    term: param('utm_term'),
    fbclid: param('fbclid'),
    gclid: param('gclid'),
    referrer: outsideReferrer,
  });
  if (Object.keys(touch).length === 0) return null;

  return { ...touch, landingPath: url.pathname.slice(0, LIMITS.landingPath), at: new Date().toISOString() };
}

/**
 * The cookie after this page load: the new touch becomes `last` (and `first`,
 * if there was none). A load with no source changes nothing — except on the
 * very first visit, which records a direct first touch so "how did they find
 * us" has an answer.
 */
export function nextAttribution(
  stored: StoredAttribution | null,
  touch: Touch | null,
  landingPath: string,
): StoredAttribution | null {
  if (touch) return { first: stored?.first ?? touch, last: touch };
  if (stored?.first) return null; // nothing to change
  const direct: Touch = { landingPath: landingPath.slice(0, LIMITS.landingPath), at: new Date().toISOString() };
  return { first: direct, last: direct };
}
