import type { StorefrontCardDto } from '@StrikerStore/contract';
import type { Locale } from '@/lib/i18n';
import { tr } from '@/lib/i18n';
import { ProductCard } from './product-card';

/**
 * The "recently viewed" rail.
 *
 * A rail rather than a grid, and the same one the home page's bands and the
 * product page's suggestions use — this is a shelf to glance along, not a
 * result set to work through.
 *
 * Renders nothing below two tiles. One tile is not a history, it is the thing
 * you just looked at, and a band with a heading and a single card reads as
 * something that failed to load.
 */
export function RecentlyViewed({
  cards,
  locale,
  className,
}: {
  cards: StorefrontCardDto[];
  locale: Locale;
  className?: string;
}) {
  if (cards.length < 2) return null;

  return (
    <section className={className}>
      <h2 className="mb-3 text-heading4 text-ink">{tr(locale, 'recent.title')}</h2>

      <div className="rail flex -mx-4 gap-3 px-4 pb-1 [--rail-pad:16px] sm:mx-0 sm:px-0 sm:[--rail-pad:0px]">
        {cards.map((card) => (
          <div key={card.handle} className="w-[160px] sm:w-[180px]">
            <ProductCard product={card} locale={locale} />
          </div>
        ))}
      </div>
    </section>
  );
}
