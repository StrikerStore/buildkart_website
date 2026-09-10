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
        *
        * 3rem is the phone size, but capped at 12.8vw: at 3rem the first line
        * wants 334px and a 360px-wide Android only offers 328 between the
        * gutters, which breaks the sentence into three ragged lines instead of
        * two. The cap only bites below ~375px — every phone wider than that
        * gets the full 3rem.
        */}
      <p className="text-[min(3rem,12.8vw)] leading-[1.05] font-extrabold tracking-tight text-balance text-ink-watermark lg:text-[4.5rem]">
        {tagline}
        <Heart
          // Sized in `em` so it scales with the sentence at every breakpoint
          // instead of needing a size per step.
          //
          // Inline rather than a flex item: as a flex child the whole sentence
          // was one box and the heart the next, so once the sentence wrapped
          // there was never room beside it and the heart dropped to a line of
          // its own. Inline, it is the last thing on the last line. There is no
          // whitespace between it and `{tagline}` in the JSX, so the two cannot
          // be split across lines — the margin is the only gap.
          className="ml-3 inline-block size-[0.85em] text-brand"
          fill="currentColor"
          strokeWidth={0}
          aria-hidden
        />
      </p>

      <p className="mt-2 text-[1.875rem] font-bold tracking-tight text-ink-watermark/70">
        {name}
      </p>
    </section>
  );
}
