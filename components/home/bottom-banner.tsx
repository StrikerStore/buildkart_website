import Link from 'next/link';
import type { StorefrontBannerDto } from '@StrikerStore/contract';
import { imageSrcSet, imageUrl, IMAGE, SRCSET } from '@/lib/media';
import type { Locale } from '@/lib/i18n';

/**
 * The wide banner that closes the home page, just above the brand tagline.
 *
 * The `HOME_BOTTOM` placement. Built like the hero — a scroll-snap rail — with
 * two differences: it is far below the fold, so every image is lazy, and the
 * box takes **the artwork's own shape** rather than a fixed ratio. A fixed
 * 1672:941 phone box cropped the sides off a 1672 × 526 upload (logo and store
 * buttons gone); following the image means whatever the owner uploads shows
 * whole. The recommended sizes (2172 × 724, 1672 × 941) only reserve space.
 */
export async function BottomBanner({
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
      mobile: await imageUrl(banner.mobileKey, IMAGE.bottomMobile),
      mobileSrcSet: await imageSrcSet(banner.mobileKey, SRCSET.bottomMobile.widths),
      desktop: await imageUrl(banner.desktopKey, IMAGE.bottomDesktop),
      desktopSrcSet: await imageSrcSet(banner.desktopKey, SRCSET.bottomDesktop.widths),
    })),
  );

  const usable = resolved.filter((row) => row.mobile ?? row.desktop);
  if (usable.length === 0) return null;

  return (
    <div className="page-w page-x pt-8 sm:pt-10 print:hidden">
      <div className="rail flex gap-3 rounded-card">
        {usable.map(({ banner, mobile, mobileSrcSet, desktop, desktopSrcSet }) => {
          const title = (locale === 'hi' && banner.titleHi) || banner.titleEn;

          const art = (
            <picture>
              {desktop && (
                <source
                  media="(min-width: 768px)"
                  srcSet={desktopSrcSet ?? desktop}
                  {...(desktopSrcSet ? { sizes: SRCSET.bottomDesktop.sizes } : {})}
                  width={2172}
                  height={724}
                />
              )}
              <img
                src={mobile ?? desktop ?? ''}
                {...(mobileSrcSet ? { srcSet: mobileSrcSet, sizes: SRCSET.bottomMobile.sizes } : {})}
                alt={title ?? ''}
                // The recommended sizes, reserving space until the image
                // arrives; with `h-auto` the image's own shape wins once it has.
                width={1672}
                height={941}
                loading="lazy"
                decoding="async"
                className="block h-auto w-full"
              />
            </picture>
          );

          return (
            <div
              key={banner.desktopKey}
              className="w-full overflow-hidden rounded-card bg-surface-muted"
            >
              {banner.linkUrl ? (
                <Link href={banner.linkUrl} className="block">
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
