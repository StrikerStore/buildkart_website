'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { SRCSET } from '@/lib/media-shared';
import type { Locale } from '@/lib/i18n';

export type GalleryImage = {
  src: string;
  srcSet: string | null;
  /** A small crop for the desktop strip, or null when transforms are off. */
  thumb: string | null;
  alt: string;
};

/**
 * The gallery's rail and its position indicator.
 *
 * The rail itself is still CSS — `overflow-x: auto` and scroll snap, exactly as
 * before — because swiping must keep working whether or not this component's
 * JavaScript ever arrives. Everything below only *reflects* where the rail
 * already is:
 *
 *   - **Phones get dots.** A thumbnail strip under a 360px-wide photo would be
 *     four 44px squares nobody can tell apart; a dot only has to answer "how
 *     many, and which one am I on".
 *   - **Desktop gets thumbnails.** There is no swipe on a mouse, so the strip
 *     is the only way to reach photo four — and at that width there is room to
 *     show what each one actually is.
 *
 * The active index comes from an IntersectionObserver rooted on the rail rather
 * than a scroll handler: the browser reports which slide is in view, so a flung
 * scroll settles on the right marker without this file doing arithmetic on
 * scrollLeft during the gesture.
 */
export function GalleryViewer({ images, locale }: { images: GalleryImage[]; locale: Locale }) {
  const railRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail || images.length < 2) return;

    const slides = Array.from(rail.children);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(slides.indexOf(entry.target));
        }
      },
      // 0.6 rather than 1: a rail mid-flick has no fully visible slide, and
      // waiting for one leaves the marker stuck on the slide just left behind.
      { root: rail, threshold: 0.6 },
    );

    for (const slide of slides) observer.observe(slide);
    return () => observer.disconnect();
  }, [images.length]);

  const show = (index: number) => {
    // `block: 'nearest'` so reaching for photo three does not also drag the
    // page vertically to centre the gallery.
    railRef.current?.children[index]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'start',
    });
  };

  const label = (index: number) =>
    locale === 'hi' ? `फ़ोटो ${index + 1}` : `Photo ${index + 1}`;

  return (
    <div>
      <div ref={railRef} className="rail flex gap-2 rounded-card">
        {images.map((image, index) => (
          <div
            key={image.src}
            className="aspect-square w-full overflow-hidden rounded-card bg-surface-muted"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.src}
              {...(image.srcSet ? { srcSet: image.srcSet, sizes: SRCSET.gallery.sizes } : {})}
              alt={image.alt}
              loading={index === 0 ? 'eager' : 'lazy'}
              fetchPriority={index === 0 ? 'high' : 'auto'}
              decoding="async"
              className="size-full object-contain"
            />
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <>
          {/* Dots — phones. */}
          <div className="mt-3 flex justify-center gap-2 lg:hidden">
            {images.map((image, index) => (
              <button
                key={image.src}
                type="button"
                onClick={() => show(index)}
                aria-label={label(index)}
                aria-current={index === active}
                // A wider pill for the active dot rather than only a darker
                // one: colour alone is not a state a low-contrast screen in
                // daylight reliably shows.
                className={cn(
                  'h-2 rounded-pill transition-all',
                  index === active ? 'w-5 bg-ink' : 'w-2 bg-hairline',
                )}
              />
            ))}
          </div>

          {/* Thumbnails — desktop. */}
          <div className="mt-3 hidden flex-wrap gap-2 lg:flex">
            {images.map((image, index) => (
              <button
                key={image.src}
                type="button"
                onClick={() => show(index)}
                aria-label={label(index)}
                aria-current={index === active}
                className={cn(
                  'size-16 overflow-hidden rounded-box border-2 bg-surface-muted transition-colors',
                  index === active ? 'border-ink' : 'border-hairline hover:border-ink-faint',
                )}
              >
                {/* Decorative: the rail above carries the real alt text, and a
                    screen reader already has this button's label. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.thumb ?? image.src}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="size-full object-contain"
                />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
