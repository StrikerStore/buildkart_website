'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Crosshair, Loader2 } from 'lucide-react';
import type { DeviceLocationDto } from '@StrikerStore/contract';
import { browseWithoutDelivery, confirmLocation } from '@/app/location/actions';
import { NotifyForm } from '@/app/location/notify-form';
import { PlaceSearch } from '@/components/cart/address-sheet';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { cn } from '@/lib/cn';
import type { Locale } from '@/lib/i18n';
import type { MapDefault } from '@/lib/location-shared';

type Stage =
  | { name: 'choice' }
  | { name: 'manual'; note: string | null }
  | { name: 'unserved'; result: DeviceLocationDto };

/**
 * Where to deliver, asked lightly: a small popup over the page the shopper
 * came to see, then at most a search box.
 *
 * Deliberately no map. Most people arriving here are looking around, and the
 * exact spot only matters once there is something to deliver, so the pin and
 * the house details are taken at checkout (`AddressSheet`).
 *
 * The browser's permission prompt fires from the tap on "Use my location",
 * never on load: one that appears before anyone has asked for anything is the
 * one people refuse, and a refusal sticks.
 */
export function LocationPrompt({
  locale,
  signedInPhone,
  provider,
  onClose,
  onSettled,
  dismissible,
}: {
  locale: Locale;
  /** So a signed-in shopper is not asked to type the number again. */
  signedInPhone: string | null;
  provider: MapDefault['provider'];
  onClose: () => void;
  /** Fired once a serviced area is committed, or the shopper chose to browse. */
  onSettled: () => void;
  /** False while the site has no delivery area: the popup is then a gate. */
  dismissible: boolean;
}) {
  const hi = locale === 'hi';
  const router = useRouter();
  const [stage, setStage] = useState<Stage>({ name: 'choice' });
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const busy = locating || pending;

  const couldNotLocate = hi
    ? 'लोकेशन नहीं मिली। अपनी कॉलोनी या इलाक़ा खोजें।'
    : 'Could not get your location. Search for your colony or area.';
  const couldNotFind = hi
    ? 'यह जगह नहीं मिली। पास की कोई और जगह खोजें।'
    : 'Could not find that place. Try another name nearby.';
  const somethingWrong = hi
    ? 'कुछ गड़बड़ हुई। दोबारा कोशिश करें।'
    : 'Something went wrong. Try again.';

  function settle() {
    router.refresh();
    onSettled();
  }

  function commit(latitude: number, longitude: number) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await confirmLocation(latitude, longitude);
        if (result.serviced && result.area) {
          settle();
        } else if (result.resolved) {
          setStage({ name: 'unserved', result });
        } else {
          setStage({ name: 'manual', note: couldNotFind });
        }
      } catch {
        setStage({ name: 'manual', note: somethingWrong });
      }
    });
  }

  function locateMe() {
    setError(null);
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStage({ name: 'manual', note: couldNotLocate });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        commit(position.coords.latitude, position.coords.longitude);
      },
      () => {
        setLocating(false);
        setStage({ name: 'manual', note: couldNotLocate });
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  }

  function browse() {
    setError(null);
    startTransition(async () => {
      try {
        await browseWithoutDelivery();
        settle();
      } catch {
        setError(somethingWrong);
      }
    });
  }

  const title =
    stage.name === 'unserved'
      ? hi
        ? 'यहाँ अभी डिलीवरी नहीं है'
        : 'We do not deliver here yet'
      : hi
        ? 'अपनी लोकेशन चुनें'
        : 'Select your location';

  const back =
    stage.name === 'manual'
      ? () => setStage({ name: 'choice' })
      : stage.name === 'unserved'
        ? () => setStage({ name: 'manual', note: null })
        : undefined;

  return (
    <Sheet
      title={title}
      onClose={onClose}
      onBack={back}
      // A full-height search keeps the box and its results above a phone's keyboard.
      size={stage.name === 'manual' ? 'full' : 'half'}
      placement={stage.name === 'choice' ? 'popup' : 'center'}
      closeLabel={hi ? 'बंद करें' : 'Close'}
      backLabel={hi ? 'वापस' : 'Back'}
      dismissible={dismissible}
    >
      {stage.name === 'choice' && (
        <div className="space-y-4 bg-surface p-4">
          <p className="text-body2 text-ink-muted">
            {hi
              ? 'आपके इलाके में डिलीवरी देखने के लिए लोकेशन चाहिए'
              : 'We need your location to check delivery in your area'}
          </p>
          {/* Side by side in English; the longer Hindi labels need the full width. */}
          <div className={cn('grid gap-3', !hi && 'grid-cols-2')}>
            <Button type="button" variant="buy" size="lg" block disabled={busy} onClick={locateMe}>
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {hi ? 'मेरी लोकेशन इस्तेमाल करें' : 'Use my location'}
            </Button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setStage({ name: 'manual', note: null })}
              className="min-h-12 rounded-box border border-buy bg-surface px-3 text-cta2 text-buy hover:bg-success-bg disabled:opacity-60"
            >
              {hi ? 'खुद चुनें' : 'Select manually'}
            </button>
          </div>
        </div>
      )}

      {stage.name === 'manual' && (
        <div className={cn(busy && 'pointer-events-none opacity-60')} aria-busy={busy}>
          {stage.note && (
            <p role="alert" className="mx-4 mt-4 rounded-box bg-error-bg px-3 py-2 text-body3 text-error">
              {stage.note}
            </p>
          )}
          <PlaceSearch
            hi={hi}
            provider={provider}
            placeholder={hi ? 'अपनी कॉलोनी या इलाक़ा खोजें' : 'Search your colony or area'}
            onCurrentLocation={locateMe}
            onPicked={commit}
            onLookupFailed={() => setStage({ name: 'manual', note: couldNotFind })}
          />
        </div>
      )}

      {stage.name === 'unserved' && (
        <div className="space-y-3 bg-surface p-4">
          {stage.result.formatted && <p className="text-body3 text-ink-muted">{stage.result.formatted}</p>}
          {stage.result.nearby.length > 0 && (
            <p className="text-body4 text-ink-muted">
              {hi ? 'फ़िलहाल हम यहाँ पहुँचते हैं: ' : 'Right now we reach: '}
              {stage.result.nearby
                .slice(0, 3)
                .map((near) => `${near.areaName}, ${near.city}`)
                .join(' · ')}
            </p>
          )}
          <Button
            type="button"
            variant="buy"
            size="lg"
            block
            disabled={busy}
            onClick={() => setStage({ name: 'manual', note: null })}
          >
            <Crosshair className="size-4" aria-hidden />
            {hi ? 'दूसरी लोकेशन आज़माएँ' : 'Try another location'}
          </Button>
          {stage.result.pincode && (
            <NotifyForm pincode={stage.result.pincode} locale={locale} signedInPhone={signedInPhone} />
          )}
          {!dismissible && (
            <button
              type="button"
              disabled={busy}
              onClick={browse}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-box border border-hairline-strong text-cta2 text-ink disabled:opacity-60"
            >
              {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {hi ? 'सामान देखें' : 'Browse products'}
            </button>
          )}
          {error && (
            <p role="alert" className="rounded-box bg-error-bg px-3 py-2 text-body3 text-error">
              {error}
            </p>
          )}
        </div>
      )}
    </Sheet>
  );
}
