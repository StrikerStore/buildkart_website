import { MapPinOff } from 'lucide-react';
import type { Locale } from '@/lib/i18n';
import { outsideLabel, type OutsideSpot } from '@/lib/location-shared';
import { OpenLocationButton } from './open-location-button';

/**
 * "We don't deliver here yet" — a slim strip under the header on every page,
 * for a visitor looking around from outside the delivery area.
 *
 * Said up front and kept said, so nobody browses for ten minutes believing a
 * cart is on its way.
 *
 * One line on a phone: the place, and "Change".
 */
export function OutsideBar({ spot, locale }: { spot: OutsideSpot; locale: Locale }) {
  const hi = locale === 'hi';
  const place = outsideLabel(spot);

  return (
    <div role="status" className="border-b border-warning/30 bg-warning-bg">
      <div className="page-w page-x flex min-h-10 items-center gap-2 py-1.5">
        <MapPinOff className="size-4 shrink-0 text-warning" aria-hidden />
        <p className="min-w-0 flex-1 text-body4 text-ink">
          <span className="text-heading7">
            {place
              ? hi
                ? `${place} में अभी डिलीवरी नहीं है।`
                : `We don't deliver to ${place} yet.`
              : hi
                ? 'यहाँ अभी डिलीवरी नहीं है।'
                : 'We do not deliver here yet.'}
          </span>
        </p>
        <OpenLocationButton className="shrink-0 rounded-box px-2 py-1 text-cta3 text-brand-text underline underline-offset-2 hover:bg-surface/60">
          {hi ? 'बदलें' : 'Change'}
        </OpenLocationButton>
      </div>
    </div>
  );
}
