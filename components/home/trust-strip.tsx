import { BadgeCheck, Banknote, TrendingUp, Zap } from 'lucide-react';
import type { TrustMarker } from '@StrikerStore/contract';
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
    /*
     * A step stronger than the page's own tint: on the warm page `bg-brand-tint`
     * alone all but disappeared, so the ground is a heavier wash of the brand
     * with brand-coloured rules, and each icon sits on a white disc.
     */
    <div className="border-y border-brand/40 bg-brand/15">
      <ul className="page-w page-x flex items-stretch justify-between gap-2 py-3.5 sm:py-4">
        {markers.map((marker) => {
          const { icon: Icon, key } = MARKERS[marker];
          return (
            <li
              key={marker}
              className="flex flex-1 flex-col items-center gap-1.5 text-center sm:flex-row sm:justify-center sm:gap-2.5 sm:text-left"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-pill bg-surface shadow-raised sm:size-10">
                <Icon className="size-5 text-brand-text" strokeWidth={2.25} aria-hidden />
              </span>
              <span className="text-body4 font-semibold text-ink sm:text-body2">
                {tr(locale, key, { hours: promiseHours })}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
