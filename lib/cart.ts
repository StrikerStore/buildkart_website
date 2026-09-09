import 'server-only';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { api } from './api/server';
import { currentLocation } from './location';
import { CART_COOKIE, parseCart, parsePromo, PROMO_COOKIE, type CartLine } from './cart-shared';

export * from './cart-shared';

/**
 * This request's cart lines.
 *
 * `cache`d so the header badge, a page's ADD buttons and the cart summary
 * resolve it once between them.
 */
export const currentCart = cache(async (): Promise<CartLine[]> => {
  return parseCart((await cookies()).get(CART_COOKIE)?.value);
});

/**
 * How many of one variant are in the cart.
 *
 * What turns a card's ADD button into a `− 2 +` stepper without the page having
 * to hand every card the whole cart.
 */
export async function quantityOf(variantId: string | null): Promise<number> {
  if (!variantId) return 0;
  const lines = await currentCart();
  return lines.find((line) => line.variantId === variantId)?.qty ?? 0;
}

/** The promo code in play for this request, if the shopper has typed one. */
export const currentPromo = cache(async (): Promise<string | null> => {
  return parsePromo((await cookies()).get(PROMO_COOKIE)?.value);
});

/**
 * The cart, priced by the server.
 *
 * One place that assembles the three inputs — lines, delivery area, promo code
 * — so the cart page, the mini cart and (later) checkout cannot disagree about
 * what is being priced.
 */
export const pricedCart = cache(async () => {
  const [lines, location, promo] = await Promise.all([
    currentCart(),
    currentLocation(),
    currentPromo(),
  ]);

  return (await api()).storefront.priceCart.query({
    lines: lines.map((line) => ({ variantId: line.variantId, quantity: line.qty })),
    ...(location ? { pincode: location.pincode } : {}),
    ...(promo ? { discountCode: promo } : {}),
  });
});
