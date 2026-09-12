import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { formatINR, type CartDto } from '@StrikerStore/contract';
import { buttonClass } from '@/components/ui/button';
import type { Locale } from '@/lib/i18n';

/**
 * The totals block.
 *
 * Every line here is a figure the server computed; nothing is added up in the
 * browser. That is not a style preference — it is what stops the summary and
 * the order disagreeing when a rate changes between the two.
 *
 * The GST line appears **only when tax is added to the prices**.
 *
 * When a product's rate already includes GST, the subtotal above is the price
 * the customer pays and the tax inside it changes nothing about the total. A
 * line reading "GST ₹19.52 (included)" then invites the only question it cannot
 * answer — "so am I paying this or not?" — and every figure in this block is
 * supposed to be one the customer can add up. The tax is still on the invoice,
 * where it is a legal requirement and where the buyer is looking for it.
 *
 * `taxAddedTotal` rather than the cart's `taxInclusive` flag, because a cart
 * can hold both kinds at once: it is precisely the tax that moves the total, so
 * it is right for a mixed basket as well as a simple one.
 */
export function CartSummary({
  cart,
  locale,
  showCheckout = true,
}: {
  cart: CartDto;
  locale: Locale;
  showCheckout?: boolean;
}) {
  const blocked = !cart.meetsMinimum || cart.delivery?.serviced === false;

  return (
    <div className="rounded-card border border-hairline bg-surface p-4">
      <h2 className="text-heading5 text-ink">
        {locale === 'hi' ? 'बिल का ब्यौरा' : 'Bill details'}
      </h2>

      <dl className="mt-3 space-y-2 text-body2">
        <Row label={locale === 'hi' ? 'सामान' : 'Subtotal'} value={formatINR(cart.subtotal)} />

        {cart.discountTotal !== '0.00' && (
          <Row
            label={
              locale === 'hi'
                ? `छूट ${cart.discount?.code ?? ''}`
                : `Discount ${cart.discount?.code ?? ''}`
            }
            value={`− ${formatINR(cart.discountTotal)}`}
            tone="success"
          />
        )}

        <Row
          label={locale === 'hi' ? 'डिलीवरी' : 'Delivery'}
          value={
            cart.deliveryCharge === '0.00'
              ? locale === 'hi'
                ? 'मुफ़्त'
                : 'Free'
              : formatINR(cart.deliveryCharge)
          }
          tone={cart.deliveryCharge === '0.00' ? 'success' : undefined}
        />

        {cart.taxAddedTotal !== '0.00' && (
          <Row
            label={locale === 'hi' ? 'जीएसटी' : 'GST'}
            value={formatINR(cart.taxAddedTotal)}
            muted
          />
        )}

        <div className="flex items-baseline justify-between border-t border-hairline pt-2">
          <dt className="text-heading5 text-ink">{locale === 'hi' ? 'कुल' : 'To pay'}</dt>
          <dd className="text-heading3 text-ink">{formatINR(cart.grandTotal)}</dd>
        </div>
      </dl>

      {/*
        * What the bulk ladders took off, separate from the MRP saving above it.
        * They are different claims — one is a discount off the list price the
        * shop advertises, the other is off the manufacturer's MRP — and adding
        * them together would overstate both.
        */}
      {cart.bulkSavings !== '0.00' && (
        <p className="mt-3 rounded-box bg-success-bg px-3 py-2 text-center text-heading7 text-success">
          {locale === 'hi'
            ? `बल्क भाव से ${formatINR(cart.bulkSavings)} की बचत`
            : `Bulk rates saved you ${formatINR(cart.bulkSavings)}`}
        </p>
      )}

      {cart.savings !== '0.00' && (
        <p className="mt-3 rounded-box bg-success-bg px-3 py-2 text-center text-heading7 text-success">
          {locale === 'hi'
            ? `इस ऑर्डर पर ${formatINR(cart.savings)} की बचत`
            : `You save ${formatINR(cart.savings)} on this order`}
        </p>
      )}

      {/* --- what would stop checkout, said before the button ------------- */}
      {!cart.meetsMinimum && (
        <p className="mt-3 text-body3 text-warning">
          {locale === 'hi'
            ? `कम से कम ${formatINR(cart.minimumOrderValue)} का ऑर्डर ज़रूरी है।`
            : `Orders start at ${formatINR(cart.minimumOrderValue)}.`}
        </p>
      )}

      {cart.delivery === null && (
        <p className="mt-3 flex items-center gap-1.5 text-body3 text-ink-muted">
          <MapPin className="size-4 shrink-0" aria-hidden />
          <Link href="/location" className="underline">
            {locale === 'hi'
              ? 'डिलीवरी शुल्क देखने के लिए इलाका चुनें'
              : 'Set your area to see delivery charges'}
          </Link>
        </p>
      )}

      {cart.delivery?.serviced === false && (
        <p className="mt-3 text-body3 text-error">
          {locale === 'hi'
            ? `हम ${cart.delivery.pincode} पर डिलीवरी नहीं करते।`
            : `We do not deliver to ${cart.delivery.pincode} yet.`}{' '}
          <Link href="/location" className="underline">
            {locale === 'hi' ? 'बदलें' : 'Change area'}
          </Link>
        </p>
      )}

      {showCheckout && (
        <>
          {blocked ? (
            <span
              aria-disabled="true"
              className={buttonClass({
                variant: 'brand',
                size: 'lg',
                block: true,
                className: 'mt-4 pointer-events-none opacity-50',
              })}
            >
              {locale === 'hi' ? 'आगे बढ़ें' : 'Proceed to checkout'}
            </span>
          ) : (
            <Link
              href="/checkout"
              className={buttonClass({
                variant: 'brand',
                size: 'lg',
                block: true,
                className: 'mt-4',
              })}
            >
              {locale === 'hi' ? 'आगे बढ़ें' : 'Proceed to checkout'}
            </Link>
          )}
        </>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  tone,
  muted,
}: {
  label: string;
  value: string;
  tone?: 'success';
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={muted ? 'text-ink-muted' : 'text-ink'}>{label}</dt>
      <dd
        className={
          tone === 'success' ? 'text-success' : muted ? 'text-ink-muted' : 'text-ink'
        }
      >
        {value}
      </dd>
    </div>
  );
}
