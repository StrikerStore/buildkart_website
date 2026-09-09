import type { TagTone } from '@StrikerStore/contract';
import { cn } from '@/lib/cn';

/**
 * A tag badge.
 *
 * Tones are named by *meaning* — the schema's own choice, so the palette can
 * change without rewriting every tag — which means the mapping from meaning to
 * colour lives here, in the one file that knows what the brand looks like.
 *
 * BRAND is deliberately the tinted wash rather than solid yellow. Yellow is the
 * ADD button; a badge painted the same colour competes with the only control on
 * the card that matters.
 */
const TONES: Record<TagTone, string> = {
  NEUTRAL: 'bg-surface-muted text-ink-muted',
  BRAND: 'bg-brand-tint text-brand-text',
  // `-fg`, not `--success`/`--warning`: those two are fills, and at 3.86:1 and
  // 2.19:1 on their own tints they were never readable as words. See the note
  // beside the tokens in globals.css.
  SUCCESS: 'bg-success-bg text-success-fg',
  WARNING: 'bg-warning-bg text-warning-fg',
  CRITICAL: 'bg-error-bg text-error',
  INFO: 'bg-info-bg text-info',
};

export function Badge({
  tone = 'NEUTRAL',
  className,
  children,
}: {
  tone?: TagTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        /*
         * A badge is metadata, not a headline.
         *
         * The size class here only started doing anything once `cn` was taught
         * this theme's ramp — `tailwind-merge` had been deleting it as a
         * colour, so the label inherited 16px from the body and "Bestseller"
         * came out the size of the product name it was describing. The note in
         * `lib/cn.ts` has the detail.
         *
         * 11px in a pill with room around it: the label sits *inside* its
         * shape rather than filling it edge to edge, which is the difference
         * between a tag and a button. The weight stays at 600 — at this size a
         * badge needs it to stay legible against a tint.
         */
        'inline-flex shrink-0 items-center rounded-pill px-2 py-1',
        'text-heading9 leading-[14px]',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
