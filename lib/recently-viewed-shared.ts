/**
 * What the shopper has looked at, as the browser and the server both see it.
 *
 * **Handles only.** Not a name, not a price, not an image. On a shop whose
 * cement rate moves every morning, a price cached on Tuesday and shown on
 * Thursday is simply a wrong price — so the cookie remembers *which* products
 * and the shop is asked for the rest on every render. It is also what keeps the
 * cookie small enough to ride on every request without being noticed.
 */
export const SEEN_COOKIE = 'bk_seen';

/**
 * Twelve, and the rails show fewer.
 *
 * Enough that a shopper comparing four cements still finds the first one after
 * a detour, and short enough that the header can ask for all of them in one
 * query. `storefrontCardsByHandlesSchema` caps at the same number, so a hand-
 * edited cookie cannot ask for more.
 */
export const SEEN_MAX = 12;

/** Ninety days, matching the delivery area — a returning customer is the point. */
export const SEEN_MAX_AGE = 60 * 60 * 24 * 90;

/** A handle as the catalogue writes them: lowercase, digits, hyphens. */
const HANDLE = /^[a-z0-9][a-z0-9-]{0,190}$/;

/**
 * Parses the cookie, dropping anything malformed.
 *
 * Cookies are user-editable, so this validates rather than trusts. Nothing
 * downstream can be harmed by a bad handle — the query simply returns no row
 * for it — but a list that is mostly junk would push the real entries out.
 */
export function parseSeen(raw: string | undefined): string[] {
  if (!raw) return [];

  const seen: string[] = [];
  for (const part of raw.split(',')) {
    const handle = part.trim();
    if (!HANDLE.test(handle) || seen.includes(handle)) continue;
    seen.push(handle);
    if (seen.length >= SEEN_MAX) break;
  }
  return seen;
}

/**
 * The list with `handle` most-recent-first, de-duplicated.
 *
 * Re-viewing a product moves it to the front rather than adding it twice, which
 * is what makes a second look count as recency instead of noise.
 */
export function withSeen(current: string[], handle: string): string[] {
  return [handle, ...current.filter((entry) => entry !== handle)].slice(0, SEEN_MAX);
}

export function serializeSeen(handles: string[]): string {
  return handles.slice(0, SEEN_MAX).join(',');
}
