import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

/**
 * The storefront's button.
 *
 * Two things here are not the usual defaults, and both come from the audience:
 *
 *   - **Every size is at least 48px tall.** PLAN.md §2 sets that floor for
 *     contractors tapping with gloves on a building site. Zepto's own controls
 *     are 40px; this is the one place the reference is overridden rather than
 *     followed. `sm` is short in *padding*, not in target.
 *   - **`brand` carries charcoal text, not white.** #faae0a is too light to
 *     hold white at AA. A yellow button with white text is the single easiest
 *     way to make this palette fail a contrast audit, so the variant does not
 *     offer it.
 */
const button = cva(
  'inline-flex items-center justify-center gap-2 rounded-box font-bold ' +
    'transition-colors select-none whitespace-nowrap ' +
    'disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        /*
         * Money changing hands: ADD, Proceed to checkout, Place order.
         *
         * Its own variant rather than a recolour of `brand`, because the two
         * now mean different things — yellow marks price, green means "this
         * button spends money". Unlike `brand` it carries white, which #107b3b
         * holds at 5.42:1.
         */
        buy: 'bg-buy text-buy-foreground hover:bg-buy-dark',
        /* The primary action on a screen that is not a purchase: Verify, Save. */
        brand: 'bg-brand text-brand-foreground hover:bg-brand-dark',
        /* Charcoal. For actions that are primary but not commercial. */
        solid: 'bg-ink text-ink-inverted hover:bg-ink/90',
        /* The ADD pill on a product card: brand text on white, brand hairline. */
        outline: 'border border-brand bg-surface text-brand-text hover:bg-brand-tint',
        /* A neutral bordered control — filters, sort, secondary actions. */
        quiet: 'border border-hairline-strong bg-surface text-ink hover:bg-surface-muted',
        /* No chrome until hovered. Toolbar and header actions. */
        ghost: 'text-ink hover:bg-surface-muted',
        /* Destructive, and deliberately not red-filled: cancel-order sits in a
         * list of ordinary actions and a red block would shout over all of them. */
        danger: 'border border-error/30 bg-surface text-error hover:bg-error-bg',
      },
      size: {
        sm: 'min-h-[var(--tap)] px-3 text-cta3',
        md: 'min-h-[var(--tap)] px-4 text-cta2',
        lg: 'min-h-[52px] px-6 text-cta1',
        /* Square, for a lone icon. Still a full tap target. */
        icon: 'size-[var(--tap)] shrink-0 p-0',
      },
      block: {
        true: 'w-full',
      },
      pill: {
        true: 'rounded-pill',
      },
    },
    defaultVariants: { variant: 'brand', size: 'md' },
  },
);

export type ButtonProps = ComponentProps<'button'> & VariantProps<typeof button>;

export function Button({ className, variant, size, block, pill, ...props }: ButtonProps) {
  return (
    <button
      className={cn(button({ variant, size, block, pill }), className)}
      {...props}
    />
  );
}

/** The same styling for an `<a>` — a link that has to look like a button. */
export type ButtonLinkProps = ComponentProps<'a'> & VariantProps<typeof button>;

export function buttonClass(props: VariantProps<typeof button> & { className?: string }): string {
  const { className, ...variants } = props;
  return cn(button(variants), className);
}
