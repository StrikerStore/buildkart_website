'use server';

import { cookies } from 'next/headers';
import type { BulkTierBasis, StorefrontProductDto } from '@StrikerStore/contract';
import { api } from '@/lib/api/server';
import { currentCart } from '@/lib/cart';
import { imageUrl, IMAGE } from '@/lib/media';
import {
  parseSeen,
  SEEN_COOKIE,
  SEEN_MAX_AGE,
  serializeSeen,
  withSeen,
} from '@/lib/recently-viewed-shared';

/**
 * Remembers that this browser looked at a product.
 *
 * A Server Action rather than something the page does while rendering, because
 * a Server Component cannot set a cookie mid-render — Next allows it only from
 * an action, a route handler or middleware, and this site has no middleware.
 * `RecordView` fires it once after paint, so it never delays the page.
 *
 * Writes a handle and nothing else. See `recently-viewed-shared.ts` for why the
 * prices are deliberately not cached alongside it.
 */
export async function recordViewed(handle: string): Promise<void> {
  const store = await cookies();
  const next = withSeen(parseSeen(store.get(SEEN_COOKIE)?.value), handle);

  store.set(SEEN_COOKIE, serializeSeen(next), {
    // Readable by the server on the next request, which is the whole point;
    // there is nothing secret in a list of product handles.
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SEEN_MAX_AGE,
  });
}

/** What the quick-options sheet needs to sell a multi-variant product. */
export type QuickOptionsData = {
  handle: string;
  nameEn: string;
  nameHi: string | null;
  imageSrc: string | null;
  bulkTierBasis: BulkTierBasis;
  options: StorefrontProductDto['options'];
  variants: StorefrontProductDto['variants'];
  /** variantId → quantity already in the cart, as the product page passes it. */
  quantities: Record<string, number>;
};

/**
 * The product behind a card's Options button, loaded when the sheet opens.
 *
 * On open rather than with the grid: every multi-variant card on a page would
 * otherwise carry its whole variant list and ladders into the HTML, for a sheet
 * most shoppers never open. Only the fields the sheet uses leave the server —
 * the description, FAQs and related products stay on the product page.
 */
export async function loadQuickOptions(handle: string): Promise<QuickOptionsData | null> {
  const [product, cart] = await Promise.all([
    (await api()).storefront.product.query({ handle }),
    currentCart(),
  ]);
  if (!product) return null;

  return {
    handle: product.handle,
    nameEn: product.nameEn,
    nameHi: product.nameHi,
    imageSrc: await imageUrl(product.images[0]?.key, IMAGE.thumb),
    bulkTierBasis: product.bulkTierBasis,
    options: product.options,
    variants: product.variants,
    quantities: Object.fromEntries(cart.map((line) => [line.variantId, line.qty])),
  };
}
