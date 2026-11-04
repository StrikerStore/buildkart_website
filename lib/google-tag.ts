/**
 * The Google tag (Google Ads), in the browser.
 *
 * Like the Meta Pixel, it runs only for a shopper who said yes to marketing on
 * the cookie banner, and nothing is requested from Google before that. One more
 * condition applies: the yes must have been given on a notice that named Google
 * (`GOOGLE_CONSENT_SINCE`). A shopper who agreed when the banner said only
 * "Meta" agreed to Meta, so the banner asks them again before Google is added.
 */
import type { ConsentChoices } from '@StrikerStore/contract';

/** The first notice version whose marketing consent names Google. */
export const GOOGLE_CONSENT_SINCE = '2026-11';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** Whether these choices cover the Google tag. No answer is a no. */
export function googleAllowed(choices: ConsentChoices | null): boolean {
  return choices?.marketing === true && (choices.v ?? '') >= GOOGLE_CONSENT_SINCE;
}

/**
 * A marketing yes given before Google was named: still a yes for Meta, but one
 * the banner should ask about again.
 */
export function needsGoogleReconsent(choices: ConsentChoices | null): boolean {
  return choices?.marketing === true && !googleAllowed(choices);
}

let initialisedId: string | null = null;

/**
 * Sets up `gtag` and the consent state before the library arrives, so
 * everything queued is read with consent already granted.
 *
 * `gtag` must push the `arguments` object itself, not an array: that is what
 * gtag.js reads from the data layer.
 */
export function initGoogleTag(tagId: string, analyticsGranted: boolean) {
  if (typeof window === 'undefined' || initialisedId) return;
  initialisedId = tagId;
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag('consent', 'default', {
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted',
    analytics_storage: analyticsGranted ? 'granted' : 'denied',
  });
  window.gtag('js', new Date());
  // The first page view goes with this; later ones are sent on navigation.
  window.gtag('config', tagId);
}

/** A yes given or taken back on this page. A no stops anything more being sent. */
export function updateGoogleConsent(granted: boolean) {
  if (typeof window === 'undefined' || !initialisedId) return;
  const state = granted ? 'granted' : 'denied';
  window.gtag?.('consent', 'update', {
    ad_storage: state,
    ad_user_data: state,
    ad_personalization: state,
  });
}

/** A page view after a client-side navigation, which `config` does not see. */
export function googlePageView() {
  if (typeof window === 'undefined' || !initialisedId) return;
  window.gtag?.('event', 'page_view', {
    send_to: initialisedId,
    page_location: window.location.href,
    page_path: window.location.pathname + window.location.search,
  });
}
