import { STOREFRONT_SORTS, type StorefrontListQuery } from '@StrikerStore/contract';

/**
 * The URL is the state.
 *
 * Every filter, every sort, every page lives in the query string and nowhere
 * else — no client store, no context. That is what makes a filtered grid
 * shareable over WhatsApp, which is how this audience sends each other things,
 * and what makes the back button behave. It is also what lets the whole grid
 * stay a Server Component: the page re-renders on navigation because the URL
 * changed, not because a hook fired.
 *
 * Both directions live here so they cannot drift: `readQuery` parses what the
 * API expects out of `searchParams`, and `buildHref` writes it back.
 */

/** What Next hands a page: a value may be absent, single, or repeated. */
export type SearchParams = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function many(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value;
  return value === undefined ? [] : [value];
}

function positiveInt(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

/**
 * `searchParams` to the shape `storefront.category` and friends accept.
 *
 * Lenient on the way in: a junk `sort` falls back to the default rather than
 * erroring, because these values arrive from a URL anybody can edit and a
 * mistyped one should show a page, not a stack trace. The API validates them
 * again with zod regardless — this is a convenience, not the boundary.
 */
export function readQuery(params: SearchParams): StorefrontListQuery {
  const sort = one(params.sort);

  return {
    q: one(params.q)?.trim() || undefined,
    brands: many(params.brand).slice(0, 20),
    options: many(params.opt).slice(0, 10),
    minPrice: positiveInt(one(params.min)),
    maxPrice: positiveInt(one(params.max)),
    inStockOnly: one(params.stock) === '1',
    sort: (STOREFRONT_SORTS as readonly string[]).includes(sort ?? '')
      ? (sort as StorefrontListQuery['sort'])
      : 'relevance',
    page: positiveInt(one(params.page)) || 1,
  };
}

/**
 * A URL with one thing changed.
 *
 * **Any change except paging resets to page 1.** Without that rule, narrowing a
 * 6-page result to a 1-page one while on page 4 lands the shopper on an empty
 * grid that looks like "no results" — the single most common bug in a faceted
 * listing, and the reason this is one function rather than a `<Link>` built by
 * hand at each call site.
 */
export function buildHref(
  pathname: string,
  current: SearchParams,
  change: {
    /** Toggle a brand slug on or off. */
    brand?: string;
    /** Toggle an option filter, formatted "Size:12mm". */
    opt?: string;
    sort?: string;
    page?: number;
    min?: number | null;
    max?: number | null;
    stock?: boolean;
    /** Drop every filter, keeping only the search term. */
    clear?: true;
  },
): string {
  const next = new URLSearchParams();

  const q = one(current.q);
  if (q) next.set('q', q);

  if (!change.clear) {
    // Toggles: present means remove, absent means add.
    const brands = new Set(many(current.brand));
    if (change.brand) {
      if (brands.has(change.brand)) brands.delete(change.brand);
      else brands.add(change.brand);
    }
    for (const brand of brands) next.append('brand', brand);

    const options = new Set(many(current.opt));
    if (change.opt) {
      if (options.has(change.opt)) options.delete(change.opt);
      else options.add(change.opt);
    }
    for (const option of options) next.append('opt', option);

    const min = change.min !== undefined ? change.min : positiveInt(one(current.min));
    if (min !== null && min !== undefined) next.set('min', String(min));

    const max = change.max !== undefined ? change.max : positiveInt(one(current.max));
    if (max !== null && max !== undefined) next.set('max', String(max));

    const stock = change.stock !== undefined ? change.stock : one(current.stock) === '1';
    if (stock) next.set('stock', '1');
  }

  const sort = change.sort ?? one(current.sort);
  if (sort && sort !== 'relevance') next.set('sort', sort);

  // Only an explicit page survives; everything else has just invalidated it.
  if (change.page !== undefined && change.page > 1) next.set('page', String(change.page));

  const search = next.toString();
  return search ? `${pathname}?${search}` : pathname;
}

/** How many filters are on — drives the "Filters (3)" badge and Clear all. */
export function activeFilterCount(params: SearchParams): number {
  return (
    many(params.brand).length +
    many(params.opt).length +
    (one(params.min) ? 1 : 0) +
    (one(params.max) ? 1 : 0) +
    (one(params.stock) === '1' ? 1 : 0)
  );
}
