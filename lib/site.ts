import 'server-only';

/**
 * Where this storefront lives on the public internet.
 *
 * The API cannot answer this: it may be reached at a private Railway hostname
 * and has no idea what domain a browser used to get here. So the origin is this
 * app's own configuration, and every absolute URL — canonicals, the sitemap,
 * Open Graph images — is built from it.
 *
 * A wrong value is worse than an obviously missing one: a sitemap full of
 * `http://localhost:3000` submitted to Google is a real incident, and one full
 * of a staging domain is a slower version of the same. So the fallback is
 * localhost, which fails loudly in the one place it matters, rather than a
 * plausible-looking production guess.
 */
export function siteUrl(): string {
  const raw = process.env.SITE_URL ?? 'http://localhost:3000';
  return raw.replace(/\/+$/, '');
}

/** An absolute URL for a path this app serves. */
export function absoluteUrl(path: string): string {
  return `${siteUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}
