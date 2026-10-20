/**
 * The shopper's answers on the cookie banner, as both the server and the
 * browser read them.
 *
 * Two optional purposes, each its own yes or no:
 *
 *   - **analytics** — the shop's own visit sessions (`bk_vid`, `bk_sid`) and
 *     where a visit came from (`bk_attr`). First-party, but still about a
 *     person, so under the DPDP Act it waits for a yes.
 *   - **marketing** — the Meta Pixel and the Conversions API.
 *
 * Everything else the site stores (the cart, the language, the delivery area,
 * the sign-in) is needed for the shop to work at all and is not asked about.
 *
 * The cookie's format lives in the contract (`parseConsentCookie`), so the page
 * that writes it and the server action that reads it cannot disagree. No answer
 * is a no: nothing optional runs until the shopper has chosen.
 */
import { parseConsentCookie, type ConsentChoices } from '@StrikerStore/contract';

export const CONSENT_COOKIE = 'bk_consent';
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 365;

export type { ConsentChoices };

export function parseConsent(value: string | undefined | null): ConsentChoices | null {
  return parseConsentCookie(value);
}

/**
 * Whether this browser said yes to analytics, from its `bk_consent` cookie
 * value. For the server-side senders — the trending signals and the visit
 * beacon — which must check for themselves rather than trust the page.
 */
export function allowsAnalytics(value: string | undefined | null): boolean {
  return parseConsent(value)?.analytics === true;
}

/**
 * The answers as the API takes them with an order or a sign-in. Absent when
 * the banner was never answered — which the API treats exactly like a no.
 */
export function consentForApi(choices: ConsentChoices | null) {
  if (!choices) return {};
  return {
    adConsent: choices.marketing ? ('granted' as const) : ('denied' as const),
    analyticsConsent: choices.analytics ? ('granted' as const) : ('denied' as const),
    consentAt: new Date(choices.at).toISOString(),
    consentId: choices.id,
  };
}
