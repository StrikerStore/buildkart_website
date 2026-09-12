import type { Metadata } from 'next';
import { AlertTriangle } from 'lucide-react';
import { pricedCart } from '@/lib/cart';
import { currentLocale } from '@/lib/locale';
import { EmptyState } from '@/components/ui/empty-state';
import { CartLine } from '@/components/cart/cart-line';
import { CartSummary } from '@/components/cart/cart-summary';
import { CouponList } from '@/components/cart/coupon-list';

export const metadata: Metadata = {
  title: 'Cart',
  robots: { index: false, follow: false },
};

/**
 * The cart.
 *
 * A Server Component that prices on every render. The browser holds variant ids
 * and quantities; everything with a rupee sign in it comes back from
 * `storefront.priceCart`, which recomputes from the catalogue — so a rate the
 * owner changed this morning is reflected the moment the page is reloaded,
 * rather than whenever the shopper last touched a stepper.
 */
export default async function CartPage() {
  const [locale, cart] = await Promise.all([currentLocale(), pricedCart()]);

  const empty = cart.lines.length === 0;

  return (
    <div className="page-w page-x py-4 sm:py-5">
      <h1 className="text-heading3 text-ink sm:text-heading2">
        {locale === 'hi' ? 'कार्ट' : 'Cart'}
        {cart.itemCount > 0 && (
          <span className="ml-2 text-body2 text-ink-muted sm:text-body1">
            {cart.itemCount} {locale === 'hi' ? 'सामान' : cart.itemCount === 1 ? 'item' : 'items'}
          </span>
        )}
      </h1>

      {/*
        * Lines that were in the cookie and are not in the cart any more, said
        * out loud. A contractor who added twenty lines and finds nineteen at
        * checkout needs to be told which one went and why — silently dropping
        * it and letting them notice the total changed is how trust goes.
        */}
      {cart.dropped.length > 0 && (
        <div className="mt-4 rounded-card border border-warning/30 bg-warning-bg p-3">
          <p className="flex items-center gap-2 text-heading6 text-ink">
            <AlertTriangle className="size-4 shrink-0 text-warning" aria-hidden />
            {locale === 'hi' ? 'कुछ सामान हटाना पड़ा' : 'Some items were removed'}
          </p>
          <ul className="mt-1.5 space-y-0.5 text-body3 text-ink-muted">
            {cart.dropped.map((item) => (
              <li key={item.variantId}>
                {item.nameEn ?? (locale === 'hi' ? 'एक सामान' : 'An item')}
                {' — '}
                {item.reason === 'OUT_OF_STOCK'
                  ? locale === 'hi'
                    ? 'स्टॉक ख़त्म'
                    : 'out of stock'
                  : locale === 'hi'
                    ? 'अब उपलब्ध नहीं'
                    : 'no longer available'}
              </li>
            ))}
          </ul>
        </div>
      )}

      {empty ? (
        <div className="mt-6">
          <EmptyState
            title={locale === 'hi' ? 'कार्ट खाली है' : 'Your cart is empty'}
            body={
              locale === 'hi'
                ? 'सीमेंट, सरिया, प्लाईवुड — जो चाहिए वो जोड़ें।'
                : 'Add cement, sariya, plywood or anything else you need on site.'
            }
            actionHref="/"
            actionLabel={locale === 'hi' ? 'सामान देखें' : 'Start shopping'}
          />
        </div>
      ) : (
        <div className="mt-5 gap-8 lg:flex lg:items-start">
          <div className="min-w-0 flex-1">
            {/*
              * The cart-wide bulk progress bar is gone with the store-wide
              * cutoff it measured. Bulk is per line now, so the nudge lives on
              * each row — beside the quantity control that acts on it — and the
              * total saved is a line in the bill summary.
              */}
            {/* Edge-to-edge on a phone: 16px of gutter either side of a 360px
                screen is 9% of the width spent on nothing. */}
            <ul className="-mx-4 divide-y divide-hairline border-y border-hairline bg-surface px-4 sm:mx-0 sm:rounded-card sm:border">
              {cart.lines.map((line) => (
                <CartLine key={line.variantId} line={line} locale={locale} />
              ))}
            </ul>

            <div className="mt-4 sm:mt-4">
              <CouponList
                discount={cart.discount}
                locale={locale}
                lineCount={cart.lines.length}
              />
            </div>
          </div>

          {/* Sticky on desktop so the total stays visible down a long list;
              on a phone it simply follows the lines, because a fixed panel
              would eat a third of a small screen. */}
          <div className="mt-5 lg:mt-0 lg:w-80 lg:shrink-0 lg:sticky lg:top-[calc(var(--header-h)+16px)]">
            <CartSummary cart={cart} locale={locale} />
          </div>
        </div>
      )}
    </div>
  );
}
