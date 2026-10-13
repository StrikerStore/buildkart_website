/**
 * The shopper's answer to the ad-tracking question, when the shop asks it.
 *
 * Asked only when the owner switches the banner on (Admin → Settings →
 * Marketing). The answer is kept in a plain first-party cookie for a year and
 * governs **Meta only**: the browser pixel stays revoked until "granted", and
 * the API leaves a "denied" shopper out of the server-side events too. The
 * shop's own first-party analytics — sessions and order attribution, which
 * nothing outside the shop receives — are not affected.
 */
export const CONSENT_COOKIE = 'bk_consent';
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 365;

export type AdConsent = 'granted' | 'denied';

export function parseConsent(value: string | undefined | null): AdConsent | null {
  return value === 'granted' || value === 'denied' ? value : null;
}
