import type { StorefrontReviewDto } from '@StrikerStore/contract';
import { imageUrl, IMAGE } from '@/lib/media';
import { tr, type Locale } from '@/lib/i18n';
import { SectionHeader } from '@/components/ui/section-header';
import { ReviewCards, type ReviewCard, type ReviewMedia } from './review-cards';
import { Stars } from './stars';

/**
 * What customers showed, as the owner posted it in the admin.
 *
 * Home page only, by the owner's decision: no stars on product cards and
 * nothing on a product page. So this band never claims a rating for a
 * product — the average in its header is for the shop.
 *
 * The server half resolves media URLs, since `lib/media` is server-only; the
 * cards and the viewer are a Client Component because playing a clip and
 * opening a review are state.
 *
 * A video is served as the stored file with no transform. Cloudflare's resizing
 * path is for images and yields a broken response for a clip.
 */
export async function CustomerReviews({
  titleEn,
  titleHi,
  reviews,
  averageRating,
  reviewCount,
  locale,
}: {
  titleEn: string | null;
  titleHi: string | null;
  reviews: StorefrontReviewDto[];
  averageRating: number;
  reviewCount: number;
  locale: Locale;
}) {
  const resolved = await Promise.all(
    reviews.map(async (review) => {
      const media = await Promise.all(
        review.media.map(async (item): Promise<ReviewMedia | null> => {
          if (item.kind === 'video') {
            const src = await imageUrl(item.key);
            return src ? { kind: 'video', src, thumb: null } : null;
          }
          const src = await imageUrl(item.key, IMAGE.gallery);
          return src ? { kind: 'image', src, thumb: await imageUrl(item.key, IMAGE.reviewCard) } : null;
        }),
      );

      return {
        id: review.id,
        customerName: review.customerName,
        rating: review.rating,
        verified: review.verified,
        // A null URL means no bucket is configured. A card with nothing on it
        // is worse than no card, so those drop out below.
        media: media.filter((item): item is ReviewMedia => item !== null),
      };
    }),
  );

  const cards: ReviewCard[] = resolved.filter((card) => card.media.length > 0);
  if (cards.length === 0) return null;

  const average = averageRating.toFixed(1);

  return (
    <section className="page-w page-x py-5">
      <SectionHeader titleEn={titleEn} titleHi={titleHi} locale={locale} />

      <p className="-mt-1 mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-body3 text-ink-muted">
        <Stars
          rating={Math.round(averageRating)}
          label={tr(locale, 'reviews.average', { n: average })}
        />
        <span className="text-heading6 text-ink tabular-nums">{average}</span>
        <span aria-hidden>·</span>
        <span>
          {reviewCount === 1
            ? tr(locale, 'reviews.countOne')
            : tr(locale, 'reviews.count', { n: reviewCount })}
        </span>
      </p>

      <ReviewCards reviews={cards} locale={locale} />
    </section>
  );
}
