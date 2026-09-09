'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { Loader2, ShoppingCart, X } from 'lucide-react';
import { formatINR, type CartDto } from '@StrikerStore/contract';
import { buttonClass } from '@/components/ui/button';
import { CartQuantity } from './cart-quantity';
import { cn } from '@/lib/cn';
import { tr, type Locale } from '@/lib/i18n';
import { loadCart } from '@/app/cart/actions';

/**
 * The header's cart, opened in place.
 *
 * **Its contents load on open, not on every page render.** Showing lines needs
 * product names and images, which means pricing the whole cart — a database
 * round trip on every page view to fill a panel most visitors never open. The
 * badge count comes free from the cookie the server already read; everything
 * else waits until it is wanted.
 *
 * A panel on desktop, a bottom sheet on a phone. Both are the same markup: the
 * difference is entirely positioning, because a dropdown anchored to a header
 * button is unusable on a 360px screen and a full-height sheet is overkill on a
 * desktop.
 */
export function MiniCart({ count, locale }: { count: number; locale: Locale }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [cart, setCart] = useState<CartDto | null>(null);
  const [pending, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  function refresh() {
    startTransition(async () => setCart(await loadCart()));
  }

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    refresh();
  }

  /*
   * Escape closes and returns focus to the button, and a click outside closes.
   * Both are behaviours a `<details>` would give for free — but the panel needs
   * to fetch on open and re-fetch after a quantity change, which `<details>`
   * has no hook for, so they are implemented rather than inherited.
   */
  useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    function onClick(event: MouseEvent) {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target)) {
        setOpen(false);
      }
    }

    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  // A quantity change inside the panel invalidates both the lines and the
  // badge: re-fetch the panel, and refresh the route so the header count and
  // any card steppers behind it agree. Called from the stepper's `onChanged`,
  // which fires after the write — refreshing on the click would re-read the
  // quantity the tap was about to replace.
  function onQuantityChanged() {
    refresh();
    router.refresh();
  }

  return (
    <div className="relative hidden md:block">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="inline-flex h-[var(--tap)] items-center gap-2 rounded-box bg-brand px-4 text-cta2 text-brand-foreground hover:bg-brand-dark"
      >
        <ShoppingCart className="size-5" aria-hidden />
        <span className="hidden sm:inline">{tr(locale, 'header.cart')}</span>
        {count > 0 && <span className="text-cta2 tabular-nums">{count}</span>}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={tr(locale, 'header.cart')}
          className={cn(
            'absolute right-0 top-[calc(100%+8px)] z-50 flex max-h-[70vh] w-[380px]',
            'flex-col overflow-hidden rounded-card border border-hairline bg-surface shadow-sheet',
          )}
        >
          <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
            <p className="text-heading5 text-ink">
              {tr(locale, 'header.cart')}
              {cart && cart.itemCount > 0 && (
                <span className="ml-1.5 text-body3 text-ink-muted">{cart.itemCount}</span>
              )}
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={locale === 'hi' ? 'बंद करें' : 'Close'}
              className="grid size-9 place-items-center rounded-box text-ink hover:bg-surface-muted"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>

          {!cart ? (
            <div className="grid place-items-center px-4 py-10">
              <Loader2 className="size-5 animate-spin text-ink-faint" aria-hidden />
            </div>
          ) : cart.lines.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-body2 text-ink-muted">
                {locale === 'hi' ? 'कार्ट खाली है' : 'Your cart is empty'}
              </p>
              <Link
                href="/"
                onClick={() => setOpen(false)}
                className={buttonClass({ variant: 'quiet', className: 'mt-4' })}
              >
                {locale === 'hi' ? 'सामान देखें' : 'Start shopping'}
              </Link>
            </div>
          ) : (
            <>
              <ul
                className={cn(
                  'min-h-0 flex-1 divide-y divide-hairline overflow-y-auto px-4',
                  pending && 'opacity-60',
                )}
              >
                {cart.lines.map((line) => (
                  <li key={line.variantId} className="flex items-start gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="clamp-2 text-heading7 text-ink">
                        {(locale === 'hi' && line.nameHi) || line.nameEn}
                      </p>
                      {line.variantLabel && (
                        <p className="text-body5 text-ink-muted">{line.variantLabel}</p>
                      )}
                      <p className="mt-1 text-body4 text-ink-muted">
                        {formatINR(line.unitPrice)}
                        {line.wasBulkPrice && (
                          <span className="ml-1 text-success">
                            {locale === 'hi' ? 'बल्क' : 'bulk'}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-heading7 text-ink">{formatINR(line.lineTotal)}</span>
                      {/* The cart's control, not the card's: delete has to
                            be reachable wherever the cart is shown, not only
                            on the full page. */}
                      <CartQuantity
                        variantId={line.variantId}
                        quantity={line.quantity}
                        locale={locale}
                        onChanged={onQuantityChanged}
                      />
                    </div>
                  </li>
                ))}
              </ul>

              <div className="border-t border-hairline p-4">
                {cart.bulk && !cart.bulk.unlocked && (
                  <p className="mb-2 text-body4 text-brand-text">
                    {locale === 'hi'
                      ? `${formatINR(cart.bulk.remaining)} और — ${formatINR(cart.bulk.saving)} बचाएँ`
                      : `${formatINR(cart.bulk.remaining)} more to save ${formatINR(cart.bulk.saving)}`}
                  </p>
                )}

                <div className="flex items-baseline justify-between">
                  <span className="text-body2 text-ink-muted">
                    {locale === 'hi' ? 'कुल' : 'To pay'}
                  </span>
                  <span className="text-heading4 text-ink">{formatINR(cart.grandTotal)}</span>
                </div>

                <Link
                  href="/cart"
                  onClick={() => setOpen(false)}
                  className={buttonClass({
                    variant: 'brand',
                    size: 'lg',
                    block: true,
                    className: 'mt-3',
                  })}
                >
                  {locale === 'hi' ? 'कार्ट देखें' : 'View cart'}
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
