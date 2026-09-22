import 'server-only';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { api } from './api/server';
import { currentLocation } from './location';
import {
  CART_COOKIE,
  parseCart,
  parsePromo,
  PROMO_COOKIE,
  UNLOADING_COOKIE,
  type CartLine,
} from './cart-shared';

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

/** Whether the shopper has added the unloading service. */
export const currentUnloading = cache(async (): Promise<boolean> => {
  return (await cookies()).get(UNLOADING_COOKIE)?.value === '1';
});

/**
 * The cart, priced by the server.
 *
 * One place that assembles the three inputs — lines, delivery area, promo code
 * — so the cart page, the mini cart and (later) checkout cannot disagree about
 * what is being priced.
 */
export const pricedCart = cache(async () => {
  const [lines, location, promo, unloading] = await Promise.all([
    currentCart(),
    currentLocation(),
    currentPromo(),
    currentUnloading(),
  ]);

  return (await api()).storefront.priceCart.query({
    lines: lines.map((line) => ({ variantId: line.variantId, quantity: line.qty })),
    ...(location ? { pincode: location.pincode } : {}),
    /*
     * The pin, when the shopper has dropped one, so a shop charging by distance
     * can quote a real figure rather than a placeholder.
     *
     * It comes from the `bk_area` cookie, which is not httpOnly — so this is
     * the one input on this call the client can move in its own favour. It can
     * only ever understate a distance, and only in a preview: the charge that
     * is taken is struck again at order time from the address the goods are
     * going to. See the note on `priceCartSchema`.
     */
    ...(location?.latitude && location.longitude
      ? { latitude: Number(location.latitude), longitude: Number(location.longitude) }
      : {}),
    ...(promo ? { discountCode: promo } : {}),
    unloading,
  });
});
