/**
 * Tell the shop a product was opened from search.
 *
 * `sendBeacon` because the click that calls this is also a navigation: an
 * ordinary `fetch` started now can be cancelled by the page unloading under
 * it, and a beacon is the one request the browser promises to finish. The
 * `keepalive` fetch is the fallback for the rare browser without it.
 */
export function reportSearchHit(handle: string): void {
  const body = JSON.stringify({ handle });
  try {
    const sent =
      typeof navigator.sendBeacon === 'function' &&
      navigator.sendBeacon('/api/search-hit', new Blob([body], { type: 'application/json' }));
    if (!sent) {
      void fetch('/api/search-hit', {
        method: 'POST',
        body,
        headers: { 'content-type': 'application/json' },
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // A lost count is not worth a broken click.
  }
}

/** The handle from a product link's href, or null for any other link. */
export function productHandleFromHref(href: string | null): string | null {
  const match = href?.match(/^\/products\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]!) : null;
}
