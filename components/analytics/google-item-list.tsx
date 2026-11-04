'use client';

import { useEffect } from 'react';
import type { StorefrontCardDto } from '@StrikerStore/contract';
import { googleAnalyticsEvent } from '@/lib/google-tag';
import { CURRENCY } from '@/lib/meta-pixel';
import { gaItem } from '@/lib/google-ecommerce';
import { productHandleFromHref } from '@/lib/search-hit';

/**
 * GA4's `view_item_list` for a page of a listing, and `select_item` for the
 * product a shopper opens from it.
 *
 * A wrapper with one click listener, like `<SearchHitTracker>`, rather than a
 * prop threaded into every card. Capture phase, so a card that stops
 * propagation still counts; `display: contents`, so the listing's layout is
 * exactly what it was.
 */
export function GoogleItemList({
  list,
  products,
  firstIndex,
  children,
}: {
  list: { id: string; name: string };
  products: StorefrontCardDto[];
  /** The first card's position across pages, so page 2 does not restart at 0. */
  firstIndex: number;
  children: React.ReactNode;
}) {
  const items = products.map((product, offset) => ({
    ...gaItem({
      handle: product.handle,
      name: product.nameEn,
      price: product.price ?? '0',
      brand: product.brandName,
    }),
    index: firstIndex + offset,
  }));
  const shown = items.map((item) => item.item_id).join(',');

  useEffect(() => {
    if (items.length === 0) return;
    googleAnalyticsEvent('view_item_list', {
      item_list_id: list.id,
      item_list_name: list.name,
      items,
    });
    // Once per page of results: a re-render with the same cards is not a
    // second view of them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.id, shown]);

  return (
    <div
      className="contents"
      onClickCapture={(event) => {
        const link = (event.target as Element).closest?.('a[href]');
        const handle = productHandleFromHref(link?.getAttribute('href') ?? null);
        const item = handle ? items.find((candidate) => candidate.item_id === handle) : undefined;
        if (!item) return;
        googleAnalyticsEvent('select_item', {
          item_list_id: list.id,
          item_list_name: list.name,
          currency: CURRENCY,
          items: [item],
        });
      }}
    >
      {children}
    </div>
  );
}
