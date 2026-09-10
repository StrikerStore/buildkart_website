import { imageSrcSet, imageUrl, IMAGE, SRCSET } from '@/lib/media';
import type { Locale } from '@/lib/i18n';
import { GalleryViewer, type GalleryImage } from './gallery-viewer';

/**
 * The product's photographs.
 *
 * A scroll-snap rail with no lightbox and no library: swiping is what a phone
 * user does to a row of images without being taught, and the rail itself is
 * `overflow-x: auto` plus `scroll-snap-type` — nothing to download.
 *
 * This half stays on the server because it is the half that costs a round trip:
 * resolving every image's URL and srcset against the media config. The markup
 * it produces is handed to `GalleryViewer`, which adds the dots and the desktop
 * thumbnail strip.
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
        // The desktop strip's crop. `IMAGE.thumb` is 120px for a 64px square,
        // which covers it at 2x without a srcset of its own.
        thumb: await imageUrl(image.key, IMAGE.thumb),
        alt: (locale === 'hi' && image.altHi) || image.altEn || name,
      })),
    )
  ).filter((image): image is GalleryImage => image.src !== null);

  if (resolved.length === 0) {
    return (
      <div className="grid aspect-square w-full place-items-center rounded-card bg-surface-muted text-body2 text-ink-faint">
        {locale === 'hi' ? 'फ़ोटो उपलब्ध नहीं' : 'No photo available'}
      </div>
    );
  }

  return <GalleryViewer images={resolved} locale={locale} />;
}
