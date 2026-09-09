import type { StorefrontCardDto } from '@buildkart/contract';
import type { Locale } from '@/lib/i18n';
import { ProductCard } from './product-card';

/**
 * The grid every listing uses.
 *
 * Two columns on a phone, six on a wide desktop — and `STOREFRONT_PAGE_SIZE` is
 * 24 precisely because it divides by 2, 3, 4 and 6, so the last row is never a
 * single orphan card at any breakpoint.
 *
 * Two columns rather than Zepto's, which goes narrower. A bag of cement has a
 * brand, a weight and a unit price to read; a packet of biscuits does not.
 */
export function ProductGrid({
  products,
  locale,
}: {
  products: StorefrontCardDto[];
  locale: Locale;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {products.map((product) => (
        <ProductCard key={product.handle} product={product} locale={locale} />
      ))}
    </div>
  );
}
