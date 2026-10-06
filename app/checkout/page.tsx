import { redirect } from 'next/navigation';

/**
 * Checkout lives on the cart now.
 *
 * The address, the payment choice and the button all sit under the bill, so
 * there is one screen between "this is what I want" and the payment window.
 * This route stays only so old links and bookmarks land somewhere useful.
 */
export default function CheckoutPage() {
  redirect('/cart');
}
