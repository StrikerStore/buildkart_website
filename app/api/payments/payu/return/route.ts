import { NextResponse, type NextRequest } from 'next/server';
import { api } from '@/lib/api/server';
import { CART_COOKIE, PROMO_COOKIE, UNLOADING_COOKIE } from '@/lib/cart-shared';
import { absoluteUrl } from '@/lib/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Where PayU sends the customer back — both `surl` and `furl` point here.
 *
 * PayU POSTs the result from its own domain, so the browser sends none of our
 * SameSite cookies with it: there is no signed-in customer on this request, and
 * nothing here needs one. The form is relayed to the API untouched; the API
 * finds the payment session by `txnid`, checks PayU's hash, and confirms the
 * money server-to-server before it writes an order.
 *
 * The answer is always a 303 to a page. The GET that follows is a top-level
 * navigation, which *does* carry the session cookie, so the order page loads
 * signed in.
 */
export async function POST(request: NextRequest) {
  let fields: Record<string, string> = {};
  try {
    const form = await request.formData();
    fields = Object.fromEntries(
      [...form.entries()].map(([key, value]) => [key, typeof value === 'string' ? value : '']),
    );
  } catch {
    return back('failed', 'The payment response could not be read. If money left your account, please call us.');
  }

  let outcome;
  try {
    outcome = await (await api()).storefront.payuReturn.mutate(fields);
  } catch {
    return back(
      'pending',
      'We could not confirm your payment just now. If it went through, your order will appear in a few minutes.',
    );
  }

  if (outcome.status === 'PAID') {
    const response = NextResponse.redirect(
      absoluteUrl(`/account/orders/${outcome.order.orderId}?placed=1`),
      303,
    );
    // The order exists now, so the basket it came from can go.
    response.cookies.delete(CART_COOKIE);
    response.cookies.delete(PROMO_COOKIE);
    response.cookies.delete(UNLOADING_COOKIE);
    return response;
  }

  return back(outcome.status === 'REFUNDED' ? 'refunded' : outcome.status === 'PENDING' ? 'pending' : 'failed', outcome.message);
}

/** Back to checkout, cart intact, with the reason shown above the payment options. */
function back(status: 'failed' | 'refunded' | 'pending', reason: string) {
  const query = new URLSearchParams({ payment: status, reason });
  return NextResponse.redirect(absoluteUrl(`/checkout?${query.toString()}`), 303);
}
