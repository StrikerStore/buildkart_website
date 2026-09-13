'use client';

import { ChevronsLeft, ChevronsRight, Minus, Plus } from 'lucide-react';
import { useOptimistic, useTransition } from 'react';
import { setCartQuantity } from '@/app/cart/actions';
import { cn } from '@/lib/cn';
import type { Locale } from '@/lib/i18n';

/**
 * ADD, and then `− n +` in the same footprint.
 *
 * `useOptimistic` is doing real work here rather than being decoration. The
 * quantity is authoritative on the server — it lives in a cookie the action
 * writes — so without it every tap would wait for a round trip before the
 * number moved, and a contractor adding twelve bags on a site connection would
 * be tapping into a control that appears frozen. The optimistic value updates
 * instantly and reconciles when the action returns; if it fails, React reverts
 * it and the true count reappears.
 *
 * `size` is fixed rather than hugging its content so a card's price row does not
 * reflow the moment ADD becomes a stepper.
 *
 * **Solid, everywhere.** It used to be a tint on a product card and solid only
 * in the product page's buy bar, on the reasoning that a grid of twenty filled
 * pills is a wall of colour. In practice the tint read as disabled — a
 * washed-out primary usually does — and the one action on a card is worth the
 * colour. There is no variant now, which is also one fewer thing to get wrong.
 *
 * **The ±5 jumps are `lg` only.** A contractor orders forty bags, not one, so
 * stepping by five is worth a control of its own — but five controls need about
 * 132px, and on a phone's two-up grid a product card is 159px wide with a price
 * to fit beside them. The buy bar and anywhere else `lg` renders has the room;
 * a card does not.
 */
export function Stepper({
  variantId,
  quantity,
  locale,
  size = 'sm',
  onChanged,
  label,
}: {
  variantId: string;
  quantity: number;
  locale: Locale;
  size?: 'sm' | 'lg';
  /**
   * Fired *after* the write lands, for callers holding their own copy of the
   * cart — the mini cart's panel, which fetched its lines into local state and
   * would otherwise keep showing the totals from before the tap.
   */
  onChanged?: () => void;
  /** Overrides "ADD" — the buy bar has room for the full "Add to cart". */
  label?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(quantity);

  /** What `«` and `»` move by. Five is half a common pack order. */
  const JUMP = 5;

  function change(next: number) {
    startTransition(async () => {
      setShown(next);
      await setCartQuantity(variantId, next);
      // After, never before: the server owns the quantity, so a caller
      // refreshing on the way in would read the value this tap replaced.
      onChanged?.();
    });
  }

  const height = size === 'lg' ? 'h-[52px]' : 'h-10';
  const jumps = size === 'lg';

  if (shown === 0) {
    return (
      <button
        type="button"
        onClick={() => change(1)}
        disabled={pending}
        className={cn(
          height,
          'inline-flex w-[84px] items-center justify-center rounded-box border border-buy',
          'bg-buy text-cta3 text-buy-foreground hover:bg-buy-dark disabled:opacity-60',
          size === 'lg' && 'w-full text-cta1',
        )}
      >
        {label ?? (locale === 'hi' ? 'जोड़ें' : 'ADD')}
      </button>
    );
  }

  return (
    <div
      className={cn(
        height,
        'inline-flex w-[84px] items-center justify-between rounded-box bg-buy text-buy-foreground',
        size === 'lg' && 'w-full',
      )}
    >
      {/*
       * Clamped to one, not zero: `−` is how a line is removed, and a coarse
       * control that can empty the cart in a mistap is a different promise
       * from "five fewer".
       */}
      {jumps && (
        <button
          type="button"
          onClick={() => change(Math.max(1, shown - JUMP))}
          disabled={pending || shown <= 1}
          aria-label={locale === 'hi' ? `${JUMP} कम करें` : `Decrease by ${JUMP}`}
          className="grid h-full w-10 place-items-center rounded-l-box hover:bg-buy-dark disabled:opacity-40"
        >
          <ChevronsLeft className="size-4" aria-hidden />
        </button>
      )}

      <button
        type="button"
        onClick={() => change(shown - 1)}
        disabled={pending}
        aria-label={locale === 'hi' ? 'एक कम करें' : 'Decrease quantity'}
        className={cn(
          'grid h-full w-9 place-items-center hover:bg-buy-dark disabled:opacity-60',
          !jumps && 'rounded-l-box',
        )}
      >
        <Minus className="size-4" aria-hidden />
      </button>

      {/* aria-live so a screen reader hears the new count without the whole
          control being re-announced on every tap. */}
      <span aria-live="polite" className="text-cta3 tabular-nums">
        {shown}
      </span>

      <button
        type="button"
        onClick={() => change(shown + 1)}
        disabled={pending}
        aria-label={locale === 'hi' ? 'एक और जोड़ें' : 'Increase quantity'}
        className={cn(
          'grid h-full w-9 place-items-center hover:bg-buy-dark disabled:opacity-60',
          !jumps && 'rounded-r-box',
        )}
      >
        <Plus className="size-4" aria-hidden />
      </button>

      {jumps && (
        <button
          type="button"
          onClick={() => change(shown + JUMP)}
          disabled={pending}
          aria-label={locale === 'hi' ? `${JUMP} और जोड़ें` : `Increase by ${JUMP}`}
          className="grid h-full w-10 place-items-center rounded-r-box hover:bg-buy-dark disabled:opacity-40"
        >
          <ChevronsRight className="size-4" aria-hidden />
        </button>
      )}
    </div>
  );
}
