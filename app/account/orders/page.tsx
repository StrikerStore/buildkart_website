import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { formatINR } from '@StrikerStore/contract';
import { api } from '@/lib/api/server';
import { currentLocale } from '@/lib/locale';
import { currentCustomer } from '@/lib/session';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusPill } from '@/components/orders/order-status';

export const metadata: Metadata = {
  title: 'My orders',
  robots: { index: false, follow: false },
};

/**
 * Every order this customer has placed.
 *
 * The list is filtered by the session on the server — there is no customer id
 * in the URL to change, which is what makes another person's orders
 * unreachable rather than merely unlinked.
 */
export default async function OrdersPage() {
  const [locale, customer] = await Promise.all([currentLocale(), currentCustomer()]);
  if (!customer) redirect('/login?next=%2Faccount%2Forders');

  const orders = await (await api()).storefront.myOrders.query();
  const hi = locale === 'hi';

  return (
    <div className="page-w page-x py-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-heading2 text-ink">{hi ? 'मेरे ऑर्डर' : 'My orders'}</h1>

        {orders.length === 0 ? (
          <div className="mt-5">
            <EmptyState
              title={hi ? 'अभी कोई ऑर्डर नहीं' : 'No orders yet'}
              body={
                hi
                  ? 'आपका पहला ऑर्डर यहाँ दिखेगा।'
                  : 'Your orders will appear here once you place one.'
              }
              actionHref="/"
              actionLabel={hi ? 'सामान देखें' : 'Start shopping'}
            />
          </div>
        ) : (
          <ul className="mt-5 space-y-3">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/account/orders/${order.id}`}
                  className="flex items-center gap-3 rounded-card border border-hairline bg-surface p-4 hover:shadow-raised"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-heading6 text-ink">{order.orderNumber}</span>
                      <StatusPill status={order.status} locale={locale} />
                    </div>

                    <p className="mt-1 clamp-1 text-body3 text-ink-muted">
                      {order.preview
                        .map((item) => `${(hi && item.nameHi) || item.nameEn} × ${item.quantity}`)
                        .join(', ')}
                      {order.itemCount >
                        order.preview.reduce((sum, item) => sum + item.quantity, 0) && ' …'}
                    </p>

                    <p className="mt-1 text-body4 text-ink-faint">
                      {new Date(order.placedAt).toLocaleDateString(hi ? 'hi-IN' : 'en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                      {' · '}
                      {formatINR(order.grandTotal)}
                    </p>
                  </div>

                  <ChevronRight className="size-5 shrink-0 text-ink-faint" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
