import type { MediaTransform } from '@StrikerStore/contract';

/*
 * The image sizes, with no server dependency.
 *
 * Split out of `media.ts` for the same reason as `locale-shared.ts`: that file
 * opens with `server-only` and reaches for the API client, so a Client
 * Component asking it for a `sizes` string would drag `next/headers` into the
 * browser bundle. These are plain numbers; both sides can have them.
 *
 * `media.ts` re-exports everything here, so a Server Component keeps importing
 * from `@/lib/media` and nothing moved as far as it is concerned.
 */

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
 * The widths each slot is worth generating, and the `sizes` that tells the
 * browser which to pick *before* layout has happened.
 *
 * `sizes` has to be a media-query expression rather than a CSS width because
 * the browser chooses the image while the HTML is still parsing — it does not
 * yet know the grid resolved to 235px. These mirror the breakpoints in
 * `ProductGrid` and `Gallery`; a change there wants a change here.
 */
export const SRCSET = {
  card: {
    widths: [160, 240, 320, 480, 640] as const,
    sizes: '(min-width: 1280px) 240px, (min-width: 1024px) 25vw, (min-width: 640px) 30vw, 45vw',
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
