'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Check, ChevronRight, Crosshair, Loader2, MapPin, Search, Settings } from 'lucide-react';
import { formatINR, type DeviceLocationDto, type MyAddressDto } from '@StrikerStore/contract';
import { Button } from '@/components/ui/button';
import { MapPicker, type ConfirmedPin } from '@/components/location/map-picker';
import { cn } from '@/lib/cn';
import type { Locale } from '@/lib/i18n';
import type { StoredLocation } from '@/lib/location-shared';
import { NotifyForm } from './notify-form';
import { chooseSavedAddress, confirmLocation, type PincodeCheck } from './actions';

/**
 * Where to deliver — a coordinate, or nothing.
 *
 * There are exactly **two ways in**, and that is the point of this rewrite: the
 * device's location, or a saved address that already carries a pin. The pincode
 * box and the served-areas list are gone. Both let somebody set a delivery area
 * without saying where they actually are, and a pincode covers several square
 * kilometres of Indore — on a plot with no street address, which is this shop's
 * normal case, it tells a rider nothing.
 *
 * A refused permission does not dead-end. The map opens anyway, at the shop's
 * default, with a locality search over it: the customer finds their area, drags
 * the pin to their gate, and the result is still a real coordinate. That is what
 * keeps the no-pincode rule intact for people who will not share GPS.
 *
 * The owner already asked for this — `checkout.location.requirePinDrop` has been
 * `true` in settings all along, and nothing honoured it until now.
 */
type Stage =
  | { kind: 'idle' }
  | { kind: 'locating' }
  | { kind: 'map'; centre: { lat: number; lng: number }; zoom: number; denied: boolean }
  | { kind: 'confirmed'; result: DeviceLocationDto }
  | { kind: 'saved'; result: PincodeCheck };

export function LocationPicker({
  locale,
  current,
  addresses,
  signedInPhone,
  mapDefault,
  onSettled,
}: {
  locale: Locale;
  current: StoredLocation | null;
  addresses: MyAddressDto[];
  signedInPhone: string | null;
  /** `checkout.location`'s default centre and zoom, set by the owner. */
  mapDefault: { lat: number; lng: number; zoom: number };
  /**
   * Fired once a **serviced** area has been set, so a host sheet can close.
   *
   * Only on success: an out-of-area answer is the screen the customer needs to
   * read — it carries the notify button — and closing over it would throw away
   * the one thing that turns a lost visitor into a lead. Absent on the
   * standalone page, which has nothing to close.
   */
  onSettled?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [stage, setStage] = useState<Stage>({ kind: 'idle' });
  const [error, setError] = useState<string | null>(null);
  const hi = locale === 'hi';

  /** Where the map should open: the last pin, else the shop's default. */
  const openAt =
    current?.latitude && current.longitude
      ? { lat: Number(current.latitude), lng: Number(current.longitude), zoom: 17 }
      : mapDefault;

  function openMap(denied: boolean) {
    setStage({ kind: 'map', centre: { lat: openAt.lat, lng: openAt.lng }, zoom: openAt.zoom, denied });
  }

  function locate() {
    setError(null);

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      openMap(true);
      return;
    }

    setStage({ kind: 'locating' });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setStage({
          kind: 'map',
          centre: { lat: position.coords.latitude, lng: position.coords.longitude },
          zoom: 17,
          denied: false,
        });
      },
      /*
       * Refused, timed out, or no fix — all three land in the same place: the
       * map, opened at the shop's default with search available. Saying
       * "permission denied" and stopping would leave somebody unable to shop at
       * all, which no amount of correctness justifies.
       */
      () => openMap(true),
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  }

  function confirm(pin: ConfirmedPin) {
    setError(null);
    startTransition(async () => {
      const result = await confirmLocation(pin.latitude, pin.longitude);
      setStage({ kind: 'confirmed', result });
      if (result.serviced) {
        router.refresh();
        /* Let the confirmation land before the sheet goes; closing on the same
           frame reads as the tap having done nothing. */
        setTimeout(() => onSettled?.(), 900);
      }
    });
  }

  /* Named `pick…`, not `use…`: a `use` prefix makes React's lint rules read
     this as a hook, and calling it from an onClick then trips rules-of-hooks. */
  function pickSaved(address: MyAddressDto) {
    setError(null);

    /*
     * No pin on this row: it was saved before one was required. Open the map so
     * they can set it, rather than accepting a pincode-shaped approximation of
     * where they are.
     */
    if (!address.latitude || !address.longitude) {
      openMap(false);
      return;
    }

    startTransition(async () => {
      const answer = await chooseSavedAddress(address.id);
      if ('error' in answer) {
        setError(answer.error);
        return;
      }
      setStage({ kind: 'saved', result: answer });
      if (answer.serviced) {
        router.refresh();
        setTimeout(() => onSettled?.(), 900);
      }
    });
  }

  // --- the map, once opened ------------------------------------------------
  if (stage.kind === 'map') {
    return (
      <div className="mt-6 space-y-3">
        {stage.denied && (
          <div className="rounded-card border border-warning/30 bg-warning-bg p-3">
            <p className="flex items-center gap-2 text-heading7 text-ink">
              <Settings className="size-4 shrink-0 text-warning" aria-hidden />
              {hi ? 'लोकेशन नहीं मिली' : 'We could not get your location'}
            </p>
            <p className="mt-1 text-body4 text-ink-muted">
              {hi
                ? 'कोई बात नहीं — नक़्शे पर अपना इलाक़ा खोजें और पिन को सही जगह पर लाएँ।'
                : 'No problem — search your area on the map and drag the pin to your spot.'}
            </p>
          </div>
        )}

        <MapPicker
          locale={locale}
          initial={{ lat: stage.centre.lat, lng: stage.centre.lng, zoom: stage.zoom }}
          onConfirm={confirm}
          onCancel={() => setStage({ kind: 'idle' })}
        />

        {pending && (
          <p className="flex items-center gap-2 text-body3 text-ink-muted">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {hi ? 'सेव कर रहे हैं…' : 'Saving…'}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-5">
      {stage.kind === 'confirmed' && (
        <ConfirmedPanel result={stage.result} locale={locale} signedInPhone={signedInPhone} />
      )}

      {stage.kind === 'saved' && <SavedPanel result={stage.result} locale={locale} />}

      {error && (
        <p role="alert" className="text-body2 text-error">
          {error}
        </p>
      )}

      {/* --- route one: a saved address --------------------------------- */}
      {addresses.length > 0 && (
        <section>
          <h2 className="text-heading6 text-ink">
            {hi ? 'सेव किए हुए पते' : 'Deliver to a saved address'}
          </h2>
          <ul className="mt-2 space-y-2">
            {addresses.map((address) => {
              const pinned = Boolean(address.latitude && address.longitude);
              return (
                <li key={address.id}>
                  <button
                    type="button"
                    onClick={() => pickSaved(address)}
                    disabled={pending || !address.serviced}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-card border p-3 text-left',
                      address.serviced
                        ? 'border-hairline bg-surface hover:border-ink'
                        : 'cursor-not-allowed border-hairline bg-surface-muted opacity-60',
                    )}
                  >
                    <MapPin className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden />
                    <span className="min-w-0 flex-1 text-body3 text-ink-muted">
                      {address.label && (
                        <span className="block text-heading7 text-ink">{address.label}</span>
                      )}
                      <span className="block">{address.line1}</span>
                      <span className="block">
                        {address.city} {address.pincode}
                      </span>

                      {!address.serviced ? (
                        <span className="mt-1 block text-body5 text-warning">
                          {hi ? 'यहाँ अभी डिलीवरी नहीं है' : 'Not deliverable right now'}
                        </span>
                      ) : pinned ? (
                        <span className="mt-1 flex items-center gap-1 text-body5 text-success">
                          <Check className="size-3 shrink-0" aria-hidden />
                          {hi ? 'सटीक लोकेशन सेव है' : 'Exact location saved'}
                        </span>
                      ) : (
                        /* Saved before pins were required. Still usable — it
                           opens the map instead of being taken at face value. */
                        <span className="mt-1 block text-body5 text-warning">
                          {hi ? 'सटीक लोकेशन जोड़ें' : 'Add exact location'}
                        </span>
                      )}
                    </span>
                    {address.serviced && (
                      <ChevronRight className="mt-0.5 size-4 shrink-0 text-ink-faint" aria-hidden />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* --- route two: the device -------------------------------------- */}
      <div>
        {addresses.length > 0 && (
          <p className="mb-2 text-center text-body4 text-ink-faint">{hi ? 'या' : 'or'}</p>
        )}

        <Button
          type="button"
          size="lg"
          block
          onClick={locate}
          disabled={pending || stage.kind === 'locating'}
        >
          {stage.kind === 'locating' ? (
            <Loader2 className="size-5 animate-spin" aria-hidden />
          ) : (
            <Crosshair className="size-5" aria-hidden />
          )}
          {hi ? 'मेरी लोकेशन इस्तेमाल करें' : 'Use my current location'}
        </Button>

        <button
          type="button"
          onClick={() => openMap(false)}
          className="mt-2 inline-flex w-full items-center justify-center gap-1.5 text-body3 text-ink-muted hover:text-ink"
        >
          <Search className="size-4" aria-hidden />
          {hi ? 'या नक़्शे पर खुद चुनें' : 'or pick it on the map yourself'}
        </button>
      </div>

      {current && stage.kind === 'idle' && (
        <p className="flex items-center gap-1.5 text-body3 text-ink-muted">
          <MapPin className="size-4 shrink-0" aria-hidden />
          {hi ? 'अभी चुना है' : 'Currently set to'}:{' '}
          <span className="text-ink">{current.areaName ?? current.pincode}</span>
        </p>
      )}
    </div>
  );
}

/** The answer to a confirmed pin — the three-way outcome from the server. */
function ConfirmedPanel({
  result,
  locale,
  signedInPhone,
}: {
  result: DeviceLocationDto;
  locale: Locale;
  signedInPhone: string | null;
}) {
  const hi = locale === 'hi';

  if (result.serviced && result.area) {
    return (
      <div className="rounded-card border border-success/20 bg-success-bg p-4">
        <p className="flex items-center gap-2 text-heading5 text-success">
          <Check className="size-5 shrink-0" aria-hidden />
          {hi ? 'लोकेशन सेट हो गई' : 'Delivery location set'}
        </p>

        {result.formatted && <p className="mt-1.5 text-body3 text-ink-muted">{result.formatted}</p>}

        <p className="mt-1 text-body2 text-ink">
          {result.area.areaName}, {result.area.city}
          {' · '}
          {hi ? `${result.area.promiseHours} घंटे में` : `in ${result.area.promiseHours} hours`}
        </p>

        <p className="mt-1 text-body3 text-ink-muted">
          {hi ? 'डिलीवरी शुल्क' : 'Delivery'}: {formatINR(result.area.deliveryCharge)}
          {result.area.freeAbove &&
            (hi
              ? ` · ${formatINR(result.area.freeAbove)} से ऊपर मुफ़्त`
              : ` · free above ${formatINR(result.area.freeAbove)}`)}
        </p>
      </div>
    );
  }

  if (result.resolved) {
    const where = [result.areaName, result.city].filter(Boolean).join(', ') || result.pincode;

    return (
      <div className="rounded-card border border-brand bg-brand-tint p-4">
        <p className="flex items-center gap-2 text-heading5 text-ink">
          <MapPin className="size-5 shrink-0 text-brand-text" aria-hidden />
          {hi ? `${where} में हम जल्द आ रहे हैं` : `We are coming to ${where} soon`}
        </p>

        <p className="mt-1.5 text-body2 text-ink-muted">
          {signedInPhone
            ? hi
              ? 'अभी यहाँ डिलीवरी नहीं है। शुरू होते ही हम आपको बता देंगे।'
              : 'We do not deliver there yet. We will tell you the day we start.'
            : hi
              ? 'अभी यहाँ डिलीवरी नहीं है। नंबर छोड़ दें, शुरू होते ही बताएंगे।'
              : 'We do not deliver there yet. Leave your number and we will tell you the day we start.'}
        </p>

        {result.nearby.length > 0 && (
          <div className="mt-3 rounded-box bg-surface p-3">
            <p className="text-body4 text-ink-muted">
              {hi ? 'फ़िलहाल हम यहाँ पहुँचते हैं:' : 'Right now we reach:'}
            </p>
            <ul className="mt-1 space-y-0.5">
              {result.nearby.slice(0, 3).map((near) => (
                <li key={near.pincode} className="text-body3 text-ink">
                  {near.areaName}, {near.city}
                  <span className="text-ink-faint">
                    {' · '}
                    {near.promiseHours} {hi ? 'घंटे' : 'hours'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.pincode && (
          <NotifyForm pincode={result.pincode} locale={locale} signedInPhone={signedInPhone} />
        )}
      </div>
    );
  }

  return (
    <div className="rounded-card border border-hairline bg-surface p-4">
      <p className="text-heading6 text-ink">
        {hi ? 'यह जगह पहचान नहीं पाए' : 'We could not identify that spot'}
      </p>
      <p className="mt-1.5 text-body3 text-ink-muted">
        {hi
          ? 'पिन को थोड़ा हिलाकर किसी सड़क या इमारत के पास लाएँ।'
          : 'Nudge the pin toward a road or building and try again.'}
      </p>
    </div>
  );
}

/** The answer to picking a saved address. */
function SavedPanel({ result, locale }: { result: PincodeCheck; locale: Locale }) {
  const hi = locale === 'hi';
  if (!result.serviced) return null;

  return (
    <div className="rounded-card border border-success/20 bg-success-bg p-4">
      <p className="flex items-center gap-2 text-heading5 text-success">
        <Check className="size-5 shrink-0" aria-hidden />
        {hi ? 'लोकेशन सेट हो गई' : 'Delivery location set'}
      </p>
      <p className="mt-1 text-body2 text-ink">
        {[result.areaName, result.city].filter(Boolean).join(', ') || result.pincode}
        {result.promiseHours !== null &&
          (hi ? ` · ${result.promiseHours} घंटे में` : ` · in ${result.promiseHours} hours`)}
      </p>
      <p className="mt-1 text-body3 text-ink-muted">
        {hi ? 'डिलीवरी शुल्क' : 'Delivery'}: {formatINR(result.deliveryCharge)}
      </p>
    </div>
  );
}
