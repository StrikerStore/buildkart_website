'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, ShoppingCart } from 'lucide-react';
import type { Locale } from '@/lib/i18n';

/**
 * The bar that rises from the bottom once there is something in the cart.
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
 * Hidden on the cart and checkout themselves, where it would be a link to the
 * page you are on, sitting on top of the real controls — and on a product page,
 * where the sticky buy bar occupies the same strip of screen. Two fixed bars
 * cannot share it, and on a product page the one that adds the product wins.
 * The header keeps its cart icon, so the way back is not lost.
 */
const HIDE_ON = ['/cart', '/checkout', '/products'];

export function CartBar({ count, locale }: { count: number; locale: Locale }) {
  const pathname = usePathname();

  if (count === 0) return null;
  if (HIDE_ON.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 p-3 md:hidden print:hidden">
      <Link
        href="/cart"
        className="flex h-14 items-center gap-3 rounded-card bg-ink px-4 text-ink-inverted shadow-sheet"
      >
        <span className="relative grid size-9 shrink-0 place-items-center rounded-box bg-brand text-brand-foreground">
          <ShoppingCart className="size-5" aria-hidden />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-heading6">
            {count} {locale === 'hi' ? 'सामान' : count === 1 ? 'item' : 'items'}
          </span>
          <span className="block text-body5 text-ink-inverted/70">
            {locale === 'hi' ? 'कार्ट देखें' : 'View your cart'}
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-1 text-cta2 text-brand">
          {locale === 'hi' ? 'आगे बढ़ें' : 'Checkout'}
          <ChevronRight className="size-4" aria-hidden />
        </span>
      </Link>
    </div>
  );
}
