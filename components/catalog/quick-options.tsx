'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Minus, Plus, TrendingDown, X } from 'lucide-react';
import {
  formatINR,
  fromTierDtos,
  matchTier,
  multiplyMoney,
  subtractMoney,
  toPaise,
  type StorefrontVariantDto,
} from '@StrikerStore/contract';
import { setCartQuantity } from '@/app/cart/actions';
import { loadQuickOptions, type QuickOptionsData } from '@/app/products/[handle]/actions';
import { buttonClass } from '@/components/ui/button';
import { useVariantSelection, VariantAxes } from '@/components/product/variant-axes';
import { cn } from '@/lib/cn';
import type { Locale } from '@/lib/i18n';

/**
 * The card's Options button, and the sheet it opens.
 *
 * A multi-variant product cannot be added from a card — the card would have to
 * pick 12 mm on the shopper's behalf — so this used to be a link to the product
 * page. The sheet makes the choice where the shopper already is: pick the size,
 * set how many, then Add to cart or Buy now, without losing their place in the
 * grid. The full page is one tap away at the foot of the sheet for anyone who
 * wants the description and specs.
 *
 * The product loads when the sheet opens, not with the grid — see
 * `loadQuickOptions` — and **again on every open**, with the last copy shown
 * meanwhile. The cart quantities in it go stale the moment anything else
 * touches the cart, and because the cart action *sets* a line rather than
 * adding to it, a stale "0 in cart" would have the sheet offer 1 and quietly
 * overwrite the 10 bags already there.
 *
 * Portalled to `<body>`: the card lifts this button above its stretched link
 * with `relative z-10`, and a fixed sheet inside that stacking context would
 * sit under the header and the cart capsule however high its own z-index.
 */
export function QuickOptions({ handle, locale }: { handle: string; locale: Locale }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<QuickOptionsData | null | undefined>(undefined);
  const [, startLoading] = useTransition();
  const trigger = useRef<HTMLButtonElement>(null);

  function show() {
    setOpen(true);
    startLoading(async () => setData(await loadQuickOptions(handle)));
  }

  // Stable, because the sheet's keydown and scroll-lock effect depends on it.
  const close = useCallback(() => {
    setOpen(false);
    trigger.current?.focus();
  }, []);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={show}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex h-10 items-center rounded-box border border-buy bg-surface px-3 text-cta3 text-buy hover:bg-success-bg"
      >
        {locale === 'hi' ? 'चुनें' : 'Options'}
      </button>

      {open &&
        createPortal(
          <Sheet handle={handle} data={data} locale={locale} onClose={close} />,
          document.body,
        )}
    </>
  );
}

function Sheet({
  handle,
  data,
  locale,
  onClose,
}: {
  handle: string;
  /** `undefined` while loading, `null` when the product has gone. */
  data: QuickOptionsData | null | undefined;
  locale: Locale;
  onClose: () => void;
}) {
  const hi = locale === 'hi';
  const closeRef = useRef<HTMLButtonElement>(null);

  // Escape closes, and the grid behind does not scroll while the sheet is up —
  // the same two rules as the location sheet.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  // Focus into the sheet once, on open — not again when the product arrives.
  useEffect(() => closeRef.current?.focus(), []);

  const name = data ? (hi && data.nameHi) || data.nameEn : null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-ink/50" onClick={onClose} aria-hidden />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={name ?? (hi ? 'विकल्प चुनें' : 'Choose options')}
        className={cn(
          'fixed z-50 flex flex-col overflow-hidden bg-surface text-ink shadow-sheet',
          'inset-x-0 bottom-0 max-h-[92vh] rounded-t-card',
          'sm:inset-0 sm:m-auto sm:h-fit sm:max-h-[88vh] sm:w-[480px] sm:rounded-card',
        )}
      >
        <div className="flex items-start gap-3 border-b border-hairline px-4 py-3">
          {data?.imageSrc && (
            // eslint-disable-next-line @next/next/no-img-element -- see ProductCard
            <img
              src={data.imageSrc}
              alt=""
              className="size-14 shrink-0 rounded-box bg-surface-muted object-cover"
            />
          )}
          <h2 className="clamp-2 min-w-0 flex-1 self-center text-heading5 text-ink">
            {name ?? (hi ? 'विकल्प चुनें' : 'Choose options')}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={hi ? 'बंद करें' : 'Close'}
            className="grid size-9 shrink-0 place-items-center rounded-box text-ink hover:bg-surface-muted"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        {data === undefined ? (
          <div className="grid place-items-center py-14">
            <Loader2 className="size-6 animate-spin text-ink-faint" aria-hidden />
          </div>
        ) : data === null ? (
          <div className="px-4 py-10 text-center">
            <p className="text-body2 text-ink-muted">
              {hi ? 'यह सामान अभी उपलब्ध नहीं है।' : 'This product is no longer available.'}
            </p>
          </div>
        ) : (
          <Body data={data} locale={locale} onClose={onClose} />
        )}

        {data !== null && (
          <Link
            href={`/products/${handle}`}
            className="border-t border-hairline py-3 text-center text-cta3 text-ink-muted hover:text-ink"
          >
            {hi ? 'पूरी जानकारी देखें' : 'View full details'}
          </Link>
        )}
      </div>
    </>
  );
}

/** A line can hold at most this many — `MAX_QTY_PER_LINE` in `cart-shared.ts`. */
const MAX_QTY = 999;

function Body({
  data,
  locale,
  onClose,
}: {
  data: QuickOptionsData;
  locale: Locale;
  onClose: () => void;
}) {
  const hi = locale === 'hi';
  const router = useRouter();
  const selection = useVariantSelection(data.options, data.variants);
  const { selected } = selection;
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<'cart' | 'buy' | null>(null);

  /*
   * The typed quantity, per variant, as the raw string in the box.
   *
   * A string so the field can be emptied on the way from "1" to "50" without
   * snapping back to 1 under the shopper's thumb. Per variant so switching from
   * 12 mm to 20 mm and back keeps what was typed for each. Until something is
   * typed a variant starts at what the cart already holds, or 1.
   */
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const inCart = selected ? (data.quantities[selected.id] ?? 0) : 0;
  const draft = selected ? (drafts[selected.id] ?? String(inCart || 1)) : '1';
  const qty = Math.min(MAX_QTY, Math.max(0, Math.trunc(Number(draft)) || 0));

  function setQty(next: number | string) {
    if (!selected) return;
    const value = typeof next === 'number' ? String(Math.min(MAX_QTY, Math.max(1, next))) : next;
    setDrafts((current) => ({ ...current, [selected.id]: value }));
  }

  /*
   * `setCartQuantity` sets the line rather than adding to it, which is what a
   * double-tap on a slow connection needs: the second tap asserts the same
   * number instead of doubling it. A variant already in the cart opens at its
   * cart quantity, so the button honestly says "Update cart".
   */
  function submit(kind: 'cart' | 'buy') {
    if (!selected || qty < 1) return;
    setBusy(kind);
    startTransition(async () => {
      await setCartQuantity(selected.id, qty);
      if (kind === 'buy') {
        router.push('/checkout');
      } else {
        onClose();
      }
    });
  }

  const unit = selected ? (hi && selected.unitLabelHi) || selected.unitLabelEn : null;
  const showCompare =
    selected?.compareAtPrice && Number(selected.compareAtPrice) > Number(selected.price);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="space-y-5 px-4 py-4">
        <VariantAxes options={data.options} selection={selection} />

        {selected ? (
          <>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-heading3 text-ink">{formatINR(selected.price)}</span>
              {unit && <span className="text-body3 text-ink-muted">{unit}</span>}
              {showCompare && selected.compareAtPrice && (
                <span className="text-body3 text-ink-faint line-through">
                  {formatINR(selected.compareAtPrice)}
                </span>
              )}
            </div>

            {selected.inStock ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="quick-qty" className="text-heading6 text-ink">
                    {hi ? 'मात्रा' : 'Quantity'}
                  </label>

                  <div className="inline-flex h-[var(--tap)] items-center rounded-box border border-hairline-strong">
                    <button
                      type="button"
                      onClick={() => setQty(qty - 1)}
                      disabled={qty <= 1}
                      aria-label={hi ? 'एक कम करें' : 'Decrease quantity'}
                      className="grid h-full w-11 place-items-center rounded-l-box hover:bg-surface-muted disabled:opacity-40"
                    >
                      <Minus className="size-4" aria-hidden />
                    </button>
                    <input
                      id="quick-qty"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={draft}
                      onChange={(event) => setQty(event.target.value.replace(/\D/g, '').slice(0, 3))}
                      onBlur={() => setQty(qty)}
                      className="h-full w-14 border-x border-hairline-strong bg-surface text-center text-cta2 tabular-nums outline-none focus:bg-surface-muted"
                    />
                    <button
                      type="button"
                      onClick={() => setQty(qty + 1)}
                      disabled={qty >= MAX_QTY}
                      aria-label={hi ? 'एक और जोड़ें' : 'Increase quantity'}
                      className="grid h-full w-11 place-items-center rounded-r-box hover:bg-surface-muted disabled:opacity-40"
                    >
                      <Plus className="size-4" aria-hidden />
                    </button>
                  </div>
                </div>

                <LineTotal variant={selected} qty={qty} locale={locale} />
              </>
            ) : (
              <p className="rounded-box bg-surface-muted py-3 text-center text-cta2 text-ink-muted">
                {hi ? 'यह साइज़ अभी नहीं है' : 'This option is out of stock'}
              </p>
            )}
          </>
        ) : (
          <p className="text-body2 text-ink-muted">
            {hi ? 'ऊपर से एक विकल्प चुनें।' : 'Choose an option above to see the price.'}
          </p>
        )}
      </div>

      {/*
       * The two ways out, side by side and equal width.
       *
       * Add to cart is outlined and Buy now solid: Buy now is the one that
       * leaves the page, and a shopper who only meant to add should not land in
       * checkout because the louder button was under their thumb.
       */}
      <div className="sticky bottom-0 grid grid-cols-2 gap-3 border-t border-hairline bg-surface p-4">
        <button
          type="button"
          onClick={() => submit('cart')}
          disabled={!selected?.inStock || qty < 1 || pending}
          className={buttonClass({
            variant: 'quiet',
            size: 'lg',
            block: true,
            className: 'border-buy text-buy hover:bg-success-bg',
          })}
        >
          {pending && busy === 'cart' ? (
            <Loader2 className="size-5 animate-spin" aria-hidden />
          ) : inCart > 0 ? (
            hi ? 'कार्ट अपडेट करें' : 'Update cart'
          ) : hi ? (
            'कार्ट में डालें'
          ) : (
            'Add to cart'
          )}
        </button>
        <button
          type="button"
          onClick={() => submit('buy')}
          disabled={!selected?.inStock || qty < 1 || pending}
          className={buttonClass({ variant: 'buy', size: 'lg', block: true })}
        >
          {pending && busy === 'buy' ? (
            <Loader2 className="size-5 animate-spin" aria-hidden />
          ) : hi ? (
            'अभी खरीदें'
          ) : (
            'Buy now'
          )}
        </button>
      </div>
    </div>
  );
}

/**
 * What this many will cost, with the bulk rung applied if it is reached.
 *
 * `matchTier` from the shared contract, not arithmetic of its own: it is the
 * function the cart and the order are priced with, so the total here cannot
 * promise a bulk rate the cart then refuses.
 */
function LineTotal({
  variant,
  qty,
  locale,
}: {
  variant: StorefrontVariantDto;
  qty: number;
  locale: Locale;
}) {
  const hi = locale === 'hi';
  if (qty < 1) return null;

  const tiers = fromTierDtos(variant.tiers);
  const tier = matchTier(tiers, variant.price, qty, toPaise(variant.price) * qty);
  const rate = tier?.unitPrice ?? variant.price;
  const total = multiplyMoney(rate, qty);

  // The nearest rung not yet reached — the "10 more for ₹285" nudge.
  const next = variant.tiers.find(
    (rung) =>
      toPaise(rung.unitPrice) < toPaise(rate) &&
      (rung.minQuantity !== null
        ? qty < rung.minQuantity
        : toPaise(variant.price) * qty < toPaise(rung.minAmount!)),
  );

  return (
    <div className="space-y-2 rounded-box bg-surface-muted p-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-body2 text-ink-muted">
          {qty} × {formatINR(rate)}
        </span>
        <span className="text-heading4 text-ink tabular-nums">{formatINR(total)}</span>
      </div>

      {tier ? (
        <p className="flex items-center gap-1.5 text-body3 text-success-fg">
          <TrendingDown className="size-4 shrink-0" aria-hidden />
          {hi
            ? `बल्क भाव लागू — ${formatINR(multiplyMoney(subtractMoney(variant.price, rate), qty))} की बचत`
            : `Bulk price applied — you save ${formatINR(multiplyMoney(subtractMoney(variant.price, rate), qty))}`}
        </p>
      ) : null}

      {next && (
        <p className="flex items-center gap-1.5 text-body3 text-success-fg">
          {!tier && <TrendingDown className="size-4 shrink-0" aria-hidden />}
          {next.minQuantity !== null
            ? hi
              ? `${next.minQuantity}+ मात्रा पर ${formatINR(next.unitPrice)} — ${next.minQuantity - qty} और जोड़ें`
              : `${formatINR(next.unitPrice)} at ${next.minQuantity}+ Qty — add ${next.minQuantity - qty} more`
            : hi
              ? `${formatINR(next.minAmount!)} से ऊपर ${formatINR(next.unitPrice)}`
              : `${formatINR(next.unitPrice)} on orders above ${formatINR(next.minAmount!)}`}
        </p>
      )}
    </div>
  );
}
