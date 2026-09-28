'use client';

import { productHandleFromHref, reportSearchHit } from '@/lib/search-hit';

/**
 * Reports which product a shopper opens from the search results page.
 *
 * One listener on a wrapper rather than a prop threaded through `Listing` and
 * every card: the listing is shared with category and collection pages, which
 * must not count as search, and this way it does not have to know it is being
 * watched. Capture phase, so a card that stops propagation still counts.
 *
 * `display: contents`, so the wrapper adds no box and the listing's layout is
 * exactly what it was.
 */
export function SearchHitTracker({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="contents"
      onClickCapture={(event) => {
        const link = (event.target as Element).closest?.('a[href]');
        const handle = productHandleFromHref(link?.getAttribute('href') ?? null);
        if (handle) reportSearchHit(handle);
      }}
    >
      {children}
    </div>
  );
}
