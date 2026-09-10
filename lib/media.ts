import 'server-only';
import { cache } from 'react';
import { buildMediaUrl, type MediaTransform } from '@StrikerStore/contract';
import { IMAGE, SRCSET } from './media-shared';
import { api } from './api/server';

/**
 * Image URLs.
 *
 * The storefront cannot call `mediaUrl()` from the contract, and that is by
 * design rather than an oversight: that helper reads `R2_PUBLIC_BASE_URL` from
 * `process.env`, and this app deliberately holds no R2 configuration at all —
 * see `.env.example`, which has two keys and neither of them is a bucket. So
 * the API *tells* it, through `content.config`, exactly as it tells the admin
 * whether uploads are possible.
 *
 * `buildMediaUrl` is the shared builder underneath both, so a URL from here is
 * byte-identical to one the admin renders.
 */
const mediaConfig = cache(async () => (await api()).content.config.query());

/* The sizes live in `media-shared.ts` so Client Components can read them too. */
export { IMAGE, SRCSET };

/**
 * A sized image URL, or null when there is no image or no bucket configured.
 *
 * Null rather than a broken `/undefined/key` string: a caller that has to
 * handle "no image" anyway should not also have to recognise a malformed URL,
 * and a placeholder tile is a better empty state than a browser's broken-image
 * glyph.
 */
export async function imageUrl(
  key: string | null | undefined,
  transform: MediaTransform = {},
): Promise<string | null> {
  if (!key) return null;

  const { publicBaseUrl, transformsEnabled } = (await mediaConfig()).media;
  if (!publicBaseUrl) return null;

  return buildMediaUrl(publicBaseUrl, transformsEnabled, key, transform);
}

/**
 * A `srcset` and its `sizes`, for images whose rendered width varies.
 *
 * The single most valuable thing on this site for a phone on a site
 * connection. Without it a 2-column grid on a 360px screen downloads the same
 * 400px-wide card image a desktop does — roughly four times the bytes for the
 * same visible result, on the connection least able to spare them.
 *
 * Cloudflare resizes on demand, so every width here is free to add: the URLs
 * are generated, not stored, and the browser fetches exactly one of them.
 */
export async function imageSrcSet(
  key: string | null | undefined,
  widths: readonly number[],
  quality = 75,
): Promise<string | null> {
  if (!key) return null;

  const { publicBaseUrl, transformsEnabled } = (await mediaConfig()).media;
  if (!publicBaseUrl) return null;

  /*
   * Without Cloudflare transformations every width resolves to the same
   * original object, so a srcset would be a list of identical URLs — larger
   * markup for no benefit. Null lets the caller fall back to a plain `src`.
   */
  if (!transformsEnabled) return null;

  return widths
    .map((w) => `${buildMediaUrl(publicBaseUrl, true, key, { w, q: quality })} ${w}w`)
    .join(', ');
}

