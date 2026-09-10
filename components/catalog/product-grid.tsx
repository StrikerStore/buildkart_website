import type { StorefrontCardDto } from '@StrikerStore/contract';
import type { Locale } from '@/lib/i18n';
import { ProductCard } from './product-card';

/**
 * The grid every listing uses.
 *
 * Two columns on a phone, four on a wide desktop — and `STOREFRONT_PAGE_SIZE`
 * is 24 precisely because it divides by 2, 3 and 4, so the last row is never a
 * single orphan card at any breakpoint.
 *
 * Two columns rather than Zepto's, which goes narrower, and four across on
 * desktop rather than six — at the 1280px page cap that is ~1.5x the tile
 * width. A bag of cement carries a brand, a weight, a unit price and a bulk
 * rate on one card; a packet of biscuits does not.
 */
export function ProductGrid({
  products,
  locale,
}: {
  products: StorefrontCardDto[];
  locale: Locale;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:gap-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.handle} product={product} locale={locale} />
      ))}
    </div>
  );
}
