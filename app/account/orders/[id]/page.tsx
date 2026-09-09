import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { CheckCircle2, FileText, MessageSquare, Navigation, Phone } from 'lucide-react';
import { formatINR } from '@StrikerStore/contract';
import { api, storeSettings } from '@/lib/api/server';
import { currentLocale } from '@/lib/locale';
import { currentCustomer } from '@/lib/session';
import { buttonClass } from '@/components/ui/button';
import { OrderTimeline } from '@/components/orders/order-status';
import { ReorderButton } from '@/components/orders/reorder-button';

export const metadata: Metadata = {
  title: 'Order',
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ placed?: string }>;
};

/**
 * One order.
 *
 * Doubles as the confirmation screen: checkout redirects here with `?placed=1`,
 * which adds a banner and nothing else. One page rather than two means the link
 * a customer keeps from the confirmation is the same one that later tells them
 * where the lorry is.
 */
export default async function OrderPage({ params, searchParams }: Props) {
  const [{ id }, search, locale, customer] = await Promise.all([
    params,
    searchParams,
    currentLocale(),
    currentCustomer(),
  ]);

  if (!customer) redirect(`/login?next=${encodeURIComponent(`/account/orders/${id}`)}`);

  const [order, settings] = await Promise.all([
    (await api()).storefront.myOrder.query({ id }),
    storeSettings(),
  ]);

  // Null covers both "no such order" and "not yours" — the customer learns
  // nothing about which.
  if (!order) notFound();

  const hi = locale === 'hi';
  const justPlaced = search.placed === '1';

  return (
    <div className="page-w page-x py-6">
      <div className="mx-auto max-w-2xl">
        {justPlaced && (
          <div className="mb-5 rounded-card border border-success/20 bg-success-bg p-4">
            <p className="flex items-center gap-2 text-heading4 text-success">
              <CheckCircle2 className="size-5" aria-hidden />
              {hi ? 'ऑर्डर हो गया!' : 'Order placed'}
            </p>
            <p className="mt-1 text-body2 text-ink">
              {hi
                ? `हम ${order.address.phone} पर कॉल करके कन्फ़र्म करेंगे।`
                : `We will call you on ${order.address.phone} to confirm.`}
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-heading2 text-ink">{order.orderNumber}</h1>
            <p className="mt-0.5 text-body3 text-ink-muted">
              {new Date(order.placedAt).toLocaleString(hi ? 'hi-IN' : 'en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/*
              * The invoice appears only once the goods have actually arrived.
              *
              * `deliveredAt` rather than the status word, because that is the
              * column the invoice prints as its date of supply — an order
              * marked delivered without one has no date to issue against. The
              * same test guards `getMyInvoice`, so hiding the link is a
              * courtesy and not the control.
              */}
            {order.deliveredAt && (
              <Link
                href={`/account/orders/${order.id}/invoice`}
                className={buttonClass({ variant: 'quiet', size: 'md' })}
              >
                <FileText className="size-4" aria-hidden />
                {hi ? 'बिल' : 'Invoice'}
              </Link>
            )}
            <ReorderButton orderId={order.id} locale={locale} />
          </div>
        </div>

        <div className="mt-5">
          <OrderTimeline status={order.status} timeline={order.timeline} locale={locale} />
        </div>

        <section className="mt-5 rounded-card border border-hairline bg-surface">
          <h2 className="border-b border-hairline px-4 py-3 text-heading5 text-ink">
            {hi ? 'सामान' : 'Items'}
          </h2>
          <ul className="divide-y divide-hairline">
            {order.items.map((item) => {
              const name = (hi && item.nameHi) || item.nameEn;
              const unit = (hi && item.unitLabelHi) || item.unitLabelEn;
              return (
                <li key={item.id} className="flex gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    {/* Linked while the product still exists; the frozen name
                        renders either way. */}
                    {item.handle ? (
                      <Link href={`/products/${item.handle}`} className="text-heading7 text-ink">
                        {name}
                      </Link>
                    ) : (
                      <span className="text-heading7 text-ink">{name}</span>
                    )}
                    {item.variantLabel && (
                      <p className="text-body4 text-ink-muted">{item.variantLabel}</p>
                    )}
                    <p className="text-body4 text-ink-muted">
                      {formatINR(item.unitPrice)}
                      {unit ? ` ${unit}` : ''} × {item.quantity}
                    </p>
                  </div>
                  <span className="shrink-0 text-heading6 text-ink">
                    {formatINR(item.lineTotal)}
                  </span>
                </li>
              );
            })}
          </ul>

          <dl className="space-y-1.5 border-t border-hairline px-4 py-3 text-body3">
            <Row label={hi ? 'सामान' : 'Subtotal'} value={formatINR(order.subtotal)} />
            {order.discountTotal !== '0.00' && (
              <Row
                label={`${hi ? 'छूट' : 'Discount'}${order.discountCode ? ` ${order.discountCode}` : ''}`}
                value={`− ${formatINR(order.discountTotal)}`}
                tone="success"
              />
            )}
            <Row
              label={hi ? 'डिलीवरी' : 'Delivery'}
              value={
                order.deliveryCharge === '0.00'
                  ? hi
                    ? 'मुफ़्त'
                    : 'Free'
                  : formatINR(order.deliveryCharge)
              }
            />
            <div className="flex justify-between border-t border-hairline pt-2">
              <dt className="text-heading5 text-ink">{hi ? 'कुल' : 'Total'}</dt>
              <dd className="text-heading4 text-ink">{formatINR(order.grandTotal)}</dd>
            </div>
            <Row
              label={hi ? 'पेमेंट' : 'Payment'}
              value={
                order.paymentStatus === 'PAID'
                  ? `${order.paymentMethod} · ${hi ? 'चुकाया' : 'paid'}`
                  : `${order.paymentMethod} · ${hi ? 'बाकी' : 'due'}`
              }
            />
          </dl>
        </section>

        <section className="mt-5 rounded-card border border-hairline bg-surface p-4">
          <h2 className="text-heading5 text-ink">{hi ? 'डिलीवरी का पता' : 'Delivery address'}</h2>
          <address className="mt-2 not-italic text-body2 text-ink-muted">
            {order.address.name && <span className="block text-ink">{order.address.name}</span>}
            <span className="block">{order.address.line1}</span>
            {order.address.line2 && <span className="block">{order.address.line2}</span>}
            {order.address.landmark && <span className="block">{order.address.landmark}</span>}
            <span className="block">
              {order.address.city}, {order.address.state} {order.address.pincode}
            </span>
            <span className="block">{order.address.phone}</span>
          </address>

          {/*
            * The exact spot this order was sent to.
            *
            * Frozen with the address, so it is where the rider was pointed on
            * the day — not wherever that saved address's pin has been moved to
            * since. The link opens the coordinate in whatever maps app the
            * phone has, which is what makes it useful to a customer checking
            * we have the right plot, and to anyone they hand the order to.
            */}
          {order.address.latitude != null && order.address.longitude != null && (
            <div className="mt-3 rounded-box bg-surface-muted p-3">
              <p className="text-body4 text-ink-muted">
                {hi ? 'सटीक लोकेशन' : 'Exact location'}
              </p>
              <p className="mt-0.5 font-mono text-body3 tabular-nums text-ink">
                {order.address.latitude}, {order.address.longitude}
              </p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${order.address.latitude},${order.address.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-cta3 text-brand-text hover:underline"
              >
                <Navigation className="size-3.5" aria-hidden />
                {hi ? 'नक़्शे पर देखें' : 'Open in maps'}
              </a>
            </div>
          )}

          {order.customerNote && (
            <p className="mt-3 rounded-box bg-surface-muted p-3 text-body3 text-ink">
              {hi ? 'आपका नोट: ' : 'Your note: '}
              {order.customerNote}
            </p>
          )}
        </section>

        {/*
         * Two ways to ask, in the order this audience actually uses them.
         *
         * Chat is first because it carries the order with it — the shop opens
         * the message already looking at this order's status and items, so
         * "where is it" is answered without the customer reading out a number.
         * The phone stays underneath for the person who will always rather ring.
         */}
        <div className="mt-5 flex flex-col gap-2">
          <Link
            href={`/support/new?orderId=${encodeURIComponent(order.id)}`}
            className="flex items-center justify-center gap-2 rounded-card border border-hairline bg-surface px-4 py-3 text-cta2 text-ink hover:bg-surface-muted"
          >
            <MessageSquare className="size-4" aria-hidden />
            {hi ? 'इस ऑर्डर में मदद चाहिए' : 'Get help with this order'}
          </Link>

          {settings.store.supportPhone && (
            <a
              href={`tel:${settings.store.supportPhone}`}
              className="flex items-center justify-center gap-2 rounded-card border border-hairline bg-surface px-4 py-3 text-cta2 text-ink hover:bg-surface-muted"
            >
              <Phone className="size-4" aria-hidden />
              {hi ? 'इस ऑर्डर के बारे में कॉल करें' : 'Call us about this order'}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'success' }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-muted">{label}</dt>
      <dd className={tone === 'success' ? 'text-success' : 'text-ink'}>{value}</dd>
    </div>
  );
}
