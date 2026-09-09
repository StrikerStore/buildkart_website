import Link from 'next/link';
import type { StorefrontCategoryDto } from '@buildkart/contract';
import { imageSrcSet, imageUrl, IMAGE, SRCSET } from '@/lib/media';
import type { Locale } from '@/lib/i18n';

/**
 * A category tile.
 *
 * Image over label, and the image is the tap target rather than an ornament
 * beside one. PLAN.md §2 asks for "icons + images over words" because a
 * thekedar recognises a picture of a cement bag faster than they read
 * "Ordinary Portland Cement 53 Grade" — and considerably faster in a language
 * that is not their first.
 *
 * The label is never truncated to one line. A two-line category name is fine; a
 * name cut to "Plywood & Boa…" is the failure this audience notices.
 */
export async function CategoryTile({
  category,
  locale,
}: {
  category: StorefrontCategoryDto;
  locale: Locale;
}) {
  const [src, srcSet] = await Promise.all([
    imageUrl(category.imageKey, IMAGE.tile),
    imageSrcSet(category.imageKey, SRCSET.tile.widths),
  ]);
  const name = (locale === 'hi' && category.nameHi) || category.nameEn;

  return (
    <Link
      href={`/category/${category.slug}`}
      className="group flex w-full flex-col items-center gap-2 rounded-card p-2 text-center hover:bg-brand-tint"
    >
      <span className="grid aspect-square w-full place-items-center overflow-hidden rounded-card bg-brand-tint">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            {...(srcSet ? { srcSet, sizes: SRCSET.tile.sizes } : {})}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
        ) : (
          // The initial, not a generic icon: with no artwork uploaded yet, a
          // letter at least distinguishes one tile from the next.
          <span className="text-heading2 text-brand-text">{name.charAt(0)}</span>
        )}
      </span>

      <span className="text-heading8 text-ink">{name}</span>
    </Link>
  );
}
