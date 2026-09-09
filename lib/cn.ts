import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * This theme's type ramp, named for `tailwind-merge`.
 *
 * Nine heading steps, six body, three CTA, two banner — the ramp declared in
 * `globals.css`. Listing them here is not duplication for its own sake: it is
 * the only way `tailwind-merge` can know that `text-body6` is a **size** and
 * not a **colour**.
 *
 * A step added to the ramp wants adding here too, and forgetting is not loud —
 * see the note on `cn` below for what it looks like when you do.
 */
const TEXT_SIZES = [
  'heading1',
  'heading2',
  'heading3',
  'heading4',
  'heading5',
  'heading6',
  'heading7',
  'heading8',
  'heading9',
  'body1',
  'body2',
  'body3',
  'body4',
  'body5',
  'body6',
  'cta1',
  'cta2',
  'cta3',
  'banner1',
  'banner2',
] as const;

/*
 * `tailwind-merge`, taught this theme's ramp.
 *
 * Out of the box it knows Tailwind's own `text-xs … text-9xl` and treats every
 * other `text-*` as a colour. That is a reasonable default and it was silently
 * wrong here: given
 *
 *   cn('text-body6 …', 'bg-success-bg text-success-fg')
 *
 * it read both `text-body6` and `text-success-fg` as text colours, kept the
 * last one, and **dropped the font size entirely**. The badge had no size at
 * all and inherited 16px from the body — which is exactly why it looked like a
 * headline sitting on a product card, and why changing 11px to 10px changed
 * nothing on screen.
 *
 * The same collision ran the other way in `buttonClass`, where `cva` emits the
 * variant's colour before the size's `text-cta2`: there it was the *colour*
 * that was thrown away and the button inherited whatever it sat on.
 *
 * Declaring the ramp as a font-size group fixes both, and every future one.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: [...TEXT_SIZES] }],
    },
  },
});

/**
 * Class names, with later Tailwind utilities beating earlier ones.
 *
 * The merge half is what makes a variant component overridable: `<Button
 * className="bg-ink">` has to win over the variant's own `bg-brand`, and
 * plain concatenation leaves both in the string with the winner decided by
 * stylesheet order rather than by the call site.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
