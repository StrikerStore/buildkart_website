import Link from 'next/link';
import type { StorefrontBannerDto } from '@buildkart/contract';
import { imageSrcSet, imageUrl, IMAGE, SRCSET } from '@/lib/media';
import type { Locale } from '@/lib/i18n';

/**
 * A row of promotional banners.
 *
 * Two `<source>` elements rather than one image scaled by CSS. The schema keeps
 * separate desktop and mobile artwork precisely because a 3:1 hero crops badly
 * on a phone, and this audience is overwhelmingly on phones — serving the wide
 * crop and letting `object-fit` deal with it would throw away the reason those
 * two columns exist.
 */
export async function BannerStrip({
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
      mobile: await imageUrl(banner.mobileKey, IMAGE.stripCard),
      desktop: await imageUrl(banner.desktopKey, IMAGE.stripCard),
      srcSet: await imageSrcSet(banner.desktopKey, SRCSET.stripCard.widths),
    })),
  );

  /*
   * A scrolling rail on a phone, an even **grid** from `md` up.
   *
   * Three across is the shape this row is designed around — the owner places
   * three promos and they should sit side by side on a desktop rather than
   * scrolling, where two of the three would be off-screen on the widest display
   * the shop has. Below `md` there is no room for three, so it stays a rail.
   *
   * The rail is **inset to the page gutter**, not bled to the screen edge like
   * the product rows. Those use `-mx-4 px-4` so a card can pass under the edge
   * and signal "there is more" — right for a sample row of forty products.
   * Wrong here: this row sits directly under the hero, and a card sliding to
   * x=0 while the hero keeps its 16px margin reads as a broken alignment
   * rather than an affordance. Three cards do not need to advertise that they
   * scroll.
   */
  return (
    <div className="rail flex gap-3 md:grid md:grid-cols-3 md:gap-4">
      {resolved.map(({ banner, mobile, desktop, srcSet }) => {
        if (!mobile && !desktop) return null;
        const title = (locale === 'hi' && banner.titleHi) || banner.titleEn;

        const art = (
          <picture>
            {desktop && <source media="(min-width: 768px)" srcSet={desktop} />}
            <img
              src={mobile ?? desktop ?? ''}
              {...(srcSet ? { srcSet, sizes: SRCSET.stripCard.sizes } : {})}
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
            /* 7:4, the ratio the three-across grid resolves to at the page's
               max width — so the art fills its card without cropping. */
            className="aspect-[7/4] w-[280px] overflow-hidden rounded-card bg-surface-muted sm:w-[340px] md:w-auto"
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
  );
}
