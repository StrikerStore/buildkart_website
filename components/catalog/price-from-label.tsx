'use client';

import { useLocationSheet } from '@/components/location/location-provider';
import type { Locale } from '@/lib/i18n';

/**
 * The "from" before a price quoted without the shopper's location — choosing
 * one will move it.
 *
 * Nothing for a visitor outside the delivery area: their price will not move,
 * because no delivered price is quoted for a place we do not deliver to, so
 * "from" would promise a price that never arrives. The price stands alone.
 *
 * A client component only to read the location context, so every card can
 * use it without the page threading the visitor's state through each one.
 */
export function PriceFromLabel({ locale, className }: { locale: Locale; className?: string }) {
  const { outside } = useLocationSheet();
  if (outside) return null;
  return <span className={className}>{locale === 'hi' ? 'से शुरू' : 'from'}</span>;
}
