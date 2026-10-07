'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { Crosshair, Loader2, MapPin, Search } from 'lucide-react';
import type { DeviceLocationDto } from '@StrikerStore/contract';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import type { Locale } from '@/lib/i18n';
import type { MapDefault } from '@/lib/location-shared';
import { resolveDeviceLocation } from '@/app/location/actions';
import { NotifyForm } from '@/app/location/notify-form';

function MapLoading() {
  return (
    <div className="grid size-full place-items-center bg-surface-muted">
      <Loader2 className="size-6 animate-spin text-ink-faint" aria-hidden />
    </div>
  );
}

// `ssr: false` is only honoured inside a Client Component — hence this file.
const LeafletMap = dynamic(() => import('@/components/location/leaflet-map'), {
  ssr: false,
  loading: MapLoading,
});
const GoogleMap = dynamic(() => import('@/components/location/google-map'), {
  ssr: false,
  loading: MapLoading,
});

/** Close enough to read house numbers. */
const PIN_ZOOM = 17;

export type PinChoice = { latitude: number; longitude: number; resolved: DeviceLocationDto };

/**
 * The full-height "where exactly?" map of the add-address flow.
 *
 * The map moves under a fixed centre pin and re-resolves wherever it settles.
 * Until the customer has said where to start — their current location, a
 * search result, or a drag — the card offers exactly those two ways in; after,
 * it names the spot and offers to continue.
 */
export function PinMap({
  locale,
  notifyPhone,
  map,
  start,
  /** A spot to open on, already chosen (a search pick, or "edit" from the details). */
  chosen,
  locateOnOpen = false,
  onSearch,
  onConfirm,
}: {
  locale: Locale;
  /** The signed-in number for "tell me when you deliver here"; null asks for one. */
  notifyPhone: string | null;
  map: Pick<MapDefault, 'provider' | 'browserKey'>;
  start: { lat: number; lng: number; zoom: number };
  chosen: { lat: number; lng: number } | null;
  locateOnOpen?: boolean;
  onSearch: () => void;
  onConfirm: (pin: PinChoice) => void;
}) {
  const hi = locale === 'hi';
  const [centre, setCentre] = useState(chosen ?? { lat: start.lat, lng: start.lng });
  const [zoom, setZoom] = useState(chosen ? PIN_ZOOM : start.zoom);
  const [recentreToken, setRecentreToken] = useState(0);
  const [picked, setPicked] = useState(chosen !== null);
  const [resolved, setResolved] = useState<DeviceLocationDto | null>(null);
  const [resolving, startResolving] = useTransition();
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  const [googleFailed, setGoogleFailed] = useState(false);
  const googleTiles = map.provider === 'GOOGLE' && map.browserKey !== '' && !googleFailed;

  // A slow answer must not overwrite a newer one after two quick drags.
  const latest = useRef(0);
  const resolveAt = useCallback((lat: number, lng: number) => {
    const ticket = ++latest.current;
    startResolving(async () => {
      const answer = await resolveDeviceLocation(lat, lng);
      if (ticket === latest.current) setResolved(answer);
    });
  }, []);

  const locate = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocateError(hi ? 'यह डिवाइस लोकेशन नहीं बता सकता।' : 'This device cannot share its location.');
      return;
    }
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = { lat: position.coords.latitude, lng: position.coords.longitude };
        setCentre(next);
        setZoom(PIN_ZOOM);
        setRecentreToken((token) => token + 1);
        setPicked(true);
        resolveAt(next.lat, next.lng);
        setLocating(false);
      },
      () => {
        setLocating(false);
        setLocateError(
          hi
            ? 'लोकेशन नहीं मिली। अनुमति दें, या खोजें या नक़्शा खिसकाएँ।'
            : 'Could not get your location. Allow it, or search, or drag the map.',
        );
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  }, [hi, resolveAt]);

  useEffect(() => {
    if (chosen) resolveAt(chosen.lat, chosen.lng);
    else if (locateOnOpen) locate();
    // Mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function moved(next: { lat: number; lng: number }) {
    setCentre(next);
    setPicked(true);
    resolveAt(next.lat, next.lng);
  }

  const serviced = resolved?.serviced === true;
  const title =
    resolved?.areaName ?? resolved?.formatted?.split(',')[0] ?? (hi ? 'चुनी गई जगह' : 'Selected spot');

  return (
    <div className="flex h-full flex-col">
      <button
        type="button"
        onClick={onSearch}
        className="m-3 flex h-11 shrink-0 items-center gap-2 rounded-box border border-hairline-strong bg-surface px-3 text-left text-body2 text-ink-faint"
      >
        <Search className="size-4" aria-hidden />
        {hi ? 'नया पता खोजें' : 'Search a new address'}
      </button>

      <div className="relative min-h-0 flex-1">
        {googleTiles ? (
          <GoogleMap
            centre={centre}
            zoom={zoom}
            onMoved={moved}
            recentreToken={recentreToken}
            apiKey={map.browserKey}
            language={hi ? 'hi' : 'en'}
            onFailed={() => setGoogleFailed(true)}
          />
        ) : (
          <LeafletMap centre={centre} zoom={zoom} onMoved={moved} recentreToken={recentreToken} />
        )}

        {/* The pin, fixed dead centre with its point on the centre pixel. */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-[400] flex -translate-x-1/2 -translate-y-full flex-col items-center">
          <div className="mb-1 rounded-box bg-ink px-3 py-1.5 text-center shadow-raised">
            <p className="text-heading7 text-ink-inverted">
              {hi ? 'ऑर्डर यहाँ डिलीवर होगा' : 'Order will be delivered here'}
            </p>
            <p className="text-body6 text-ink-inverted/80">
              {hi ? 'पिन को सही जगह पर रखें' : 'Place the pin to your exact location'}
            </p>
          </div>
          <MapPin
            className={cn('size-9 drop-shadow-md', serviced ? 'text-success' : 'text-error')}
            fill="currentColor"
            strokeWidth={1.5}
            aria-hidden
          />
        </div>
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-[399] size-2 -translate-x-1/2 rounded-pill bg-ink/25" />

        {picked && (
          <button
            type="button"
            onClick={locate}
            disabled={locating}
            aria-label={hi ? 'मेरी लोकेशन' : 'Go to my location'}
            className="absolute bottom-3 right-3 z-[400] grid size-11 place-items-center rounded-pill bg-surface text-brand-text shadow-raised hover:bg-surface-muted disabled:opacity-60"
          >
            {locating ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Crosshair className="size-5" aria-hidden />}
          </button>
        )}
      </div>

      {/* --- the card under the map -------------------------------------- */}
      <div className="shrink-0 rounded-t-card bg-surface p-4 shadow-sheet">
        {!picked ? (
          <>
            <p className="text-center text-heading5 text-ink">
              {hi ? 'डिलीवरी की जगह चुनें' : 'Select a delivery location'}
            </p>
            {locateError && <p className="mt-2 text-center text-body4 text-error">{locateError}</p>}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button type="button" variant="quiet" onClick={onSearch}>
                {hi ? 'जगह खोजें' : 'Search Location'}
              </Button>
              <Button type="button" onClick={locate} disabled={locating}>
                {locating && <Loader2 className="size-4 animate-spin" aria-hidden />}
                {hi ? 'मौजूदा लोकेशन' : 'Current Location'}
              </Button>
            </div>
          </>
        ) : (
          <>
            {resolving && !resolved ? (
              <p className="flex items-center gap-2 text-body2 text-ink-muted">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {hi ? 'देख रहे हैं…' : 'Finding this spot…'}
              </p>
            ) : resolved ? (
              <div className={cn(resolving && 'opacity-60')}>
                <p className="text-heading5 text-ink">{title}</p>
                <p className="mt-0.5 text-body3 text-ink-muted">
                  {resolved.formatted ?? (hi ? 'यह जगह पहचान नहीं पाए' : 'We could not name this spot')}
                </p>
                {!serviced && (
                  <p className="mt-1.5 text-body4 text-error">
                    {resolved.resolved
                      ? hi
                        ? 'यहाँ अभी डिलीवरी नहीं है।'
                        : 'We do not deliver here yet.'
                      : hi
                        ? 'यह जगह पहचान नहीं पाए — पिन थोड़ा हिलाएँ।'
                        : 'Could not identify this spot — nudge the pin.'}
                  </p>
                )}
                {/*
                  * "Not yet" as a shop growing toward them, not a closed door:
                  * where we do reach today, and a way to hear when we start.
                  */}
                {!serviced && resolved.resolved && (
                  <div className="mt-2 max-h-48 overflow-y-auto">
                    {resolved.nearby.length > 0 && (
                      <p className="text-body5 text-ink-muted">
                        {hi ? 'फ़िलहाल हम यहाँ पहुँचते हैं: ' : 'Right now we reach: '}
                        {resolved.nearby
                          .slice(0, 3)
                          .map((near) => `${near.areaName}, ${near.city}`)
                          .join(' · ')}
                      </p>
                    )}
                    {resolved.pincode && (
                      <NotifyForm pincode={resolved.pincode} locale={locale} signedInPhone={notifyPhone} />
                    )}
                  </div>
                )}
              </div>
            ) : null}
            <Button
              type="button"
              variant="buy"
              size="lg"
              block
              className="mt-3"
              disabled={!resolved || resolving || !serviced || !resolved.pincode}
              onClick={() =>
                resolved && onConfirm({ latitude: centre.lat, longitude: centre.lng, resolved })
              }
            >
              {hi ? 'पक्का करें और आगे बढ़ें' : 'Confirm & Continue'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
