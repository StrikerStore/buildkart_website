import { imageSrcSet, imageUrl, IMAGE, SRCSET } from '@/lib/media';
import type { Locale } from '@/lib/i18n';

/**
 * The product's photographs.
 *
 * A scroll-snap rail with no thumbnails, no lightbox and no library. Swiping is
 * what a phone user does to a row of images without being taught, and the whole
 * behaviour is `overflow-x: auto` plus `scroll-snap-type` — nothing to download,
 * nothing to hydrate.
 *
 * The first image is eager and high priority: on a product page it is always
 * the Largest Contentful Paint, and lazy-loading it is the single easiest way
 * to make the page feel slow on a site connection.
 */
export async function Gallery({
  images,
  name,
  locale,
}: {
  images: Array<{ key: string; altEn: string | null; altHi: string | null }>;
  name: string;
  locale: Locale;
}) {
  const resolved = (
    await Promise.all(
      images.map(async (image) => ({
        src: await imageUrl(image.key, IMAGE.gallery),
        srcSet: await imageSrcSet(image.key, SRCSET.gallery.widths, 80),
        alt: (locale === 'hi' && image.altHi) || image.altEn || name,
      })),
    )
  ).filter(
    (image): image is { src: string; srcSet: string | null; alt: string } => image.src !== null,
  );

  if (resolved.length === 0) {
    return (
      <div className="grid aspect-square w-full place-items-center rounded-card bg-surface-muted text-body2 text-ink-faint">
        {locale === 'hi' ? 'फ़ोटो उपलब्ध नहीं' : 'No photo available'}
      </div>
    );
  }

  return (
    <div>
      <div className="rail flex gap-2 rounded-card">
        {resolved.map((image, index) => (
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

      {/* A count rather than dots. Dots stop being countable past four, and
          this tells the shopper there is more to swipe to. */}
      {resolved.length > 1 && (
        <p className="mt-2 text-center text-body5 text-ink-faint">
          {locale === 'hi'
            ? `${resolved.length} फ़ोटो — स्वाइप करें`
            : `${resolved.length} photos — swipe`}
        </p>
      )}
    </div>
  );
}
