import { categoryNav } from '@/lib/api/server';
import { CategoryTile } from '@/components/catalog/category-tile';
import type { Locale } from '@/lib/i18n';

/**
 * The row of category tiles under the header.
 *
 * Every quick-commerce home page opens with this, and the reason is navigational
 * rather than decorative: it is the whole catalogue's top level, visible without
 * a tap, on the screen where a shopper has not yet decided what they want. A
 * hamburger menu holding the same list is one tap and one guess worse.
 *
 * Renders nothing when there are no categories, rather than an empty band —
 * a fresh install should look unfinished, not broken.
 */
export async function CategoryStrip({ locale }: { locale: Locale }) {
  const categories = await categoryNav();
  if (categories.length === 0) return null;

  return (
    <nav aria-label={locale === 'hi' ? 'श्रेणियाँ' : 'Categories'} className="page-w page-x py-4">
      {/*
        * A rail on a phone, a grid from `sm` up. Below that the tiles would be
        * too small to recognise, which defeats the point of using pictures.
        */}
      <div className="rail flex -mx-4 gap-1 px-4 [--rail-pad:16px] sm:mx-0 sm:grid sm:grid-cols-6 sm:gap-2 sm:px-0 sm:[--rail-pad:0px] md:grid-cols-8">
        {categories.map((category) => (
          <div key={category.slug} className="w-[88px] sm:w-auto">
            <CategoryTile category={category} locale={locale} />
          </div>
        ))}
      </div>
    </nav>
  );
}
