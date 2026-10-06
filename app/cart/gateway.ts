'use client';

import type { PaymentStartDto } from '@StrikerStore/contract';

/**
 * Taking the customer to the gateway the API chose.
 *
 * Razorpay is a modal over this page, so the customer never leaves checkout and
 * a cancelled payment lands them exactly where they were. PayU is a hosted page:
 * the browser POSTs a signed form there and PayU POSTs the result back to
 * `/api/payments/payu/return`.
 */

type RazorpayStart = Extract<PaymentStartDto, { gateway: 'RAZORPAY' }>;
type PayuStart = Extract<PaymentStartDto, { gateway: 'PAYU' }>;

export type RazorpaySuccess = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayInstance = {
  open(): void;
  on(event: 'payment.failed', handler: (response: { error?: { description?: string } }) => void): void;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

const RAZORPAY_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';
let loading: Promise<void> | null = null;

/**
 * Loads Checkout once, on first use. Not on page load: most visits to checkout
 * end in cash on delivery, and 100KB of somebody else's script is a lot to ask
 * of a phone on a building site for a payment it may never make.
 */
export function loadRazorpay(): Promise<void> {
  if (typeof window !== 'undefined' && window.Razorpay) return Promise.resolve();
  if (loading) return loading;

  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      // Forgotten, so the next tap tries again rather than failing forever.
      loading = null;
      script.remove();
      reject(new Error('Could not load the payment window.'));
    };
    document.body.appendChild(script);
  });
  return loading;
}

export async function openRazorpay(
  start: RazorpayStart,
  handlers: {
    storeName: string;
    onSuccess: (response: RazorpaySuccess) => void;
    onDismiss: () => void;
    onFailed: (reason: string) => void;
  },
): Promise<void> {
  await loadRazorpay();
  if (!window.Razorpay) throw new Error('Could not load the payment window.');

  const checkout = new window.Razorpay({
    key: start.keyId,
    amount: start.amountPaise,
    currency: 'INR',
    order_id: start.gatewayOrderId,
    name: handlers.storeName,
    description: 'Order payment',
    // With a customer id Razorpay offers to save the card (with the customer's
    // consent, as RBI requires) and lists the cards saved last time.
    ...(start.customerId ? { customer_id: start.customerId, remember_customer: true } : {}),
    prefill: {
      ...start.prefill,
      ...(start.method ? { method: start.method } : {}),
    },
    // Absent means Razorpay shows every method it offers — the normal case.
    ...(start.display ? { config: start.display } : {}),
    theme: { color: '#318616' },
    modal: {
      ondismiss: handlers.onDismiss,
      // "Are you sure?" before closing mid-payment — a stray tap outside the
      // modal should not cost somebody their UPI approval.
      confirm_close: true,
    },
    handler: handlers.onSuccess,
  });

  // The modal stays open on a failure so the customer can try again inside it;
  // this only records the attempt.
  checkout.on('payment.failed', (response) => {
    handlers.onFailed(response.error?.description ?? 'Payment failed.');
  });
  checkout.open();
}

/** Builds PayU's signed form and submits it. The page navigates away. */
export function submitToPayu(start: PayuStart): void {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = start.action;
  form.style.display = 'none';
  for (const [name, value] of Object.entries(start.fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}
