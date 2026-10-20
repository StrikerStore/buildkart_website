/**
 * Giving and taking back consent, in the browser.
 *
 * One function for both directions, so taking a yes back is exactly as easy as
 * giving it (DPDP Act §6(4)). A "no" does more than stop new tracking: it
 * removes what the tracking already stored on this device.
 */
import { NOTICE_VERSION, serializeConsentCookie, type ConsentChoices } from '@StrikerStore/contract';
import { ATTRIBUTION_COOKIE } from './attribution';
import { deleteCookie, writeCookie } from './browser-cookies';
import { CONSENT_COOKIE, CONSENT_MAX_AGE } from './consent';
import { CONSENT_CHANGED, CONSENT_OPEN, currentChoices } from './consent-state';
import { SESSION_COOKIE_NAME, VISITOR_COOKIE } from './visit';

/** What the shop's own analytics leave on a device. */
const ANALYTICS_COOKIES = [VISITOR_COOKIE, SESSION_COOKIE_NAME, ATTRIBUTION_COOKIE];
/** Meta's browser and click ids — `_fbc` the shop may have minted itself. */
const MARKETING_COOKIES = ['_fbp', '_fbc'];

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Stores an answer, cleans up after any "no", and tells every tracker on the
 * page. Returns the choices as stored, for the caller to file with the API.
 */
export function saveChoices(answer: { analytics: boolean; marketing: boolean }): ConsentChoices {
  const choices: ConsentChoices = {
    // The same id across changes of mind, so a device's history reads as one.
    id: currentChoices()?.id ?? newId(),
    analytics: answer.analytics,
    marketing: answer.marketing,
    at: Date.now(),
    v: NOTICE_VERSION,
  };

  try {
    writeCookie(CONSENT_COOKIE, serializeConsentCookie(choices), CONSENT_MAX_AGE);
    if (!choices.analytics) ANALYTICS_COOKIES.forEach(deleteCookie);
    if (!choices.marketing) MARKETING_COOKIES.forEach(deleteCookie);
  } catch {
    // Blocked cookies: the answer still governs this page through the event.
  }

  window.dispatchEvent(new CustomEvent<ConsentChoices>(CONSENT_CHANGED, { detail: choices }));
  return choices;
}

/** Opens the banner again, with the current answers filled in. */
export function openChoices() {
  window.dispatchEvent(new Event(CONSENT_OPEN));
}
