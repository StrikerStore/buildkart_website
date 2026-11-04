'use client';

import { useTransition } from 'react';
import { setCartQuantity } from '@/app/cart/actions';
import { gaCartChange, type GaProduct } from '@/lib/google-ecommerce';
import type { Locale } from '@/lib/i18n';

/**
 * The corner ✕ on a cart row.
 *
 * Setting the quantity to zero — the same idempotent action every other control
 * calls — rather than a `removeLine` of its own. One writer for the cart cookie
 * means there is one place a bug in it can live.
 */
export function RemoveLine({
  variantId,
  locale,
  children,
  product,
  quantity = 0,
}: {
  variantId: string;
  locale: Locale;
  children: React.ReactNode;
  /** What GA4 hears removed, and how many; without it, nothing is reported. */
  product?: GaProduct;
  quantity?: number;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => {
        if (product) gaCartChange(product, -quantity);
        startTransition(async () => void (await setCartQuantity(variantId, 0)));
      }}
      disabled={pending}
      aria-label={locale === 'hi' ? 'कार्ट से हटाएँ' : 'Remove from cart'}
      className="absolute right-0 top-2 grid size-8 place-items-center rounded-box text-ink-faint hover:bg-surface-muted hover:text-error disabled:opacity-50"
    >
      {children}
    </button>
  );
}
