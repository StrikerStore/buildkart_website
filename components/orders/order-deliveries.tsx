import { CheckCircle2, Clock, Truck } from 'lucide-react';
import { STORE_TIME_ZONE, type MyOrderDetailDto } from '@StrikerStore/contract';
import { cn } from '@/lib/cn';
import type { Locale } from '@/lib/i18n';

function when(iso: string, hi: boolean): string {
  return new Date(iso).toLocaleString(hi ? 'hi-IN' : 'en-IN', {
    timeZone: STORE_TIME_ZONE,
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * An order sent in loads, as the customer sees it: what has arrived, what is on
 * the way, and what is still to come.
 *
 * Shown only once the order actually goes in more than one load — an order that
 * arrives in one is told by the timeline above, and a list of one delivery
 * would only repeat it.
 */
export function OrderDeliveries({
  order,
  locale,
}: {
  order: Pick<MyOrderDetailDto, 'shipments' | 'stillToCome' | 'status'>;
  locale: Locale;
}) {
  const hi = locale === 'hi';
  const split =
    order.shipments.length > 1 ||
    order.status === 'PARTIALLY_DELIVERED' ||
    order.stillToCome.length > 0;
  if (!split) return null;

  return (
    <section className="rounded-card border border-hairline bg-surface">
      <h2 className="border-b border-hairline px-4 py-3 text-heading5 text-ink">
        {hi ? 'डिलीवरी' : 'Deliveries'}
      </h2>

      <ul className="divide-y divide-hairline">
        {order.shipments.map((shipment) => {
          const delivered = shipment.status === 'DELIVERED';
          return (
            <li key={shipment.number} className="px-4 py-3">
              <p className="flex items-center gap-2 text-heading7 text-ink">
                {delivered ? (
                  <CheckCircle2 className="size-4 text-success" aria-hidden />
                ) : (
                  <Truck className="size-4 text-brand-text" aria-hidden />
                )}
                {hi ? `डिलीवरी ${shipment.number}` : `Delivery ${shipment.number}`}
                <span className={cn('text-body4', delivered ? 'text-success' : 'text-ink-muted')}>
                  {delivered
                    ? shipment.deliveredAt
                      ? hi
                        ? `· ${when(shipment.deliveredAt, hi)} को पहुँची`
                        : `· delivered ${when(shipment.deliveredAt, hi)}`
                      : ''
                    : shipment.expectedDeliveryAt
                      ? hi
                        ? `· रास्ते में, ${when(shipment.expectedDeliveryAt, hi)} तक`
                        : `· on the way, by ${when(shipment.expectedDeliveryAt, hi)}`
                      : hi
                        ? '· रास्ते में'
                        : '· on the way'}
                </span>
              </p>
              <ul className="mt-1.5 space-y-0.5 text-body4 text-ink-muted">
                {shipment.items.map((item, index) => {
                  const name = (hi && item.nameHi) || item.nameEn;
                  const unit = (hi && item.unitLabelHi) || item.unitLabelEn;
                  const short =
                    item.receivedQuantity !== null && item.receivedQuantity < item.quantity;
                  return (
                    <li key={index} className="flex justify-between gap-3">
                      <span className="min-w-0 truncate">{name}</span>
                      <span className="shrink-0">
                        {short
                          ? hi
                            ? `${item.quantity} में से ${item.receivedQuantity} मिले`
                            : `${item.receivedQuantity} of ${item.quantity} arrived`
                          : `${unit ? `${unit} ` : ''}× ${item.quantity}`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}

        {order.stillToCome.length > 0 && (
          <li className="px-4 py-3">
            <p className="flex items-center gap-2 text-heading7 text-ink">
              <Clock className="size-4 text-ink-muted" aria-hidden />
              {hi ? 'अभी आना बाकी' : 'Still to come'}
            </p>
            <ul className="mt-1.5 space-y-0.5 text-body4 text-ink-muted">
              {order.stillToCome.map((item, index) => {
                const name = (hi && item.nameHi) || item.nameEn;
                const unit = (hi && item.unitLabelHi) || item.unitLabelEn;
                return (
                  <li key={index} className="flex justify-between gap-3">
                    <span className="min-w-0 truncate">{name}</span>
                    <span className="shrink-0">
                      {unit ? `${unit} ` : ''}× {item.quantity}
                    </span>
                  </li>
                );
              })}
            </ul>
          </li>
        )}
      </ul>
    </section>
  );
}
