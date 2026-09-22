'use server';

import { imageUrl, IMAGE } from '@/lib/media';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import type { CartCouponDto, CartDto } from '@StrikerStore/contract';
import { api } from '@/lib/api/server';
import { currentCart, currentPromo, pricedCart } from '@/lib/cart';
import { currentLocation } from '@/lib/location';
import {
  CART_COOKIE,
  CART_MAX_AGE,
  parseCart,
  parsePromo,
  PROMO_COOKIE,
  UNLOADING_COOKIE,
  serialiseCart,
  withQuantity,
} from '@/lib/cart-shared';

/**
 * Setting a line's quantity — the one write the cart has.
 *
 * Not `add` and `remove` and `increment`. Every control on the site (a card's
 * ADD, a stepper's plus, a cart row's bin) ends up asserting "this variant, this
 * many", and one idempotent setter means a double-tap on a slow connection
 * cannot add two bags of cement where the customer asked for one. Zero removes
 * the line.
 *
 * A Server Action rather than a browser fetch: the tRPC client is `server-only`
 * and carries `SERVICE_TOKEN`. Nothing here trusts the caller's arithmetic —
 * `withQuantity` clamps, and prices are never in the cookie at all.
 */
export async function setCartQuantity(variantId: string, qty: number): Promise<{ count: number }> {
  const store = await cookies();
  const lines = withQuantity(parseCart(store.get(CART_COOKIE)?.value), variantId, qty);

  store.set(CART_COOKIE, serialiseCart(lines), {
    maxAge: CART_MAX_AGE,
    path: '/',
    sameSite: 'lax',
    // Readable by script, like the location cookie and unlike the session:
    // nothing in it is a credential, and it holds no prices to tamper with.
    httpOnly: false,
  });

  /*
   * The layout, not the current page: the header's cart badge is rendered by
   * `app/layout.tsx`, so revalidating only the page the button sits on would
   * leave the badge showing the old count.
   */
  revalidatePath('/', 'layout');

  return { count: lines.reduce((sum, line) => sum + line.qty, 0) };
}

/**
 * Applying or clearing a discount code.
 *
 * The code is stored; what it is *worth* is not. Every price recomputes it from
 * the database, so a cookie can assert which code was typed and never how much
 * it takes off — which is the same reason the cart cookie holds no prices.
 *
 * Clearing is the same action with an empty string rather than a second one, so
 * there is one place that writes this cookie.
 */
export async function setPromoCode(raw: string): Promise<{ code: string | null }> {
  const store = await cookies();
  const code = parsePromo(raw);

  if (code) {
    store.set(PROMO_COOKIE, code, {
      maxAge: CART_MAX_AGE,
      path: '/',
      sameSite: 'lax',
      httpOnly: false,
    });
  } else {
    store.delete(PROMO_COOKIE);
  }

  revalidatePath('/', 'layout');
  return { code };
}

/**
 * Adds or removes the unloading service.
 *
 * Only the choice is stored; the fee comes from the shop's settings each time
 * the cart is priced, so a cookie cannot name its own price.
 */
export async function setUnloading(on: boolean): Promise<void> {
  const store = await cookies();
  if (on) {
    store.set(UNLOADING_COOKIE, '1', {
      maxAge: CART_MAX_AGE,
      path: '/',
      sameSite: 'lax',
      httpOnly: false,
    });
  } else {
    store.delete(UNLOADING_COOKIE);
  }
  revalidatePath('/', 'layout');
}

/**
 * The priced cart, for the mini cart to fetch when it opens.
 *
 * Deliberately *not* rendered into every page's header. The mini cart's
 * contents need product names and images, which means pricing the whole cart —
 * a database round trip on every page view, to fill a panel almost nobody
 * opens. Loading it on open costs nothing until it is wanted.
 */
export async function loadCart(): Promise<CartDto> {
  return pricedCart();
}

/** One face in the cart capsule's stack. */
export type CartThumb = { src: string | null; alt: string };

/**
 * The first few products in the cart, as thumbnails for the floating capsule.
 *
 * Called by the capsule itself, after paint, and only when the count changes —
 * not by the layout. The capsule's own comment explains why: pricing the cart
 * on every page render to decorate a bar the shopper glances at would put a
 * database round trip on every page view. Here the cost is paid once per
 * change in what is in the cart, and never blocks a render.
 *
 * Swallows errors: a capsule with plain placeholder discs is a cosmetic loss,
 * and must never be the thing that breaks the page it floats over.
 */
export async function loadCartThumbs(): Promise<CartThumb[]> {
  try {
    const cart = await pricedCart();
    return await Promise.all(
      cart.lines.slice(0, 3).map(async (line) => ({
        src: await imageUrl(line.imageKey, IMAGE.thumb),
        alt: line.nameEn,
      })),
    );
  } catch {
    return [];
  }
}

/**
 * Every running offer, judged against this cart.
 *
 * Loaded when the coupon sheet opens rather than with the page: evaluating
 * every discount in the shop on every cart render is work almost no render
 * needs.
 */
export async function loadCoupons(): Promise<CartCouponDto[]> {
  const [lines, location, promo] = await Promise.all([
    currentCart(),
    currentLocation(),
    currentPromo(),
  ]);

  return (await api()).storefront.coupons.query({
    lines: lines.map((line) => ({ variantId: line.variantId, quantity: line.qty })),
    ...(location ? { pincode: location.pincode } : {}),
    ...(promo ? { appliedCode: promo } : {}),
  });
}
