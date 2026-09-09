import { Heart } from 'lucide-react';
import { storeSettings } from '@/lib/api/server';
import type { Locale } from '@/lib/i18n';

/**
 * The oversized tagline that closes every page, just above the footer.
 *
 * A watermark, not a banner: set in the faintest grey that is still legible,
 * so it reads as the shop signing off rather than as one more thing asking to
 * be clicked. There is nothing interactive in it.
 *
 * **It is real text, not an image and not `aria-hidden`.** It is the shop's own
 * sentence, so a screen reader should hear it and a search engine should index
 * it — which is also why the grey is a shade darker than the reference that
 * inspired it. See `--ink-watermark`.
 *
 * The heart is the one spot of colour and is decorative: the sentence carries
 * the meaning without it, so it is hidden from assistive technology rather than
 * announced as "heart" mid-tagline.
 */
export async function BrandTagline({ locale }: { locale: Locale }) {
  const { store } = await storeSettings();
  const name = (locale === 'hi' && store.nameHi) || store.nameEn;

  const tagline = locale === 'hi' ? 'हर निर्माण के लिए एक दुकान' : 'One Store for Every Build';

  return (
    <section className="page-w page-x pt-12 pb-6 sm:pt-16 print:hidden">
      {/*
        * `text-balance` so the two lines break evenly rather than leaving one
        * orphaned word on the second — the whole effect depends on the block
        * reading as a shape.
        */}
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[2rem] leading-[1.05] font-extrabold tracking-tight text-balance text-ink-watermark sm:text-[3rem] lg:text-[4.5rem]">
        {tagline}
        <Heart
          // Sized in `em` so it scales with the sentence at every breakpoint
          // instead of needing a size per step.
          className="size-[0.85em] shrink-0 text-brand"
          fill="currentColor"
          strokeWidth={0}
          aria-hidden
        />
      </p>

      <p className="mt-2 text-[1.25rem] font-bold tracking-tight text-ink-watermark/70 sm:text-[1.5rem]">
        {name}
      </p>
    </section>
  );
}
