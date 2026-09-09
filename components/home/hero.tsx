import Link from 'next/link';
import type { StorefrontBannerDto } from '@StrikerStore/contract';
import { imageSrcSet, imageUrl, IMAGE, SRCSET } from '@/lib/media';
import type { Locale } from '@/lib/i18n';

/**
 * The hero.
 *
 * A CSS scroll-snap rail, not a JavaScript carousel. There is no autoplay, no
 * timer and no library: a hero that moves on its own is a hero that swaps the
 * offer out from under a thumb already travelling toward it, and on a slow
 * connection the carousel script is often the largest thing on the page.
 * Swiping works because the browser does it.
 *
 * The first banner loads eagerly with `fetchPriority="high"` — it is almost
 * always the Largest Contentful Paint, and lazy-loading it is the single most
 * common way to make a home page feel slow.
 */
export async function Hero({
  banners,
  locale,
}: {
  banners: StorefrontBannerDto[];
  locale: Locale;
}) {
  if (banners.length === 0) return null;

  const resolved = await Promise.all(
    banners.map(async (banner) => ({
      banner,
      mobile: await imageUrl(banner.mobileKey, IMAGE.heroMobile),
      desktop: await imageUrl(banner.desktopKey, IMAGE.heroDesktop),
      srcSet: await imageSrcSet(banner.desktopKey, SRCSET.hero.widths),
    })),
  );

  const usable = resolved.filter((row) => row.mobile ?? row.desktop);
  if (usable.length === 0) return null;

  return (
    <div className="page-w page-x pt-3">
      <div className="rail flex gap-3 rounded-card">
        {usable.map(({ banner, mobile, desktop, srcSet }, index) => {
          const title = (locale === 'hi' && banner.titleHi) || banner.titleEn;

          const art = (
            <picture>
              {desktop && (
                <source
                  media="(min-width: 768px)"
                  srcSet={srcSet ?? desktop}
                  {...(srcSet ? { sizes: SRCSET.hero.sizes } : {})}
                />
              )}
              <img
                src={mobile ?? desktop ?? ''}
                alt={title ?? ''}
                loading={index === 0 ? 'eager' : 'lazy'}
                fetchPriority={index === 0 ? 'high' : 'auto'}
                decoding="async"
                className="h-full w-full object-cover"
              />
            </picture>
          );

          return (
            <div
              key={banner.desktopKey}
              /*
               * Sized by **aspect ratio**, not by fixed heights.
               *
               * A fixed height crops whatever the owner uploaded to fit, which
               * is how a hero ends up with its headline sliced off on one
               * breakpoint. Pinning the ratio instead means the box always
               * matches the artwork, and the two crops the schema provides —
               * 8:5 for a phone, 4:1 for a desktop — each render whole.
               */
              className="aspect-[8/5] w-full overflow-hidden rounded-card bg-surface-muted md:aspect-[4/1]"
            >
              {banner.linkUrl ? (
                <Link href={banner.linkUrl} className="block h-full">
                  {art}
                </Link>
              ) : (
                art
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
