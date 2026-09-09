'use client';

import { useEffect, useOptimistic, useRef, useState, useTransition } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { setCartQuantity } from '@/app/cart/actions';
import { MAX_QTY_PER_LINE } from '@/lib/cart-shared';
import { cn } from '@/lib/cn';
import type { Locale } from '@/lib/i18n';

/**
 * The cart's quantity control: `🗑 1 +` becoming `− 12 +`, with the number
 * typeable.
 *
 * Distinct from the card's `Stepper` on purpose. A card needs one compact
 * control that fits beside a price; a cart line is where somebody sets *forty
 * bags*, and tapping plus thirty-nine times is not a quantity picker. So this
 * one adds two things the card deliberately does not have:
 *
 *   - **A typeable number.** Committed on blur or Enter, not per keystroke —
 *     typing "40" would otherwise fire a write for "4" on the way through, and
 *     on a slow connection the two responses can land out of order.
 *   - **Delete in place of minus at one.** Stepping to zero already removed the
 *     line, but nothing said so: a shopper looking for a way to remove an item
 *     should see a bin, not deduce it. Below one there is nothing to decrement,
 *     so the slot is free.
 */
export function CartQuantity({
  variantId,
  quantity,
  locale,
  onChanged,
}: {
  variantId: string;
  quantity: number;
  locale: Locale;
  onChanged?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(quantity);
  const [draft, setDraft] = useState(String(quantity));
  const inputRef = useRef<HTMLInputElement>(null);

  // The server is the source of truth; re-sync when it disagrees, unless the
  // shopper is mid-edit — overwriting what someone is typing is worse than
  // showing a stale number for a moment.
  useEffect(() => {
    if (document.activeElement !== inputRef.current) setDraft(String(quantity));
  }, [quantity]);

  function commit(next: number) {
    const clamped = Math.max(0, Math.min(Math.trunc(next), MAX_QTY_PER_LINE));
    setDraft(String(clamped));
    if (clamped === quantity) return;

    startTransition(async () => {
      setShown(clamped);
      await setCartQuantity(variantId, clamped);
      onChanged?.();
    });
  }

  /** An empty or nonsense box reverts rather than removing the line. */
  function commitDraft() {
    const parsed = Number(draft.replace(/\D/g, ''));
    if (!Number.isFinite(parsed) || parsed < 1) {
      setDraft(String(quantity));
      return;
    }
    commit(parsed);
  }

  const removing = shown <= 1;

  return (
    <div
      className={cn(
        'inline-flex h-10 items-stretch overflow-hidden rounded-box border border-brand bg-brand-tint',
        pending && 'opacity-60',
      )}
    >
      <button
        type="button"
        onClick={() => commit(shown - 1)}
        disabled={pending}
        aria-label={
          removing
            ? locale === 'hi'
              ? 'हटाएँ'
              : 'Remove from cart'
            : locale === 'hi'
              ? 'एक कम करें'
              : 'Decrease quantity'
        }
        className={cn(
          'grid w-10 place-items-center transition-colors',
          removing ? 'text-error hover:bg-error-bg' : 'text-brand-text hover:bg-brand',
        )}
      >
        {removing ? <Trash2 className="size-4" aria-hidden /> : <Minus className="size-4" aria-hidden />}
      </button>

      <input
        ref={inputRef}
        value={draft}
        onChange={(event) => setDraft(event.target.value.replace(/\D/g, '').slice(0, 3))}
        onBlur={commitDraft}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            inputRef.current?.blur();
          }
          if (event.key === 'Escape') {
            setDraft(String(quantity));
            inputRef.current?.blur();
          }
        }}
        inputMode="numeric"
        aria-label={locale === 'hi' ? 'मात्रा' : 'Quantity'}
        className="w-12 border-x border-brand/40 bg-surface text-center text-cta2 tabular-nums text-ink focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ink"
      />

      <button
        type="button"
        onClick={() => commit(shown + 1)}
        disabled={pending || shown >= MAX_QTY_PER_LINE}
        aria-label={locale === 'hi' ? 'एक और जोड़ें' : 'Increase quantity'}
        className="grid w-10 place-items-center text-brand-text transition-colors hover:bg-brand disabled:opacity-40"
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}
