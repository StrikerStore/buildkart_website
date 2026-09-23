import Link from 'next/link';
import type { StorefrontBannerDto } from '@StrikerStore/contract';
import { imageSrcSet, imageUrl, IMAGE, SRCSET } from '@/lib/media';
import type { Locale } from '@/lib/i18n';

/**
 * The wide banner that closes the home page, just above the brand tagline.
 *
 * The `HOME_BOTTOM` placement. Built like the hero — a scroll-snap rail, sized
 * by aspect ratio so each crop renders whole — with two differences: it is far
 * below the fold, so every image is lazy, and its ratios are the ones the owner
 * designs for this slot: 3:1 on a desktop (2172 × 724) and 1672:941 on a phone.
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
                />
              )}
              <img
                src={mobile ?? desktop ?? ''}
                {...(mobileSrcSet ? { srcSet: mobileSrcSet, sizes: SRCSET.bottomMobile.sizes } : {})}
                alt={title ?? ''}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </picture>
          );

          return (
            <div
              key={banner.desktopKey}
              className="aspect-[1672/941] w-full overflow-hidden rounded-card bg-surface-muted md:aspect-[3/1]"
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
