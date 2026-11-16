'use client';

import { useLocationSheet } from '@/components/location/location-provider';
import type { Locale } from '@/lib/i18n';

/**
 * The word before a price that was quoted at the warehouse rather than for
 * the shopper's spot.
 *
 * "from" while no location is set — choosing one will move it. "Warehouse
 * rate" for a visitor outside the delivery area: for them it will not move,
 * because no delivered price is quoted for a place we do not deliver to, and
 * "from" would promise a price that never arrives.
 *
 * A client component only to read the location context, so every card can
 * use it without the page threading the visitor's state through each one.
 */
export function PriceFromLabel({ locale, className }: { locale: Locale; className?: string }) {
  const { outside } = useLocationSheet();
  const hi = locale === 'hi';
  return (
    <span className={className}>
      {outside ? (hi ? 'गोदाम भाव' : 'Warehouse rate') : hi ? 'से शुरू' : 'from'}
    </span>
  );
}
