'use client';

import { useEffect, useRef, useState } from 'react';
import { BadgeCheck, ChevronLeft, ChevronRight, Play, X } from 'lucide-react';
import { tr, type Locale } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import { Stars } from './stars';

export type ReviewMedia =
  | { kind: 'image'; src: string; thumb: string | null }
  | { kind: 'video'; src: string; thumb: null };

export type ReviewCard = {
  id: string;
  customerName: string;
  rating: number;
  body: string;
  verified: boolean;
  media: ReviewMedia[];
};

/** Past this many characters the card clamps and offers "Read more". */
const CLAMP_AT = 180;

/**
 * The review rail, and the viewer its photos and videos open in.
 *
 * A rail rather than a grid, like the product bands: reviews are a sample the
 * shopper swipes through, and a wall of them would push the rest of the home
 * page off the fold on a phone.
 */
export function ReviewCards({ reviews, locale }: { reviews: ReviewCard[]; locale: Locale }) {
  const [viewing, setViewing] = useState<{ review: number; media: number } | null>(null);

  return (
    <>
      <ul className="rail flex -mx-4 gap-3 px-4 pb-1 [--rail-pad:16px]">
        {reviews.map((review, reviewIndex) => (
          <li key={review.id} className="flex w-[280px] shrink-0 sm:w-[320px]">
            <Card
              review={review}
              locale={locale}
              onOpen={(mediaIndex) => setViewing({ review: reviewIndex, media: mediaIndex })}
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

function Card({
  review,
  locale,
  onOpen,
}: {
  review: ReviewCard;
  locale: Locale;
  onOpen: (mediaIndex: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const long = review.body.length > CLAMP_AT;
  let photo = 0;
  let video = 0;

  return (
    <article className="flex w-full flex-col gap-2.5 rounded-card border border-hairline bg-surface p-4">
      <Stars rating={review.rating} label={tr(locale, 'reviews.rated', { n: review.rating })} />

      <div>
        {/* `pre-line` keeps the paragraph breaks the owner typed. */}
        <p className={cn('whitespace-pre-line text-body2 text-ink', long && !expanded && 'line-clamp-4')}>
          {review.body}
        </p>
        {long && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            className="mt-1 text-cta3 text-brand-text hover:underline"
          >
            {tr(locale, expanded ? 'reviews.readLess' : 'reviews.readMore')}
          </button>
        )}
      </div>

      {review.media.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {review.media.map((item, index) => {
            const label =
              item.kind === 'video'
                ? tr(locale, 'reviews.playVideo', { n: ++video })
                : tr(locale, 'reviews.openPhoto', { n: ++photo });
            return (
              <li key={`${item.src}-${index}`}>
                <button
                  type="button"
                  onClick={() => onOpen(index)}
                  aria-label={label}
                  className="relative block size-16 overflow-hidden rounded-box bg-surface-muted"
                >
                  {item.kind === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.thumb ?? item.src}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="size-full object-cover"
                    />
                  ) : (
                    <>
                      {/*
                        * The clip's own first frame as its thumbnail. `#t=0.1`
                        * is what makes iOS Safari paint a frame at all rather
                        * than a black square, and `preload="metadata"` fetches
                        * only enough of the file to do it.
                        */}
                      <video
                        src={`${item.src}#t=0.1`}
                        muted
                        playsInline
                        preload="metadata"
                        tabIndex={-1}
                        className="pointer-events-none size-full object-cover"
                      />
                      <span className="absolute inset-0 grid place-items-center bg-ink/25">
                        <Play className="size-6 fill-white text-white" aria-hidden />
                      </span>
                    </>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <footer className="mt-auto flex items-center gap-2.5 border-t border-hairline pt-3">
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-muted text-heading6 text-ink-muted"
        >
          {review.customerName.trim().charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-heading7 text-ink">{review.customerName}</span>
          {review.verified && (
            <span className="inline-flex items-center gap-1 text-body5 text-success">
              <BadgeCheck className="size-3.5" aria-hidden />
              {tr(locale, 'reviews.verified')}
            </span>
          )}
        </span>
      </footer>
    </article>
  );
}

/**
 * One photo or video at a time, with previous and next inside the review.
 *
 * A native `<dialog>` like the bulk-price sheet: `showModal` brings the backdrop,
 * the focus trap and Escape for free. The media is only mounted while open, so
 * closing stops a video rather than leaving it playing behind the page.
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
      // top-left corner — see `PriceLadderSheet`.
      className="m-auto w-[min(56rem,calc(100vw-2rem))] overflow-hidden rounded-card bg-ink p-0 text-white backdrop:bg-ink/70"
    >
      {review && item && (
        <div className="relative">
          <div className="grid h-[min(75dvh,40rem)] place-items-center">
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

          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <p className="min-w-0 truncate text-body3">
              {review.customerName}
              {count > 1 && (
                <span className="ml-2 text-white/60 tabular-nums">
                  {index + 1} / {count}
                </span>
              )}
            </p>
            <button
              type="button"
              onClick={onClose}
              aria-label={tr(locale, 'reviews.close')}
              className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-white/10"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>

          {count > 1 && (
            <>
              <button
                type="button"
                onClick={() => onIndex((index - 1 + count) % count)}
                aria-label={tr(locale, 'reviews.previous')}
                className="absolute top-[calc(min(75dvh,40rem)/2)] left-2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-ink/60 hover:bg-ink/80"
              >
                <ChevronLeft className="size-6" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => onIndex((index + 1) % count)}
                aria-label={tr(locale, 'reviews.next')}
                className="absolute top-[calc(min(75dvh,40rem)/2)] right-2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-ink/60 hover:bg-ink/80"
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
