'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronRight, Loader2, Tag, X } from 'lucide-react';
import { formatINR, type CartCouponDto, type CartDiscountDto } from '@StrikerStore/contract';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import type { Locale } from '@/lib/i18n';
import { loadCoupons, setPromoCode } from '@/app/cart/actions';

/**
 * Offers, and what it would take to use the ones that do not apply yet.
 *
 * An ineligible coupon is shown faded rather than hidden, and that is the whole
 * point of the list: "Add ₹4,270 more to use this" is the most persuasive thing
 * on a cart page. Hiding it, or greying it with no explanation, throws that
 * away and leaves the shopper suspecting the shop is hiding something.
 *
 * Eligibility is decided on the server against the real cart — this component
 * only renders the verdict. A list that judged coupons itself would be a second
 * copy of the discount rules, and the two would disagree the first time a
 * minimum changed.
 */
export function CouponList({
  discount,
  locale,
  lineCount,
}: {
  discount: CartDiscountDto | null;
  locale: Locale;
  lineCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [coupons, setCoupons] = useState<CartCouponDto[] | null>(null);
  const [pending, startTransition] = useTransition();
  const [typed, setTyped] = useState('');

  function openList() {
    setOpen(true);
    // Loaded on open, not with the page: evaluating every discount in the shop
    // on every cart render is work nobody asked for.
    startTransition(async () => setCoupons(await loadCoupons()));
  }

  function apply(code: string) {
    startTransition(async () => {
      await setPromoCode(code);
      router.refresh();
      setCoupons(await loadCoupons());
    });
  }

  return (
    <div className="rounded-card border border-hairline bg-surface">
      {/* --- applied, or the way in ------------------------------------- */}
      {discount?.applied ? (
        <div className="flex items-center gap-2 p-3">
          <Tag className="size-4 shrink-0 text-success" aria-hidden />
          <p className="min-w-0 flex-1 text-body2 text-success">
            <span className="font-bold">{discount.code}</span>
            {' — '}
            {locale === 'hi'
              ? `${formatINR(discount.amount)} की छूट लगी`
              : `${formatINR(discount.amount)} off`}
          </p>
          <button
            type="button"
            onClick={() => apply('')}
            disabled={pending}
            aria-label={locale === 'hi' ? 'कोड हटाएँ' : 'Remove code'}
            className="grid size-8 shrink-0 place-items-center rounded-box text-success hover:bg-success-bg"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={openList}
          disabled={lineCount === 0}
          className="flex w-full items-center gap-2 p-3 text-left hover:bg-surface-muted disabled:opacity-50"
        >
          <Tag className="size-4 shrink-0 text-brand-text" aria-hidden />
          <span className="min-w-0 flex-1 text-body2 text-ink">
            {locale === 'hi' ? 'कूपन लगाएँ' : 'Apply a coupon'}
          </span>
          <ChevronRight className="size-4 shrink-0 text-ink-faint" aria-hidden />
        </button>
      )}

      {/* A rejected code stays visible with its reason — the shopper can see
          what they typed and why, which is actionable. */}
      {discount && !discount.applied && discount.message && (
        <p role="alert" className="border-t border-hairline px-3 py-2 text-body3 text-error">
          {discount.code}: {discount.message}
        </p>
      )}

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-ink/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />

          <div
            role="dialog"
            aria-label={locale === 'hi' ? 'कूपन' : 'Coupons'}
            className={cn(
              'fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-card bg-surface shadow-sheet',
              'sm:inset-0 sm:m-auto sm:h-fit sm:max-h-[80vh] sm:w-[440px] sm:rounded-card',
            )}
          >
            <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
              <h2 className="text-heading5 text-ink">
                {locale === 'hi' ? 'उपलब्ध कूपन' : 'Available offers'}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={locale === 'hi' ? 'बंद करें' : 'Close'}
                className="grid size-9 place-items-center rounded-box text-ink hover:bg-surface-muted"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            {/* Typing a code still works: the shop may run a code that is not
                on this list — a number given over the phone, say. */}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                apply(typed);
                setTyped('');
              }}
              className="flex gap-2 border-b border-hairline p-4"
            >
              <label htmlFor="coupon-code" className="sr-only">
                {locale === 'hi' ? 'छूट कोड' : 'Discount code'}
              </label>
              <input
                id="coupon-code"
                value={typed}
                onChange={(event) => setTyped(event.target.value.toUpperCase().slice(0, 64))}
                placeholder={locale === 'hi' ? 'कोड लिखें' : 'Enter a code'}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                className="h-[var(--tap)] min-w-0 flex-1 rounded-box border border-hairline-strong bg-surface px-3 text-body1 uppercase tracking-wide text-ink focus:border-ink focus:outline-none"
              />
              <Button type="submit" variant="quiet" disabled={pending || typed.trim() === ''}>
                {locale === 'hi' ? 'लगाएँ' : 'Apply'}
              </Button>
            </form>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {!coupons ? (
                <div className="grid place-items-center py-10">
                  <Loader2 className="size-5 animate-spin text-ink-faint" aria-hidden />
                </div>
              ) : coupons.length === 0 ? (
                <p className="py-8 text-center text-body2 text-ink-muted">
                  {locale === 'hi' ? 'अभी कोई ऑफ़र नहीं है।' : 'No offers running right now.'}
                </p>
              ) : (
                <ul className={cn('space-y-3', pending && 'opacity-60')}>
                  {coupons.map((coupon) => (
                    <li
                      key={coupon.code}
                      className={cn(
                        'rounded-card border p-3',
                        coupon.eligible
                          ? 'border-hairline-strong bg-surface'
                          : // Faded, not hidden — the requirement below is the
                            // reason this row is worth showing at all.
                            'border-hairline bg-surface-muted opacity-70',
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                'rounded-[4px] border border-dashed px-1.5 py-0.5 text-cta3 tracking-wider',
                                coupon.eligible
                                  ? 'border-brand-dark text-brand-text'
                                  : 'border-ink-faint text-ink-muted',
                              )}
                            >
                              {coupon.code}
                            </span>
                            {coupon.applied && (
                              <Check className="size-4 text-success" aria-hidden />
                            )}
                          </p>

                          <p className="mt-1 text-heading7 text-ink">{coupon.headline}</p>

                          {coupon.eligible ? (
                            <p className="mt-0.5 text-body4 text-success">
                              {locale === 'hi'
                                ? `${formatINR(coupon.amount)} बचेंगे`
                                : `Saves ${formatINR(coupon.amount)} on this order`}
                            </p>
                          ) : (
                            <p className="mt-0.5 text-body4 text-warning">{coupon.requirement}</p>
                          )}
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          variant={coupon.eligible ? 'outline' : 'quiet'}
                          disabled={!coupon.eligible || pending || coupon.applied}
                          onClick={() => apply(coupon.code)}
                        >
                          {coupon.applied
                            ? locale === 'hi'
                              ? 'लगा है'
                              : 'Applied'
                            : locale === 'hi'
                              ? 'लगाएँ'
                              : 'Apply'}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
