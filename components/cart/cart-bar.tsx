'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ChevronRight, ShoppingCart } from 'lucide-react';
import { loadCartThumbs, type CartThumb } from '@/app/cart/actions';
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

  /*
   * Always rendered, hidden by attribute rather than by returning null.
   *
   * An unmounted element cannot animate out — React removes it between two
   * frames and the capsule that took 240ms to rise simply blinks away. Keeping
   * it mounted and letting CSS own the visibility is what makes the exit
   * possible; `display: none` in the hidden state keeps it out of the layout,
   * the tab order and the accessibility tree once it has gone.
   */
  const hidden = count === 0 || matches(HIDE_ON);

  /*
   * The last count worth showing, held through the exit.
   *
   * The capsule spends about a quarter-second leaving, and it is still on
   * screen for all of it — reading the live count would flip the label to
   * "View cart · 0 items" for exactly as long as the shopper can still see it.
   */
  const [lastCount, setLastCount] = useState(count);
  if (count > 0 && count !== lastCount) setLastCount(count);
  const shown = count > 0 ? count : lastCount;

  const items = locale === 'hi' ? 'सामान' : shown === 1 ? 'Item' : 'Items';

  /*
   * The product faces in the stack.
   *
   * Fetched here, after paint, rather than passed down by the layout: the
   * layout only knows a count, and learning *which* products is a pricing
   * round trip it deliberately does not make on every page view. Refetched when
   * the count changes, since that is exactly when the faces can change; the
   * ticket drops a slow answer that arrives after a newer one.
   */
  const [thumbs, setThumbs] = useState<CartThumb[]>([]);
  const ticket = useRef(0);
  useEffect(() => {
    if (count === 0) return;
    const mine = ++ticket.current;
    loadCartThumbs().then((next) => {
      if (mine === ticket.current) setThumbs(next);
    });
  }, [count]);

  return (
    <div
      data-hidden={hidden}
      className={cn(
        'cart-capsule fixed inset-x-0 z-30 flex justify-center px-3 md:hidden print:hidden',
        // `--buy-bar-h` is defined once in globals.css and is the buy bar's
        // height; keeping the number there stops the two drifting apart.
        matches(ABOVE_BUY_BAR) ? 'bottom-[calc(var(--buy-bar-h)+0.75rem)]' : 'bottom-3',
      )}
    >
      <Link
        href="/cart"
        // Unreachable while it is leaving. `display: none` handles this once the
        // exit finishes, but for those few frames the link is still laid out,
        // and a capsule on its way out should not be tabbable or announced.
        tabIndex={hidden ? -1 : undefined}
        aria-hidden={hidden || undefined}
        // The arrow replaced the words, so the link needs its name back —
        // without this a screen reader announces a chevron and nothing else.
        aria-label={
          locale === 'hi' ? `कार्ट देखें, ${shown} सामान` : `View cart, ${shown} ${items}`
        }
        className="inline-flex h-14 max-w-full items-center gap-3 rounded-pill bg-buy py-1.5 pr-1.5 pl-2 text-buy-foreground shadow-sheet"
      >
        {/*
         * The cart's first few products, overlapping, each ringed in the pill's
         * own green so the edges read as a stack rather than a smudge. Until the
         * faces arrive — or if the cart has no photos — a single cart disc holds
         * the space, so the pill never changes width under the shopper's thumb.
         */}
        <span className="flex shrink-0 items-center" aria-hidden>
          {thumbs.length > 0 ? (
            thumbs.map((thumb, index) => (
              <span
                key={index}
                className={cn(
                  'grid size-10 place-items-center overflow-hidden rounded-full bg-surface ring-2 ring-buy',
                  index > 0 && '-ml-4',
                )}
              >
                {thumb.src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb.src} alt="" className="size-full object-cover" />
                ) : (
                  <ShoppingCart className="size-4 text-buy" />
                )}
              </span>
            ))
          ) : (
            <span className="grid size-10 place-items-center rounded-full bg-surface text-buy">
              <ShoppingCart className="size-[18px]" />
            </span>
          )}
        </span>

        <span className="min-w-0 pr-2 leading-tight">
          <span className="block truncate text-heading5">
            {locale === 'hi' ? 'कार्ट देखें' : 'View cart'}
          </span>
          <span className="block truncate text-body4 text-buy-foreground/85">
            {shown} {items}
          </span>
        </span>

        {/* A darker disc of the same green: the arrow is the way forward, and
            it reads as a button inside the pill rather than a decoration. */}
        <span
          className="grid size-11 shrink-0 place-items-center rounded-full bg-buy-dark"
          aria-hidden
        >
          <ChevronRight className="size-5" />
        </span>
      </Link>
    </div>
  );
}
