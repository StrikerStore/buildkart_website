import { formatINR, type StorefrontCardDto } from '@StrikerStore/contract';
import { cn } from '@/lib/cn';
import type { Locale } from '@/lib/i18n';

/**
 * Price, MRP and the unit it is per.
 *
 * The unit label is not decoration. "₹432" for a bag of cement and "₹69.90" for
 * a kilo of sariya are the same shop quoting two different things, and a
 * contractor comparing them without "per bag" and "per kg" is being misled by
 * the layout. It sits immediately after the number for that reason, not on its
 * own line where it reads as a caption.
 */
export function PriceBlock({
  price,
  compareAtPrice,
  unitLabelEn,
  unitLabelHi,
  locale,
  size = 'card',
}: Pick<StorefrontCardDto, 'price' | 'compareAtPrice' | 'unitLabelEn' | 'unitLabelHi'> & {
  locale: Locale;
  size?: 'card' | 'page';
}) {
  if (!price) {
    return (
      <span className="text-body3 text-ink-faint">
        {locale === 'hi' ? 'भाव उपलब्ध नहीं' : 'Price on request'}
      </span>
    );
  }

  const unit = (locale === 'hi' && unitLabelHi) || unitLabelEn;
  // Only when it is genuinely higher: an MRP equal to the price struck through
  // is a fake discount, and this audience notices.
  const showCompare = compareAtPrice && Number(compareAtPrice) > Number(price);

  return (
    <span className="flex flex-wrap items-baseline gap-x-1.5">
      <span className={cn('text-ink', size === 'page' ? 'text-heading2' : 'text-heading5')}>
        {formatINR(price)}
      </span>
      {unit && (
        <span className={cn('text-ink-muted', size === 'page' ? 'text-body2' : 'text-body5')}>
          {unit}
        </span>
      )}
      {showCompare && (
        <span
          className={cn(
            'text-ink-faint line-through',
            size === 'page' ? 'text-body2' : 'text-body5',
          )}
        >
          {formatINR(compareAtPrice)}
        </span>
      )}
    </span>
  );
}
