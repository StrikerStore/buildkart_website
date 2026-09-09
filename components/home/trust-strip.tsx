import { BadgeCheck, Banknote, TrendingUp, Zap } from 'lucide-react';
import type { TrustMarker } from '@buildkart/contract';
import { tr, type Locale, type StringKey } from '@/lib/i18n';

/**
 * The "why BuildKart" strip — PLAN.md §6.1.
 *
 * Every claim on it is derived rather than typed, and that is the point of the
 * component: the hour count is the owner's `promiseHours`, and **the COD tile
 * disappears when the owner switches cash on delivery off**. A hard-coded trust
 * strip is a promise the shop has stopped keeping and nobody remembered to
 * delete.
 *
 * Which markers appear, and where the strip sits on the page, are now the
 * owner's — it is a homepage section like any other. What each marker *says*
 * still is not: `resolveSection` reconciles the list against settings before it
 * reaches here, so this file renders what it is given and decides nothing.
 */
const MARKERS: Record<TrustMarker, { icon: typeof Zap; key: StringKey }> = {
  fast: { icon: Zap, key: 'trust.fastDelivery' },
  cod: { icon: Banknote, key: 'trust.cod' },
  genuine: { icon: BadgeCheck, key: 'trust.genuine' },
  rates: { icon: TrendingUp, key: 'trust.dailyRates' },
};

export function TrustStrip({
  markers,
  promiseHours,
  locale,
}: {
  markers: TrustMarker[];
  promiseHours: number;
  locale: Locale;
}) {
  if (markers.length === 0) return null;

  return (
    <div className="border-y border-hairline bg-brand-tint">
      <ul className="page-w page-x flex items-stretch justify-between gap-2 py-3">
        {markers.map((marker) => {
          const { icon: Icon, key } = MARKERS[marker];
          return (
            <li key={marker} className="flex flex-1 flex-col items-center gap-1 text-center">
              <Icon className="size-5 text-brand-text" aria-hidden />
              <span className="text-body5 text-ink">{tr(locale, key, { hours: promiseHours })}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
