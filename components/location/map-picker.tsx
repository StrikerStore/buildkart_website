'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { Check, Crosshair, Loader2, MapPin, Search, X } from 'lucide-react';
import { formatINR, type DeviceLocationDto, type PlaceSuggestionDto } from '@StrikerStore/contract';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import type { Locale } from '@/lib/i18n';
import { resolveDeviceLocation, searchPlaces } from '@/app/location/actions';

/*
 * `ssr: false` is only honoured inside a Client Component — the Next docs are
 * explicit about it — which is the whole reason this wrapper exists rather than
 * the page importing the map directly.
 */
const LeafletMap = dynamic(() => import('./leaflet-map'), {
  ssr: false,
  loading: () => (
    <div className="grid size-full place-items-center bg-surface-muted">
      <Loader2 className="size-6 animate-spin text-ink-faint" aria-hidden />
    </div>
  ),
});

/** Close enough to read house numbers, which is the point of the exercise. */
const PIN_ZOOM = 17;

export type ConfirmedPin = {
  latitude: number;
  longitude: number;
  resolved: DeviceLocationDto;
};

/**
 * Drop a pin, and see whether we deliver to it.
 *
 * The one screen that produces a delivery location in this storefront. A
 * pincode names a few square kilometres of Indore; this names a gate. On a plot
 * with no street address — this shop's normal case — that is the difference
 * between a delivery and a phone call.
 *
 * The map re-resolves on every settle, so the card underneath always describes
 * the spot currently under the pin rather than the one the customer started
 * from.
 *
 * `onConfirm` fires for **any** resolved coordinate, serviced or not, and hands
 * the caller the full answer. That is on purpose: confirming a spot we do not
 * cover is how the customer reaches the "we are coming soon" panel and its
 * notify button, and a disabled button with no explanation would strand them
 * there instead.
 */
export function MapPicker({
  locale,
  initial,
  onConfirm,
  onCancel,
  confirmLabel,
}: {
  locale: Locale;
  /** Where to open. A saved pin, the last known area, or the shop's default. */
  initial: { lat: number; lng: number; zoom: number };
  onConfirm: (pin: ConfirmedPin) => void;
  onCancel?: () => void;
  /** Overridden on the address form, where confirming means "use this spot". */
  confirmLabel?: string;
}) {
  const hi = locale === 'hi';

  const [centre, setCentre] = useState({ lat: initial.lat, lng: initial.lng });
  const [zoom, setZoom] = useState(initial.zoom);
  const [recentreToken, setRecentreToken] = useState(0);

  const [resolved, setResolved] = useState<DeviceLocationDto | null>(null);
  const [resolving, startResolving] = useTransition();
  const [locating, setLocating] = useState(false);

  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<PlaceSuggestionDto[]>([]);
  const [searchPending, startSearch] = useTransition();

  /*
   * Guards a slow response overwriting a newer one. Two drags in quick
   * succession can return out of order, and the card must describe where the
   * pin is now — not where it was two gestures ago.
   */
  const latest = useRef(0);

  const resolveAt = useCallback((lat: number, lng: number) => {
    const ticket = ++latest.current;
    startResolving(async () => {
      const answer = await resolveDeviceLocation(lat, lng);
      if (ticket === latest.current) setResolved(answer);
    });
  }, []);

  // Resolve whatever the map opened on, so the card is never blank.
  useEffect(() => {
    resolveAt(initial.lat, initial.lng);
    // Mount only; later resolves come from `moved`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function moved(next: { lat: number; lng: number }) {
    setCentre(next);
    resolveAt(next.lat, next.lng);
  }

  function locate() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = { lat: position.coords.latitude, lng: position.coords.longitude };
        setCentre(next);
        setZoom(PIN_ZOOM);
        setRecentreToken((token) => token + 1);
        resolveAt(next.lat, next.lng);
        setLocating(false);
      },
      // Refusal is ordinary here: the map is already open and draggable, which
      // is the whole reason it is the fallback as well as the happy path.
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  }

  /* Debounced, because Nominatim asks for about one request a second and this
     fires while somebody is typing. */
  useEffect(() => {
    if (query.trim().length < 3) {
      setHits([]);
      return;
    }

    const timer = setTimeout(() => {
      startSearch(async () => setHits(await searchPlaces(query)));
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  function pick(hit: PlaceSuggestionDto) {
    setCentre({ lat: hit.latitude, lng: hit.longitude });
    setZoom(PIN_ZOOM);
    setRecentreToken((token) => token + 1);
    resolveAt(hit.latitude, hit.longitude);
    setSearching(false);
    setQuery('');
    setHits([]);
  }

  const serviced = resolved?.serviced === true;

  return (
    <div className="overflow-hidden rounded-card border border-hairline bg-surface">
      {/* --- the map ----------------------------------------------------- */}
      <div className="relative h-[280px] sm:h-[340px]">
        <LeafletMap centre={centre} zoom={zoom} onMoved={moved} recentreToken={recentreToken} />

        {/*
          * The pin. Fixed dead centre, above the tiles, and deliberately not a
          * Leaflet marker — the map moves under it. `-translate-y-full` puts the
          * point of the pin on the centre pixel rather than its middle.
          */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-[400] -translate-x-1/2 -translate-y-full">
          <MapPin
            className={cn('size-9 drop-shadow-md', serviced ? 'text-success' : 'text-brand-text')}
            fill="currentColor"
            strokeWidth={1.5}
            aria-hidden
          />
        </div>

        {/* A small shadow under the pin's point sells the "hovering" read. */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-[399] size-2 -translate-x-1/2 rounded-pill bg-ink/25" />

        <button
          type="button"
          onClick={locate}
          disabled={locating}
          className="absolute bottom-3 right-3 z-[400] inline-flex h-10 items-center gap-1.5 rounded-pill bg-surface px-3 text-cta3 text-ink shadow-raised hover:bg-surface-muted disabled:opacity-60"
        >
          {locating ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Crosshair className="size-4" aria-hidden />
          )}
          {hi ? 'मेरी लोकेशन' : 'My location'}
        </button>

        <button
          type="button"
          onClick={() => setSearching((open) => !open)}
          className="absolute left-3 top-3 z-[400] inline-flex h-10 items-center gap-1.5 rounded-pill bg-surface px-3 text-cta3 text-ink shadow-raised hover:bg-surface-muted"
        >
          <Search className="size-4" aria-hidden />
          {hi ? 'इलाक़ा खोजें' : 'Search area'}
        </button>

        {/* --- search, over the map ---------------------------------------- */}
        {searching && (
          <div className="absolute inset-x-3 top-3 z-[401] rounded-card bg-surface p-2 shadow-raised">
            <div className="flex items-center gap-2">
              <Search className="size-4 shrink-0 text-ink-faint" aria-hidden />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value.slice(0, 120))}
                autoFocus
                placeholder={hi ? 'जैसे: विजय नगर इंदौर' : 'e.g. Vijay Nagar Indore'}
                aria-label={hi ? 'इलाक़ा खोजें' : 'Search for your area'}
                className="min-w-0 flex-1 bg-transparent text-body2 text-ink outline-none"
              />
              {searchPending && <Loader2 className="size-4 animate-spin text-ink-faint" aria-hidden />}
              <button
                type="button"
                onClick={() => {
                  setSearching(false);
                  setQuery('');
                  setHits([]);
                }}
                aria-label={hi ? 'बंद करें' : 'Close search'}
                className="grid size-7 shrink-0 place-items-center rounded-box text-ink-muted hover:bg-surface-muted"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            {hits.length > 0 && (
              <ul className="mt-2 max-h-52 overflow-y-auto border-t border-hairline pt-1">
                {hits.map((hit) => (
                  <li key={`${hit.latitude},${hit.longitude}`}>
                    <button
                      type="button"
                      onClick={() => pick(hit)}
                      className="w-full rounded-box px-2 py-2 text-left hover:bg-surface-muted"
                    >
                      <span className="block text-body2 text-ink">{hit.label}</span>
                      {hit.sublabel && (
                        <span className="clamp-1 block text-body5 text-ink-faint">
                          {hit.sublabel}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {query.trim().length >= 3 && !searchPending && hits.length === 0 && (
              <p className="mt-2 border-t border-hairline px-2 pt-2 text-body4 text-ink-muted">
                {hi
                  ? 'कुछ नहीं मिला। नक़्शे को खींचकर सही जगह पर लाएँ।'
                  : 'No matches. Drag the map to your spot instead.'}
              </p>
            )}
          </div>
        )}
      </div>

      {/* --- what is under the pin --------------------------------------- */}
      <div className="border-t border-hairline p-4">
        <p className="text-body4 text-ink-muted">
          {hi ? 'पिन को सही जगह पर लाएँ' : 'Move the map so the pin sits on your gate'}
        </p>

        {resolving && !resolved ? (
          <p className="mt-2 flex items-center gap-2 text-body2 text-ink-muted">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {hi ? 'देख रहे हैं…' : 'Checking…'}
          </p>
        ) : resolved ? (
          <div className={cn('mt-2', resolving && 'opacity-60')}>
            <p className="text-body2 text-ink">
              {resolved.formatted ??
                (hi ? 'यह जगह पहचान नहीं पाए' : 'We could not name this spot')}
            </p>

            {serviced && resolved.area ? (
              <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-body3 text-success">
                <Check className="size-4 shrink-0" aria-hidden />
                {hi ? 'यहाँ डिलीवरी होती है' : 'We deliver here'}
                <span className="text-ink-muted">
                  {resolved.area.promiseHours}
                  {hi ? ' घंटे' : ' hours'} ·{' '}
                  {Number(resolved.area.deliveryCharge) > 0
                    ? formatINR(resolved.area.deliveryCharge)
                    : hi
                      ? 'मुफ़्त डिलीवरी'
                      : 'free delivery'}
                </span>
              </p>
            ) : (
              <p className="mt-1.5 text-body3 text-warning">
                {resolved.resolved
                  ? hi
                    ? 'यहाँ अभी डिलीवरी नहीं है'
                    : 'We do not deliver here yet'
                  : hi
                    ? 'यह जगह पहचान नहीं पाए — पिन थोड़ा हिलाएँ'
                    : 'Could not identify this spot — nudge the pin'}
              </p>
            )}

            {/* The coordinate, shown plainly. It is what the rider gets. */}
            <p className="mt-1 font-mono text-body5 tabular-nums text-ink-faint">
              {centre.lat.toFixed(5)}, {centre.lng.toFixed(5)}
            </p>
          </div>
        ) : null}

        <div className="mt-4 flex gap-2">
          <Button
            type="button"
            block
            disabled={!resolved || resolving}
            onClick={() =>
              resolved &&
              onConfirm({ latitude: centre.lat, longitude: centre.lng, resolved })
            }
          >
            {confirmLabel ?? (hi ? 'यही जगह है' : 'Confirm this location')}
          </Button>

          {onCancel && (
            <Button type="button" variant="quiet" onClick={onCancel}>
              {hi ? 'रद्द' : 'Cancel'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
