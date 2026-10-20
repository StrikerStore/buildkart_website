/**
 * What this browser has agreed to, right now. Browser-only and import-free of
 * anything that tracks, so the trackers themselves can ask it.
 *
 * Read from the cookie on every call rather than cached: it is a few hundred
 * bytes, and a cached answer would keep a beacon sending for a moment after
 * the shopper took their yes back.
 */
import { readCookie } from './browser-cookies';
import { CONSENT_COOKIE, parseConsent, type ConsentChoices } from './consent';

/** Fired on `window` whenever the answers change; `detail` is the new choices. */
export const CONSENT_CHANGED = 'bk:consent';
/** Fired on `window` to open the banner again — the footer's "Privacy choices". */
export const CONSENT_OPEN = 'bk:consent-open';

export function currentChoices(): ConsentChoices | null {
  if (typeof document === 'undefined') return null;
  try {
    return parseConsent(readCookie(CONSENT_COOKIE));
  } catch {
    return null;
  }
}

/** The shop's own sessions and attribution may run. No answer is a no. */
export function analyticsAllowed(): boolean {
  return currentChoices()?.analytics === true;
}

/** The Meta Pixel may run. No answer is a no. */
export function marketingAllowed(): boolean {
  return currentChoices()?.marketing === true;
}
