/**
 * The Google tag, in the browser: Google Ads and Google Analytics 4 on one
 * `gtag.js`.
 *
 * Like the Meta Pixel, nothing is requested from Google before a yes. Each
 * destination has its own:
 *
 *   - **Google Ads** (`AW-…`) runs on a yes to ad measurement;
 *   - **GA4** (`G-…`) runs on a yes to site analytics.
 *
 * And each yes must have been given on a notice that named that Google product
 * (`…_CONSENT_SINCE`). A shopper who agreed before the banner named it agreed
 * to something else, so the banner asks them again before it is added.
 *
 * A destination without its yes is never configured, so it receives nothing at
 * all, not even a cookieless ping, and consent mode tells Google the same.
 */
import type { ConsentChoices } from '@StrikerStore/contract';
import { currentChoices } from './consent-state';

/** The first notice version whose ad measurement names Google Ads. */
export const GOOGLE_ADS_CONSENT_SINCE = '2026-11';
/** The first notice version whose site analytics names Google Analytics. */
export const GOOGLE_ANALYTICS_CONSENT_SINCE = '2026-11.2';

type Destination = 'ads' | 'analytics';
const DESTINATIONS: readonly Destination[] = ['ads', 'analytics'];

/** The ids this site runs; null for one that is switched off. */
export type GoogleIds = Record<Destination, string | null>;
export type GoogleAllowed = Record<Destination, boolean>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** Whether these choices cover Google Ads. No answer is a no. */
export function googleAdsAllowed(choices: ConsentChoices | null): boolean {
  return choices?.marketing === true && (choices.v ?? '') >= GOOGLE_ADS_CONSENT_SINCE;
}

/** Whether these choices cover Google Analytics. No answer is a no. */
export function googleAnalyticsAllowed(choices: ConsentChoices | null): boolean {
  return choices?.analytics === true && (choices.v ?? '') >= GOOGLE_ANALYTICS_CONSENT_SINCE;
}

/** What these choices allow of what this site runs. */
export function googleAllowed(choices: ConsentChoices | null, ids: GoogleIds): GoogleAllowed {
  return {
    ads: ids.ads !== null && googleAdsAllowed(choices),
    analytics: ids.analytics !== null && googleAnalyticsAllowed(choices),
  };
}

/**
 * A yes given before the Google product it would now cover was named: still a
 * yes for what it did name, but one the banner should ask about again. Only
 * for a product this site runs, so it is switching GA4 on that re-asks, not
 * the notice changing.
 */
export function needsGoogleReconsent(choices: ConsentChoices | null, running: GoogleAllowed): boolean {
  if (!choices) return false;
  return (
    (running.ads && choices.marketing === true && !googleAdsAllowed(choices)) ||
    (running.analytics && choices.analytics === true && !googleAnalyticsAllowed(choices))
  );
}

let ids: GoogleIds | null = null;
const configured = new Set<Destination>();
/**
 * Events reported before `initGoogleTag` ran. Effects run in tree order, so on
 * a full page load the page reports before the layout's `<GoogleTag>` has set
 * anything up: a product view, or a sale on PayU's return.
 */
const pending: Array<[Destination, string, Record<string, unknown>]> = [];

function consentState(allowed: GoogleAllowed) {
  const ads = allowed.ads ? 'granted' : 'denied';
  return {
    ad_storage: ads,
    ad_user_data: ads,
    ad_personalization: ads,
    analytics_storage: allowed.analytics ? 'granted' : 'denied',
  };
}

/**
 * Sets up `gtag` and the consent state, then configures what is allowed, so
 * everything queued is read with consent already settled.
 *
 * `gtag` must push the `arguments` object itself, not an array: that is what
 * gtag.js reads from the data layer.
 */
export function initGoogleTag(tagIds: GoogleIds, allowed: GoogleAllowed) {
  if (typeof window === 'undefined' || ids) return;
  ids = tagIds;
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag('consent', 'default', consentState(allowed));
  window.gtag('js', new Date());
  configure(allowed);
}

/** A yes given or taken back on this page. */
export function updateGoogleConsent(allowed: GoogleAllowed) {
  if (typeof window === 'undefined' || !ids || !window.gtag) return;
  window.gtag('consent', 'update', consentState(allowed));
  configure(allowed);
}

function configure(allowed: GoogleAllowed) {
  for (const destination of DESTINATIONS) {
    const id = ids?.[destination];
    if (!id) continue;
    // GA4's own off switch, which also stops what it measures by itself
    // (page changes, scrolls) once a yes is taken back on this page.
    if (destination === 'analytics') {
      (window as unknown as Record<string, boolean>)[`ga-disable-${id}`] = !allowed.analytics;
    }
    if (allowed[destination] && !configured.has(destination)) {
      configured.add(destination);
      // Each sends this page's view as it is configured.
      window.gtag!('config', id);
    }
  }
  for (const [destination, name, params] of pending.splice(0)) send(destination, name, params);
}

function allowedNow(destination: Destination) {
  const choices = currentChoices();
  return destination === 'ads' ? googleAdsAllowed(choices) : googleAnalyticsAllowed(choices);
}

function send(destination: Destination, name: string, params: Record<string, unknown>) {
  const id = ids?.[destination];
  if (!id || !configured.has(destination) || !allowedNow(destination)) return;
  window.gtag!('event', name, { send_to: id, ...params });
}

/**
 * Nothing without a yes that covers this destination: not even queued, so a
 * yes given later cannot release what was seen before it.
 *
 * Returns whether it was taken (sent, or queued for the tag); false means no
 * yes, which a page reporting what is on screen can retry once one is given
 * (`useReportOnYes`).
 */
function report(destination: Destination, name: string, params: Record<string, unknown>): boolean {
  if (typeof window === 'undefined' || !allowedNow(destination)) return false;
  // Also while the yes is a moment old and the tag has not configured this
  // destination yet: `configure` sends it straight after.
  if (!ids || !window.gtag || !configured.has(destination)) {
    // Bounded: with the tag off, nothing ever drains this.
    if (pending.length < 50) pending.push([destination, name, params]);
    return true;
  }
  send(destination, name, params);
  return true;
}

/** A GA4 event. The shop's ecommerce ones are built in `google-ecommerce.ts`. */
export function googleAnalyticsEvent(name: string, params: Record<string, unknown> = {}): boolean {
  return report('analytics', name, params);
}

/**
 * A Google Ads conversion. `sendTo` is the "AW-…/label" pair Google gives for
 * the conversion action; Google counts one `transaction_id` once.
 */
export function googleConversion(
  sendTo: string,
  params: { value: number; currency: string; transaction_id: string },
): boolean {
  return report('ads', 'conversion', { ...params, send_to: sendTo });
}

/**
 * A Google Ads page view after a client-side navigation, which `config` does
 * not see. GA4 counts those itself from the browser history (its "page
 * changes" enhanced measurement), so it is not sent one as well.
 */
export function googlePageView() {
  if (typeof window === 'undefined') return;
  report('ads', 'page_view', {
    page_location: window.location.href,
    page_path: window.location.pathname + window.location.search,
  });
}
