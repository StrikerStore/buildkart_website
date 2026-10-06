'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import type {
  ActionResult,
  PaymentOutcomeDto,
  PaymentStartDto,
  PlacedOrderDto,
} from '@StrikerStore/contract';
import { api } from '@/lib/api/server';
import { currentCart, currentPromo, currentUnloading } from '@/lib/cart';
import { CART_COOKIE, PROMO_COOKIE, UNLOADING_COOKIE } from '@/lib/cart-shared';
import { chooseSavedAddress } from '@/app/location/actions';

/**
 * What the cart knows about the order — everything except how it is paid.
 *
 * The address travels as an **id**: the API reads it, its pin and its receiver
 * from the customer's own address book, so nothing here can point an order at
 * a place the customer does not own.
 */
type CheckoutDetails = {
  addressId: string;
  customerNote?: string;
  /**
   * The buyer's GSTIN, when they asked for an invoice in a firm's name.
   *
   * Passed through untouched. `placeOrderSchema` normalises the spacing and
   * case and checks the checksum — doing any of that here would be a second
   * implementation for a crafted request to walk around.
   */
  gstin?: string;
  /** Pay part of the order from the wallet. The server decides how much. */
  useWallet?: boolean;
};

/**
 * The basket as the cart page left it.
 *
 * The lines come from **the cart cookie on the server**, not from the form.
 * That is deliberate: a form that posted its own lines could post different
 * ones than the review screen showed, and the shopper would be agreeing to a
 * total that belonged to a different basket. The unloading choice comes from
 * the cookie too, so the order matches what the cart showed.
 */
async function basket() {
  const [lines, promo, unloading] = await Promise.all([
    currentCart(),
    currentPromo(),
    currentUnloading(),
  ]);
  return {
    // Already in the book; nothing to file.
    saveAddress: false,
    lines: lines.map((line) => ({ variantId: line.variantId, quantity: line.qty })),
    ...(promo ? { discountCode: promo } : {}),
    unloading,
  };
}

/**
 * Empties the cart, once an order exists for it.
 *
 * Never sooner: a customer whose payment failed must still have the basket
 * they spent twenty minutes building.
 */
async function clearCart() {
  const store = await cookies();
  store.delete(CART_COOKIE);
  store.delete(PROMO_COOKIE);
  store.delete(UNLOADING_COOKIE);
  revalidatePath('/', 'layout');
}

/**
 * The delivery address, chosen from the book.
 *
 * Moves the delivery area to it as well — `chooseSavedAddress` re-checks we
 * deliver there and sets both cookies — so the cart reprices for exactly the
 * place the order will go.
 */
export async function selectDeliveryAddress(
  addressId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await chooseSavedAddress(addressId);
  if ('error' in result) return { ok: false, error: result.error };
  if (!result.serviced) {
    return { ok: false, error: `We do not deliver to ${result.pincode} yet.` };
  }
  revalidatePath('/cart');
  return { ok: true };
}

/**
 * Starting an online payment.
 *
 * Nothing is placed here — the API opens a payment at the shop's top-priority
 * gateway, which shows the customer every way it can take the money. `ADVANCE`
 * is partial COD: only the advance is taken now, worked out by the server. The
 * cart is cleared only where an order was written outright: the wallet
 * covered the whole total.
 */
export async function startPayment(
  input: CheckoutDetails & { mode: 'FULL' | 'ADVANCE' },
): Promise<ActionResult<PaymentStartDto>> {
  const result = await (await api()).storefront.startPayment.mutate({
    ...input,
    ...(await basket()),
  });
  if (result.ok && result.data.gateway === 'NONE') await clearCart();
  return result;
}

/**
 * Razorpay's modal reported success. The API checks the signature and reads
 * the payment back before an order is written; the cart goes only once it is.
 */
export async function confirmRazorpay(input: {
  sessionId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): Promise<ActionResult<PaymentOutcomeDto>> {
  const result = await (await api()).storefront.confirmRazorpay.mutate(input);
  if (result.ok && result.data.status === 'PAID') await clearCart();
  return result;
}

/** The customer closed the gateway. Bookkeeping only; failures are not worth surfacing. */
export async function reportPaymentFailed(sessionId: string, reason?: string): Promise<void> {
  try {
    await (await api()).storefront.paymentFailed.mutate({ sessionId, reason });
  } catch {
    // The session expires on its own; nothing the customer needs to hear about.
  }
}

/** Placing a cash-on-delivery order — written at once, paid at the door. */
export async function placeOrder(input: CheckoutDetails): Promise<ActionResult<PlacedOrderDto>> {
  const result = await (await api()).storefront.placeOrder.mutate({
    ...input,
    paymentMethod: 'COD',
    ...(await basket()),
  });

  // Emptied only after the order is committed — see `clearCart`.
  if (result.ok) await clearCart();

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
