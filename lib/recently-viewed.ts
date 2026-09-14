import 'server-only';
import { cookies } from 'next/headers';
import { cache } from 'react';
import type { StorefrontCardDto } from '@StrikerStore/contract';
import { api } from './api/server';
import { parseSeen, SEEN_COOKIE } from './recently-viewed-shared';

export * from './recently-viewed-shared';

/**
 * The products this browser has looked at, freshly priced.
 *
 * `cache`d for the reason `storeSettings` is: the header's search panel, the
 * home page and a product page's foot can all ask, and they should cost one
 * query between them rather than three.
 *
 * Swallows, like `publishedMenu` — a rail of things you looked at last week is
 * the most optional thing on the page, and it must never be the reason a
 * product page fails to render.
 */
const seenCards = cache(async (): Promise<StorefrontCardDto[]> => {
  const handles = parseSeen((await cookies()).get(SEEN_COOKIE)?.value);
  if (handles.length === 0) return [];

  try {
    return await (await api()).storefront.cardsByHandles.query({ handles });
  } catch {
    return [];
  }
});

/**
 * The rail's rows, minus whatever is already on screen.
 *
 * `exclude` is the product being viewed: a "recently viewed" shelf whose first
 * tile is the page you are standing on reads as a bug, and it is — the handle
 * was recorded a moment ago by this very page.
 */
export async function recentlyViewed(exclude?: string): Promise<StorefrontCardDto[]> {
  const cards = await seenCards();
  return exclude ? cards.filter((card) => card.handle !== exclude) : cards;
}
