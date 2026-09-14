import type { StorefrontReviewDto } from '@StrikerStore/contract';
import { imageUrl, IMAGE } from '@/lib/media';
import { tr, type Locale } from '@/lib/i18n';
import { SectionHeader } from '@/components/ui/section-header';
import { ReviewCards, type ReviewCard } from './review-cards';
import { Stars } from './stars';

/**
 * What customers say, as the owner posted it in the admin.
 *
 * Home page only, by the owner's decision: no stars on product cards and
 * nothing on a product page. So this band never claims a rating for a
 * product — the average in its header is for the shop.
 *
 * The server half resolves media URLs, since `lib/media` is server-only; the
 * cards and the viewer are a Client Component because opening a photo or
 * playing a video is state.
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
  const cards: ReviewCard[] = await Promise.all(
    reviews.map(async (review) => {
      const media = await Promise.all(
        review.media.map(async (item) =>
          item.kind === 'video'
            ? { kind: 'video' as const, src: await imageUrl(item.key), thumb: null }
            : {
                kind: 'image' as const,
                src: await imageUrl(item.key, IMAGE.gallery),
                thumb: await imageUrl(item.key, IMAGE.reviewThumb),
              },
        ),
      );

      return {
        id: review.id,
        customerName: review.customerName,
        rating: review.rating,
        body: review.body,
        verified: review.verified,
        // A null src means no bucket is configured; a tile that opens nothing
        // is worse than no tile.
        media: media.flatMap((item) => (item.src ? [{ ...item, src: item.src }] : [])),
      };
    }),
  );

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
