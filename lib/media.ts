import 'server-only';
import { cache } from 'react';
import { buildMediaUrl, type MediaTransform } from '@StrikerStore/contract';
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
 * The widths the storefront asks for, named by the slot rather than the number.
 *
 * Naming them is what stops a card asking for 1600px because someone copied a
 * hero. On a budget Android phone over a weak connection that is the whole
 * difference between a page that loads and one that does not — the reason
 * `format=auto` exists in the builder.
 */
export const IMAGE = {
  /** Category tile in the header strip. */
  tile: { w: 200, q: 75 } satisfies MediaTransform,
  /** Product card in a grid or carousel. */
  card: { w: 400, q: 75 } satisfies MediaTransform,
  /** Product page gallery. */
  gallery: { w: 900, q: 80 } satisfies MediaTransform,
  /** Home hero, phone. */
  heroMobile: { w: 800, q: 75 } satisfies MediaTransform,
  /** Home hero, desktop. */
  heroDesktop: { w: 1600, q: 75 } satisfies MediaTransform,
  /*
   * One of the three promo cards under the hero.
   *
   * Its own size rather than the hero's: three across a 1280px page is roughly
   * a 416px card, and serving 1600px art into it was four times the bytes for
   * no visible gain — on the connection least able to spare them.
   */
  stripCard: { w: 840, q: 75 } satisfies MediaTransform,
  /** Cart and order lines. */
  thumb: { w: 120, q: 75 } satisfies MediaTransform,
} as const;

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

/**
 * The widths each slot is worth generating, and the `sizes` that tells the
 * browser which to pick *before* layout has happened.
 *
 * `sizes` has to be a media-query expression rather than a CSS width because
 * the browser chooses the image while the HTML is still parsing — it does not
 * yet know the grid resolved to 168px. These mirror the breakpoints in
 * `ProductGrid` and `Gallery`; a change there wants a change here.
 */
export const SRCSET = {
  card: {
    widths: [160, 200, 280, 400] as const,
    sizes: '(min-width: 1280px) 200px, (min-width: 1024px) 22vw, (min-width: 640px) 30vw, 45vw',
  },
  tile: {
    widths: [88, 120, 200] as const,
    sizes: '(min-width: 640px) 120px, 88px',
  },
  gallery: {
    widths: [360, 600, 900] as const,
    sizes: '(min-width: 1024px) 512px, 100vw',
  },
  hero: {
    widths: [640, 800, 1200, 1600, 2048] as const,
    /*
     * The page is capped at `--page-max` (1280px) plus 24px of gutter either
     * side, so past 1328px the hero stops growing. Saying `100vw` beyond that
     * would have a 2560px monitor fetch the largest crop for a 1280px slot.
     */
    sizes: '(min-width: 1328px) 1280px, 100vw',
  },
  stripCard: {
    widths: [320, 420, 560, 840] as const,
    // Three across from `md`, a fixed-width rail item below it.
    sizes: '(min-width: 1328px) 416px, (min-width: 768px) 32vw, 300px',
  },
} as const;
