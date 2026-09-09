import { DEFAULT_LOCALE, isLocale, LOCALES, type Locale } from '@buildkart/contract';

export type { Locale };
export { DEFAULT_LOCALE, isLocale, LOCALES };

/**
 * The locale constants both sides of the boundary need.
 *
 * Separate from `lib/locale.ts` only because that file is `server-only` — it
 * reads the cookie store — and the header's toggle is a Client Component that
 * still needs the cookie's name and the labels. Everything here is a pure
 * value; nothing in it touches a request.
 */

/**
 * The cookie the language toggle writes.
 *
 * A cookie rather than a `/hi/...` URL prefix. The audience arrives from
 * WhatsApp links and Google, and a shared link carrying somebody else's
 * language is a worse failure than a URL that does not name the locale. It also
 * keeps one canonical URL per product for SEO instead of two competing ones.
 */
export const LOCALE_COOKIE = 'bk_locale';

/** A year: the choice is a preference, not a session. */
export const LOCALE_MAX_AGE = 60 * 60 * 24 * 365;

/** The `lang` attribute for `<html>`. Kept beside the locale so they cannot drift. */
export function htmlLang(locale: Locale): string {
  return locale === 'hi' ? 'hi-IN' : 'en-IN';
}

/** Everything the toggle needs to render itself. */
export const LOCALE_LABELS: Record<Locale, { label: string; native: string }> = {
  en: { label: 'English', native: 'A' },
  hi: { label: 'हिन्दी', native: 'अ' },
};
