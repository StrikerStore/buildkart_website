'use client';

import { useEffect, useRef, useState } from 'react';
import { BadgeCheck, ChevronLeft, ChevronRight, Images, Play, X } from 'lucide-react';
import { tr, type Locale } from '@/lib/i18n';
import { Stars } from './stars';

export type ReviewMedia =
  | { kind: 'image'; src: string; thumb: string | null }
  | { kind: 'video'; src: string; thumb: null };

export type ReviewCard = {
  id: string;
  customerName: string;
  rating: number;
  verified: boolean;
  /** Never empty — the section drops a review with nothing to show. */
  media: ReviewMedia[];
};

/**
 * The review rail: portrait media cards, like a row of short videos.
 *
 * No written text, by the owner's decision — a review here is what the
 * customer showed. The stars, the name and the Verified badge sit over the
 * bottom of the picture on a dark fade, the way a video app captions a clip.
 *
 * A rail rather than a grid, like the product bands: reviews are a sample the
 * shopper swipes through, and a wall of tall cards would push the rest of the
 * home page off the fold on a phone.
 */
export function ReviewCards({ reviews, locale }: { reviews: ReviewCard[]; locale: Locale }) {
  const [viewing, setViewing] = useState<{ review: number; media: number } | null>(null);

  return (
    <>
      <ul className="rail flex -mx-4 gap-3 px-4 pb-1 [--rail-pad:16px]">
        {reviews.map((review, reviewIndex) => (
          <li key={review.id} className="w-[160px] shrink-0 sm:w-[196px] lg:w-[216px]">
            <Card
              review={review}
              locale={locale}
              onOpen={() => setViewing({ review: reviewIndex, media: 0 })}
            />
          </li>
        ))}
      </ul>

      <Viewer
        review={viewing ? reviews[viewing.review]! : null}
        index={viewing?.media ?? 0}
        onIndex={(media) => setViewing((current) => (current ? { ...current, media } : current))}
        onClose={() => setViewing(null)}
        locale={locale}
      />
    </>
  );
}

/** Name, stars and badge — shared by the card and the viewer so they cannot drift. */
function Byline({ review, locale }: { review: ReviewCard; locale: Locale }) {
  return (
    <>
      <Stars
        rating={review.rating}
        tone="light"
        label={tr(locale, 'reviews.rated', { n: review.rating })}
      />
      <span className="mt-1 block truncate text-heading7 text-white">{review.customerName}</span>
      {review.verified && (
        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-success px-1.5 py-0.5 text-body5 text-white">
          <BadgeCheck className="size-3.5" aria-hidden />
          {tr(locale, 'reviews.verified')}
        </span>
      )}
    </>
  );
}

function Card({
  review,
  locale,
  onOpen,
}: {
  review: ReviewCard;
  locale: Locale;
  onOpen: () => void;
}) {
  const lead = review.media[0]!;
  const extra = review.media.length > 1;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={tr(locale, 'reviews.open', { name: review.customerName })}
      className="relative block aspect-[9/16] w-full overflow-hidden rounded-card bg-ink text-left"
    >
      {lead.kind === 'image' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={lead.thumb ?? lead.src}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <InViewVideo src={lead.src} />
      )}

      {lead.kind === 'video' && (
        <span className="absolute top-2 left-2 grid size-7 place-items-center rounded-full bg-ink/60">
          <Play className="size-3.5 fill-white text-white" aria-hidden />
        </span>
      )}

      {extra && (
        <span
          className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-ink/60 px-2 py-0.5 text-body5 text-white tabular-nums"
          title={tr(locale, 'reviews.files', { n: review.media.length })}
        >
          <Images className="size-3.5" aria-hidden />
          {review.media.length}
        </span>
      )}

      {/*
        * The fade starts well above the text so the name stays readable over a
        * bright photo — a white wall, a sunlit bag of cement — without a box.
        */}
      <span className="absolute inset-x-0 bottom-0 flex flex-col items-start bg-linear-to-t from-ink/90 via-ink/50 to-transparent px-3 pt-16 pb-3">
        <Byline review={review} locale={locale} />
      </span>
    </button>
  );
}

/**
 * A card's clip, playing muted and on loop while it is on screen.
 *
 * Paused off screen, so a rail of six videos plays one or two at a time rather
 * than all of them. It does not play at all under reduced motion or the
 * browser's data saver — a phone on a metered site connection asked not to
 * spend data, and a looping video is exactly that. The first frame stands in.
 */
function InViewVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saveData =
      (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData ===
      true;
    if (reducedMotion || saveData || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // `play()` rejects if the browser refuses autoplay; the first frame
        // is still showing, which is the right fallback.
        if (entry?.isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.6 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      // `#t=0.1` is what makes iOS Safari paint a first frame rather than black.
      src={`${src}#t=0.1`}
      muted
      loop
      playsInline
      preload="metadata"
      tabIndex={-1}
      aria-hidden
      className="pointer-events-none absolute inset-0 size-full object-cover"
    />
  );
}

/**
 * The review full screen: every photo and video, with the byline under it.
 *
 * A native `<dialog>` like the bulk-price sheet: `showModal` brings the backdrop,
 * the focus trap and Escape for free. The media is only mounted while open, so
 * closing stops a video with sound rather than leaving it playing behind the
 * page.
 */
function Viewer({
  review,
  index,
  onIndex,
  onClose,
  locale,
}: {
  review: ReviewCard | null;
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
  locale: Locale;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const open = review !== null;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const count = review?.media.length ?? 0;
  const item = review?.media[index];

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      onKeyDown={(event) => {
        if (count < 2) return;
        if (event.key === 'ArrowRight') onIndex((index + 1) % count);
        if (event.key === 'ArrowLeft') onIndex((index - 1 + count) % count);
      }}
      aria-label={review ? tr(locale, 'reviews.mediaFrom', { name: review.customerName }) : undefined}
      // `m-auto`: preflight's `margin: 0` otherwise pins a modal dialog to the
      // top-left corner — see `PriceLadderSheet`. Portrait-shaped, like the cards.
      className="m-auto w-[min(26rem,calc(100vw-2rem))] overflow-hidden rounded-card bg-ink p-0 text-white backdrop:bg-ink/80"
    >
      {review && item && (
        <div className="relative">
          <div className="grid h-[min(80dvh,46rem)] place-items-center">
            {item.kind === 'image' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.src} alt="" className="max-h-full max-w-full object-contain" />
            ) : (
              // `key` so moving between two videos starts the second from zero.
              <video
                key={item.src}
                src={item.src}
                controls
                autoPlay
                playsInline
                className="max-h-full max-w-full"
              />
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={tr(locale, 'reviews.close')}
            className="absolute top-2 right-2 grid size-10 place-items-center rounded-full bg-ink/60 hover:bg-ink/80"
          >
            <X className="size-5" aria-hidden />
          </button>

          {count > 1 && (
            <span className="absolute top-3.5 left-3 rounded-full bg-ink/60 px-2 py-0.5 text-body5 tabular-nums">
              {index + 1} / {count}
            </span>
          )}

          <div className="flex flex-col items-start border-t border-white/10 px-4 py-3">
            <Byline review={review} locale={locale} />
          </div>

          {count > 1 && (
            <>
              <button
                type="button"
                onClick={() => onIndex((index - 1 + count) % count)}
                aria-label={tr(locale, 'reviews.previous')}
                className="absolute top-[calc(min(80dvh,46rem)/2)] left-2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-ink/60 hover:bg-ink/80"
              >
                <ChevronLeft className="size-6" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => onIndex((index + 1) % count)}
                aria-label={tr(locale, 'reviews.next')}
                className="absolute top-[calc(min(80dvh,46rem)/2)] right-2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-ink/60 hover:bg-ink/80"
              >
                <ChevronRight className="size-6" aria-hidden />
              </button>
            </>
          )}
        </div>
      )}
    </dialog>
  );
}
