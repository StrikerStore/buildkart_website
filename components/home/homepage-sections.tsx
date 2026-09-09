import type { StorefrontSectionDto } from '@StrikerStore/contract';
import type { Locale } from '@/lib/i18n';
import { SectionHeader } from '@/components/ui/section-header';
import { CategoryTile } from '@/components/catalog/category-tile';
import { ProductCard } from '@/components/catalog/product-card';
import { BannerStrip } from './banner-strip';
import { TrustStrip } from './trust-strip';

/**
 * The home page's running order, as the owner arranged it in the admin.
 *
 * A `switch` over a discriminated union, one branch per
 * `HOMEPAGE_SECTION_TYPES` value. That shape is the point: adding a section
 * kind means adding a branch here and a case in `resolveSection` on the server,
 * and the compiler names both if either is missed. Nothing about the page's
 * order or contents is written in this file — it all comes from the database.
 */
export function HomepageSections({
  sections,
  locale,
}: {
  sections: StorefrontSectionDto[];
  locale: Locale;
}) {
  return (
    <>
      {sections.map((section) => {
        switch (section.type) {
          case 'CATEGORY_GRID':
            return (
              <section key={section.id} className="page-w page-x py-5">
                <SectionHeader
                  titleEn={section.titleEn}
                  titleHi={section.titleHi}
                  locale={locale}
                />
                {/* Four across on a phone. Three left the tiles larger than
                    they need to be and pushed the row below off the fold. */}
                <div className="grid grid-cols-4 gap-2 md:grid-cols-6 lg:grid-cols-8">
                  {section.categories.map((category) => (
                    <CategoryTile key={category.slug} category={category} locale={locale} />
                  ))}
                </div>
              </section>
            );

          case 'PRODUCT_CAROUSEL':
          case 'TAG_CAROUSEL':
          case 'RATE_TICKER':
            return (
              <section key={section.id} className="page-w page-x py-5">
                <SectionHeader
                  titleEn={section.titleEn}
                  titleHi={section.titleHi}
                  href={section.href}
                  locale={locale}
                />
                {/*
                  * A rail, not a grid: a home page band is a *sample* the
                  * shopper swipes through, and wrapping it into rows makes it
                  * compete with the band below for the same attention.
                  */}
                <div className="rail flex -mx-4 gap-3 px-4 pb-1 [--rail-pad:16px]">
                  {section.products.map((product) => (
                    <div key={product.handle} className="w-[160px] sm:w-[180px]">
                      <ProductCard
                        product={product}
                        locale={locale}
                        // Only the rate ticker: a freshness stamp on every
                        // band would stop meaning "this one moves daily".
                        showRateStamp={section.type === 'RATE_TICKER'}
                      />
                    </div>
                  ))}
                </div>
              </section>
            );

          case 'BANNER_STRIP':
            return (
              <section key={section.id} className="page-w page-x py-5">
                <SectionHeader
                  titleEn={section.titleEn}
                  titleHi={section.titleHi}
                  locale={locale}
                />
                <BannerStrip banners={section.banners} locale={locale} />
              </section>
            );

          /*
           * No `page-w page-x` wrapper and no heading: the strip is a full-bleed
           * rule between bands, not a titled one. Its own tinted background is
           * what separates it from the section above.
           */
          case 'TRUST_STRIP':
            return (
              <TrustStrip
                key={section.id}
                markers={section.markers}
                promiseHours={section.promiseHours}
                locale={locale}
              />
            );
        }
      })}
    </>
  );
}
