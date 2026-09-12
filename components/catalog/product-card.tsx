import Link from 'next/link';
import { formatINR, type StorefrontCardDto } from '@StrikerStore/contract';
import { imageSrcSet, imageUrl, IMAGE, SRCSET } from '@/lib/media';
import { cn } from '@/lib/cn';
import type { Locale } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';
import { PriceBlock } from './price-block';
import { AddButton } from './add-button';
import { RateStamp } from './rate-stamp';

/**
 * The product tile.
 *
 * Zepto's card anatomy, in Zepto's order, because that order encodes what a
 * shopper reads first: image, then the saving, then what it is, then what it
 * costs, then the button. The one departure is the **unit label**, which a
 * grocery app does not need and a materials shop cannot do without — see
 * `PriceBlock`.
 *
 * The whole card is one link with the ADD button layered above it, rather than
 * a link wrapping a button. Nesting an interactive element inside an anchor is
 * invalid HTML and, more practically, makes the button's tap ambiguous on a
 * touchscreen — the exact control this audience uses most.
 */
export async function ProductCard({
  product,
  locale,
  showRateStamp = false,
}: {
  product: StorefrontCardDto;
  locale: Locale;
  /** Set by the rate ticker, where price freshness is the point of the row. */
  showRateStamp?: boolean;
}) {
  const [src, srcSet] = await Promise.all([
    imageUrl(product.imageKey, IMAGE.card),
    imageSrcSet(product.imageKey, SRCSET.card.widths),
  ]);
  const name = (locale === 'hi' && product.nameHi) || product.nameEn;
  const href = `/products/${product.handle}`;

  return (
    <article
      className={cn(
        'relative flex h-full flex-col rounded-card border border-hairline bg-surface p-2.5',
        'transition-shadow hover:shadow-raised',
        !product.inStock && 'opacity-70',
      )}
    >
      <div className="relative mb-2 aspect-square overflow-hidden rounded-box bg-surface-muted">
        {src ? (
          // A plain <img>, not next/image. The bytes come from Cloudflare's
          // image resizer, which already does the format negotiation and
          // resizing next/image would do — running both means paying twice and
          // routing every product image through this app's own server.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            {...(srcSet ? { srcSet, sizes: SRCSET.card.sizes } : {})}
            alt={name}
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
        ) : (
          <div className="grid size-full place-items-center text-body5 text-ink-faint">
            {locale === 'hi' ? 'फ़ोटो नहीं' : 'No photo'}
          </div>
        )}

        {product.discountPercent !== null && product.discountPercent > 0 && (
          <span className="absolute left-0 top-0 rounded-br-box rounded-tl-box bg-success px-1.5 py-1 text-banner2 text-ink-inverted">
            {product.discountPercent}% OFF
          </span>
        )}

        {!product.inStock && (
          <span className="absolute inset-x-0 bottom-0 bg-ink/75 py-1 text-center text-heading9 text-ink-inverted">
            {locale === 'hi' ? 'स्टॉक ख़त्म' : 'Out of stock'}
          </span>
        )}
      </div>

      {/*
        * Free delivery, on every tile.
        *
        * Directly under the photo and above everything variable, because the
        * price row is pinned to the bottom by `mt-auto`: anything placed after
        * it lands at a different height on every card, depending on whether
        * that card carries a bulk rate. Here it sits on a fixed line and the
        * grid keeps its rhythm.
        */}
      <p className="mb-2">
        <Badge tone="SUCCESS">
          {locale === 'hi' ? 'फ़्री डिलीवरी' : 'Free delivery'}
        </Badge>
      </p>

      {product.badges.length > 0 && (
        <div className="mb-1 flex flex-wrap gap-1">
          {/* Two at most. A card carrying four badges has told the shopper
              nothing, and the tag ordering already says which matter. */}
          {product.badges.slice(0, 2).map((badge) => (
            <Badge key={badge.id} tone={badge.tone}>
              {(locale === 'hi' && badge.labelHi) || badge.labelEn}
            </Badge>
          ))}
        </div>
      )}

      {product.brandName && (
        <p className="text-body6 uppercase tracking-wide text-ink-faint">{product.brandName}</p>
      )}

      <h3 className="clamp-2 text-heading7 text-ink">
        {/* The card's link, stretched over the whole article by `after:` —
            this is what keeps the anchor and the ADD button from nesting. */}
        <Link href={href} className="after:absolute after:inset-0 after:content-['']">
          {name}
        </Link>
      </h3>

      {showRateStamp && product.priceUpdatedAt && (
        <RateStamp updatedAt={product.priceUpdatedAt} locale={locale} />
      )}

      {/* mt-auto pins the price row to the bottom, so cards in a row line up
          however many lines their names took.

          `items-center`, not `items-end`: the stepper is 40px and the price is
          a single 20px line, so bottom-aligning them left the price sitting
          under the button's lower half instead of beside it. */}
      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
        <PriceBlock
          price={product.price}
          compareAtPrice={product.compareAtPrice}
          unitLabelEn={product.unitLabelEn}
          unitLabelHi={product.unitLabelHi}
          locale={locale}
        />

        {/* Above the stretched link, or it would never receive the tap. */}
        <div className="relative z-10">
          <AddButton
            variantId={product.variantId}
            handle={product.handle}
            inStock={product.inStock}
            locale={locale}
          />
        </div>
      </div>

      {/*
        * The best bulk rate, and what it takes to get it.
        *
        * The condition is not decoration: a bare "Bulk: ₹365" is a price the
        * product page will refuse to honour until forty bags are on the line,
        * and a card that quotes an unreachable number is worse than one that
        * quotes none.
        */}
      {product.bestBulkPrice && product.bulkFrom && (
        <p className="pt-1 text-body6 text-success">
          {locale === 'hi' ? 'बल्क' : 'Bulk'}: {formatINR(product.bestBulkPrice)}
          {product.bulkFrom.minQuantity !== null
            ? ` · ${product.bulkFrom.minQuantity}+`
            : ` · ${locale === 'hi' ? 'ऊपर' : 'above'} ${formatINR(product.bulkFrom.minAmount!)}`}
        </p>
      )}
    </article>
  );
}
