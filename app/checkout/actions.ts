'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import type { ActionResult, PlacedOrderDto } from '@StrikerStore/contract';
import { api } from '@/lib/api/server';
import { currentCart, currentPromo } from '@/lib/cart';
import { CART_COOKIE, PROMO_COOKIE } from '@/lib/cart-shared';

/**
 * Placing the order.
 *
 * The lines come from **the cart cookie on the server**, not from the form.
 * That is deliberate: a form that posted its own lines could post different
 * ones than the review screen showed, and the shopper would be agreeing to a
 * total that belonged to a different basket. The form carries the address and
 * the payment choice, which are the only things it actually knows.
 */
export async function placeOrder(input: {
  name?: string;
  /** The customer's nickname for this place, filed with the address book row. */
  addressLabel?: string;
  address: {
    line1: string;
    line2?: string;
    landmark?: string;
    city: string;
    state: string;
    pincode: string;
    latitude?: number;
    longitude?: number;
  };
  paymentMethod: string;
  customerNote?: string;
  saveAddress: boolean;
  /**
   * The buyer's GSTIN, when they asked for an invoice in a firm's name.
   *
   * Passed through untouched. `placeOrderSchema` normalises the spacing and
   * case and checks the checksum — doing any of that here would be a second
   * implementation for a crafted request to walk around.
   */
  gstin?: string;
}): Promise<ActionResult<PlacedOrderDto>> {
  const [lines, promo] = await Promise.all([currentCart(), currentPromo()]);

  const result = await (await api()).storefront.placeOrder.mutate({
    ...input,
    lines: lines.map((line) => ({ variantId: line.variantId, quantity: line.qty })),
    ...(promo ? { discountCode: promo } : {}),
  });

  if (result.ok) {
    /*
     * The cart is emptied only after the order is committed. Clearing it first
     * would leave a customer whose payment failed with neither an order nor the
     * basket they spent twenty minutes building.
     */
    const store = await cookies();
    store.delete(CART_COOKIE);
    store.delete(PROMO_COOKIE);
    revalidatePath('/', 'layout');
  }

  return result;
}

/**
 * "Same order again" — PLAN.md §6.8.
 *
 * Copies a past order's lines into the cart and nothing else. No prices come
 * across: the cart reprices everything from today's catalogue, which for a shop
 * whose rates move daily is the only honest way to repeat an order.
 */
export async function reorder(orderId: string): Promise<{ lines: number }> {
  const lines = await (await api()).storefront.reorder.query({ id: orderId });

  (await cookies()).set(
    CART_COOKIE,
    JSON.stringify(lines.map((line) => ({ variantId: line.variantId, qty: line.quantity }))),
    { maxAge: 60 * 60 * 24 * 30, path: '/', sameSite: 'lax', httpOnly: false },
  );

  revalidatePath('/', 'layout');
  return { lines: lines.length };
}
