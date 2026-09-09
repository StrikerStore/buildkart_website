import { SlidersHorizontal } from 'lucide-react';
import type { StorefrontListResultDto } from '@buildkart/contract';
import { activeFilterCount, buildHref, type SearchParams } from '@/lib/list-query';
import type { Locale } from '@/lib/i18n';
import { EmptyState } from '@/components/ui/empty-state';
import { FilterPanel } from './filter-panel';
import { Pagination } from './pagination';
import { ProductGrid } from './product-grid';
import { SortMenu } from './sort-menu';

/**
 * The listing layout shared by category, collection and search.
 *
 * All three are the same screen with a different heading and a different source
 * of rows, so they are one component rather than three near-copies that drift —
 * the pagination reset rule in particular is the kind of thing that gets fixed
 * in one of three places.
 *
 * On a phone the filters live inside a `<details>` disclosure. That is a
 * deliberate choice over a JavaScript drawer: it opens with no hydration, works
 * before the bundle arrives, and the browser handles the focus and escape
 * behaviour that a hand-rolled sheet usually gets wrong.
 */
export function Listing({
  pathname,
  params,
  result,
  locale,
  heading,
  description,
  emptyAction,
}: {
  pathname: string;
  params: SearchParams;
  result: StorefrontListResultDto;
  locale: Locale;
  heading: React.ReactNode;
  description?: string | null;
  /** Where "nothing here" should send someone when no filters are on. */
  emptyAction?: { href: string; label: string };
}) {
  const active = activeFilterCount(params);
  const filtered = active > 0 || Boolean(params.q);

  /*
   * An out-of-range page is not an empty result, and conflating them sends a
   * shopper who followed a stale link — or a crawler that kept an old page 4 —
   * to "nothing here yet" for a category that is full. It has its own state,
   * pointing back at the first page rather than at the home page.
   */
  const outOfRange = result.total > 0 && result.products.length === 0 && result.page > 1;

  return (
    <div className="page-w page-x py-5">
      <div className="mb-4">
        {heading}
        {description && <p className="mt-1 max-w-2xl text-body2 text-ink-muted">{description}</p>}
      </div>

      <div className="gap-8 lg:flex">
        {/* --- filters: a sidebar on desktop, a disclosure on a phone ----- */}
        <aside className="mb-4 lg:mb-0 lg:w-56 lg:shrink-0">
          <details className="rounded-card border border-hairline bg-surface lg:hidden">
            <summary className="flex h-[var(--tap)] cursor-pointer list-none items-center gap-2 px-4 text-cta2 text-ink">
              <SlidersHorizontal className="size-4" aria-hidden />
              {locale === 'hi' ? 'फ़िल्टर' : 'Filters'}
              {active > 0 && (
                <span className="ml-auto rounded-pill bg-ink px-2 py-0.5 text-heading9 text-ink-inverted">
                  {active}
                </span>
              )}
            </summary>
            <div className="border-t border-hairline p-4">
              <FilterPanel
                pathname={pathname}
                params={params}
                facets={result.facets}
                locale={locale}
              />
            </div>
          </details>

          <div className="hidden lg:block">
            <FilterPanel
              pathname={pathname}
              params={params}
              facets={result.facets}
              locale={locale}
            />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-body3 text-ink-muted">
              {result.total}{' '}
              {locale === 'hi'
                ? 'सामान'
                : result.total === 1
                  ? 'product'
                  : 'products'}
            </p>
            <SortMenu
              pathname={pathname}
              params={params}
              current={
                typeof params.sort === 'string' ? params.sort : 'relevance'
              }
              locale={locale}
            />
          </div>

          {result.products.length > 0 ? (
            <>
              <ProductGrid products={result.products} locale={locale} />
              <Pagination
                pathname={pathname}
                params={params}
                page={result.page}
                totalPages={result.totalPages}
                locale={locale}
              />
            </>
          ) : outOfRange ? (
            <EmptyState
              title={
                locale === 'hi' ? 'यह पेज मौजूद नहीं है' : 'That page does not exist'
              }
              body={
                locale === 'hi'
                  ? `यहाँ ${result.totalPages} पेज हैं।`
                  : `There ${result.totalPages === 1 ? 'is' : 'are'} ${result.totalPages} page${result.totalPages === 1 ? '' : 's'} of results.`
              }
              actionHref={buildHref(pathname, params, { page: 1 })}
              actionLabel={locale === 'hi' ? 'पहला पेज' : 'Back to the first page'}
            />
          ) : (
            /*
             * Two different empty states, because they have two different
             * causes and two different fixes. Filters that match nothing want
             * "clear them"; a genuinely empty category wants a way out.
             */
            <EmptyState
              title={
                filtered
                  ? locale === 'hi'
                    ? 'इन फ़िल्टर से कुछ नहीं मिला'
                    : 'Nothing matches those filters'
                  : locale === 'hi'
                    ? 'जल्द आ रहा है'
                    : 'Coming soon'
              }
              body={
                filtered
                  ? locale === 'hi'
                    ? 'कुछ फ़िल्टर हटाकर दोबारा देखें।'
                    : 'Try removing a filter or two.'
                  : undefined
              }
              actionHref={filtered ? buildHref(pathname, params, { clear: true }) : emptyAction?.href}
              actionLabel={
                filtered
                  ? locale === 'hi'
                    ? 'फ़िल्टर हटाएँ'
                    : 'Clear filters'
                  : emptyAction?.label
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
