'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Locale } from '@/lib/i18n';

/**
 * The capsule that rises from the bottom once there is something in the cart.
 *
 * The quick-commerce staple, and it earns its place: on a phone the header
 * scrolls away three swipes into a category, and without this the only way back
 * to the cart is to scroll to the top. It is also the site's one persistent
 * reminder that an order is half-built.
 *
 * **It shows a count, not a total.** A total would mean pricing the cart on
 * every page render — a database round trip per page view to fill a bar the
 * shopper mostly glances at. The count comes free from the cookie the server
 * already read for the header badge.
 *
 * **A capsule rather than a full-width bar**, and that is what lets it appear on
 * a product page. It used to be hidden there, because the sticky buy bar owns
 * the bottom strip and two full-bleed bars cannot share it — which left a
 * shopper who had just added six bags with no way forward from the page they
 * were on. Sized to its content and lifted clear of the buy bar, it stacks
 * above instead of competing.
 *
 * The arrow carries the whole "go on then" message; the word "Checkout" would
 * not fit and was in any case a promise this link does not keep — it goes to
 * the cart, where the shopper reviews before paying.
 *
 * Still hidden on the cart and checkout themselves, where it would be a link to
 * the page you are already on, floating over the real controls.
 */
const HIDE_ON = ['/cart', '/checkout'];

/**
 * Routes whose own sticky bar the capsule has to clear.
 *
 * The offset applies to every product route rather than only those actually
 * showing a buy bar — the picker hides its bar until a variant is chosen, and
 * this component cannot see that. A capsule floating one bar-height high on an
 * unselected multi-variant product is a cosmetic oddity; the alternative is a
 * capsule sitting on top of the ADD button on every ordinary product.
 */
const ABOVE_BUY_BAR = ['/products'];

export function CartBar({ count, locale }: { count: number; locale: Locale }) {
  const pathname = usePathname();
  const matches = (paths: string[]) =>
    paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  if (count === 0) return null;
  if (matches(HIDE_ON)) return null;

  const items = locale === 'hi' ? 'सामान' : count === 1 ? 'item' : 'items';

  return (
    <div
      className={cn(
        'fixed inset-x-0 z-30 flex justify-center px-3 md:hidden print:hidden',
        // `--buy-bar-h` is defined once in globals.css and is the buy bar's
        // height; keeping the number there stops the two drifting apart.
        matches(ABOVE_BUY_BAR) ? 'bottom-[calc(var(--buy-bar-h)+0.75rem)]' : 'bottom-3',
      )}
    >
      <Link
        href="/cart"
        // The arrow replaced the words, so the link needs its name back —
        // without this a screen reader announces a chevron and nothing else.
        aria-label={
          locale === 'hi' ? `कार्ट देखें, ${count} सामान` : `View cart, ${count} ${items}`
        }
        className="cart-capsule inline-flex h-12 max-w-full items-center gap-2.5 rounded-pill bg-ink py-1.5 pr-1.5 pl-2 text-ink-inverted shadow-sheet"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand text-brand-foreground">
          <ShoppingCart className="size-[18px]" aria-hidden />
        </span>

        <span className="min-w-0 truncate text-heading6">
          {locale === 'hi' ? `कार्ट देखें · ${count} ${items}` : `View cart · ${count} ${items}`}
        </span>

        {/* The one spot of brand colour on a charcoal pill, which is what makes
            it read as the way forward rather than a status chip. */}
        <span
          className="grid size-9 shrink-0 place-items-center rounded-full bg-brand text-brand-foreground"
          aria-hidden
        >
          <ChevronRight className="size-5" />
        </span>
      </Link>
    </div>
  );
}
