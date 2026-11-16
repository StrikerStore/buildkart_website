'use client';

import { Crosshair, MapPinOff } from 'lucide-react';
import type { ServedArea } from '@/app/location/actions';
import { NotifyForm } from '@/app/location/notify-form';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import type { Locale } from '@/lib/i18n';
import { outsideLabel, type OutsideSpot } from '@/lib/location-shared';

/**
 * "We don't deliver here yet" — for a visitor looking around from outside the
 * delivery area.
 *
 * What ADD and the header pill open for them. Says where we do not deliver,
 * where we do, and takes a number for the day we start there; then lets them
 * get back to looking. Never a dead end: changing the location is the first
 * button, because the most common reason to land here is a pin dropped in the
 * wrong place.
 */
export function OutsideNotice({
  locale,
  spot,
  servedAreas,
  signedInPhone,
  onChange,
  onClose,
}: {
  locale: Locale;
  spot: OutsideSpot;
  servedAreas: ServedArea[];
  signedInPhone: string | null;
  /** Swaps this notice for the location picker. */
  onChange: () => void;
  onClose: () => void;
}) {
  const hi = locale === 'hi';
  const place = outsideLabel(spot);

  return (
    <Sheet
      title={
        place
          ? hi
            ? `${place} में अभी डिलीवरी नहीं है`
            : `We don't deliver to ${place} yet`
          : hi
            ? 'यहाँ अभी डिलीवरी नहीं है'
            : 'We do not deliver here yet'
      }
      onClose={onClose}
      closeLabel={hi ? 'बंद करें' : 'Close'}
    >
      <div className="space-y-3 bg-surface p-4">
        <div className="flex items-start gap-3">
          <MapPinOff className="mt-0.5 size-5 shrink-0 text-error" aria-hidden />
          <div className="min-w-0 space-y-1">
            {spot.formatted && <p className="text-body3 text-ink-muted">{spot.formatted}</p>}
            <p className="text-body3 text-ink">
              {spot.pincode === null
                ? hi
                  ? 'अभी हम भारत के कुछ ही इलाक़ों में डिलीवरी करते हैं। सामान और भाव आप देख सकते हैं, ऑर्डर नहीं।'
                  : 'We deliver only in parts of India for now. You can look around and see our rates, but not order.'
                : hi
                  ? 'सामान और गोदाम भाव आप देख सकते हैं, पर यहाँ ऑर्डर नहीं हो सकता।'
                  : 'You can look around and see our warehouse rates, but orders cannot be delivered here.'}
            </p>
          </div>
        </div>

        {servedAreas.length > 0 && (
          <p className="text-body4 text-ink-muted">
            {hi ? 'फ़िलहाल हम यहाँ पहुँचते हैं: ' : 'Right now we reach: '}
            {servedAreas.map((area) => `${area.areaName}, ${area.city}`).join(' · ')}
          </p>
        )}

        <Button type="button" variant="buy" size="lg" block onClick={onChange}>
          <Crosshair className="size-4" aria-hidden />
          {hi ? 'लोकेशन बदलें' : 'Change location'}
        </Button>

        {spot.pincode && (
          <NotifyForm pincode={spot.pincode} locale={locale} signedInPhone={signedInPhone} />
        )}

        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-full items-center justify-center rounded-box border border-hairline-strong text-cta2 text-ink hover:bg-surface-muted"
        >
          {hi ? 'सामान देखते रहें' : 'Keep exploring'}
        </button>
      </div>
    </Sheet>
  );
}
