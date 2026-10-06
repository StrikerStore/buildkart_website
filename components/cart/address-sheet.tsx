'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, ChevronRight, Crosshair, Home, Loader2, MapPin, Plus, Search, X } from 'lucide-react';
import type { MyAddressDto, PlaceSuggestionDto } from '@StrikerStore/contract';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { cn } from '@/lib/cn';
import type { MapDefault } from '@/lib/location-shared';
import { placeLocation, searchPlaces } from '@/app/location/actions';
import { saveAddress } from '@/app/account/actions';
import { selectDeliveryAddress } from '@/app/cart/checkout-actions';
import { PinMap, type PinChoice } from './pin-map';

type Stage =
  | { name: 'list' }
  | { name: 'map'; chosen: { lat: number; lng: number } | null; locate: boolean }
  | { name: 'search' }
  | { name: 'details'; pin: PinChoice };

/**
 * Choosing where the order goes, from the cart.
 *
 * Saved addresses first — one tap and done — then "Add New Address", which
 * walks through the map (current location or a search), a confirmed pin, and
 * the house-level details a rider needs at the gate. Whatever is picked or
 * saved becomes the delivery address *and* the delivery area, so the cart
 * reprices for exactly that place before anyone pays.
 */
export function AddressSheet({
  hi,
  addresses,
  selectedId,
  mapDefault,
  currentPin,
  receiver,
  onClose,
}: {
  hi: boolean;
  addresses: MyAddressDto[];
  selectedId: string | null;
  mapDefault: MapDefault;
  /** The area pin, for "• 1.9 km" and for where the map opens. */
  currentPin: { lat: number; lng: number } | null;
  /** Prefill for "who takes the delivery". */
  receiver: { name: string; phone: string };
  onClose: () => void;
}) {
  const router = useRouter();
  /*
   * A pin already dropped from the header is where a new address starts: the
   * map opens on it with "Confirm & Continue" ready, so the customer only adds
   * the house details rather than finding the place a second time.
   */
  const fresh: Stage = { name: 'map', chosen: currentPin, locate: false };
  const [stage, setStage] = useState<Stage>(addresses.length > 0 ? { name: 'list' } : fresh);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const mapStart = {
    lat: currentPin?.lat ?? mapDefault.lat,
    lng: currentPin?.lng ?? mapDefault.lng,
    zoom: currentPin ? 16 : mapDefault.zoom,
  };

  function choose(address: MyAddressDto) {
    setError(null);
    setBusyId(address.id);
    startTransition(async () => {
      const result = await selectDeliveryAddress(address.id);
      setBusyId(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  const titles: Record<Stage['name'], string> = {
    list: hi ? 'पता चुनें' : 'Select an Address',
    map: hi ? 'लोकेशन' : 'Location Information',
    search: hi ? 'आपकी लोकेशन' : 'Your Location',
    details: hi ? 'पते की जानकारी' : 'Add Address Details',
  };

  const back =
    stage.name === 'list'
      ? undefined
      : stage.name === 'map'
        ? addresses.length > 0
          ? () => setStage({ name: 'list' })
          : undefined
        : stage.name === 'search'
          ? () => setStage({ name: 'map', chosen: null, locate: false })
          : () => setStage({ name: 'map', chosen: { lat: stage.pin.latitude, lng: stage.pin.longitude }, locate: false });

  return (
    <Sheet
      title={titles[stage.name]}
      onClose={onClose}
      onBack={back}
      size={stage.name === 'list' ? 'half' : 'full'}
      closeLabel={hi ? 'बंद करें' : 'Close'}
      backLabel={hi ? 'वापस' : 'Back'}
    >
      {stage.name === 'list' && (
        <div className="space-y-4 p-4">
          <button
            type="button"
            onClick={() => setStage(fresh)}
            className="flex w-full items-center gap-3 rounded-card border border-hairline bg-surface px-4 py-4 text-left hover:bg-surface-muted"
          >
            <Plus className="size-5 text-brand-text" aria-hidden />
            <span className="flex-1 text-heading5 text-brand-text">
              {hi ? 'नया पता जोड़ें' : 'Add New Address'}
            </span>
            <ChevronRight className="size-5 text-ink-muted" aria-hidden />
          </button>

          {error && (
            <p role="alert" className="rounded-box bg-error-bg px-3 py-2 text-body3 text-error">
              {error}
            </p>
          )}

          <div>
            <h3 className="mb-2 text-heading6 uppercase text-ink">
              {hi ? 'सेव किए गए पते' : 'Saved addresses'}
            </h3>
            <ul className="divide-y divide-dashed divide-hairline-strong overflow-hidden rounded-card border border-hairline bg-surface">
              {addresses.map((address) => {
                const distance = distanceLabel(currentPin, address);
                return (
                  <li key={address.id}>
                    <button
                      type="button"
                      onClick={() => choose(address)}
                      disabled={!address.serviced || busyId !== null}
                      className={cn(
                        'flex w-full items-start gap-3 px-4 py-3.5 text-left',
                        address.serviced ? 'hover:bg-surface-muted' : 'opacity-55',
                        address.id === selectedId && 'bg-success-bg/60',
                      )}
                    >
                      <LabelIcon label={address.label} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-1.5">
                          <span className="text-heading5 text-ink">
                            {address.label || (hi ? 'पता' : 'Address')}
                          </span>
                          {distance && <span className="text-body5 text-ink-muted">• {distance}</span>}
                        </span>
                        <span className="mt-0.5 block text-body4 text-ink-muted">
                          {addressLine(address)}
                        </span>
                        {!address.serviced && (
                          <span className="mt-0.5 block text-body5 text-error">
                            {hi ? 'यहाँ अभी डिलीवरी नहीं है' : 'We don’t deliver here yet'}
                          </span>
                        )}
                      </span>
                      {busyId === address.id && (
                        <Loader2 className="mt-1 size-4 shrink-0 animate-spin text-ink-faint" aria-hidden />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {stage.name === 'map' && (
        <PinMap
          // Remounted per entry, so a search pick or an edit opens where it should.
          key={stage.chosen ? `${stage.chosen.lat},${stage.chosen.lng}` : `fresh-${String(stage.locate)}`}
          hi={hi}
          map={mapDefault}
          start={mapStart}
          chosen={stage.chosen}
          locateOnOpen={stage.locate}
          onSearch={() => setStage({ name: 'search' })}
          onConfirm={(pin) => setStage({ name: 'details', pin })}
        />
      )}

      {stage.name === 'search' && (
        <PlaceSearch
          hi={hi}
          provider={mapDefault.provider}
          onCurrentLocation={() => setStage({ name: 'map', chosen: null, locate: true })}
          onPicked={(lat, lng) => setStage({ name: 'map', chosen: { lat, lng }, locate: false })}
        />
      )}

      {stage.name === 'details' && (
        <AddressDetails
          hi={hi}
          pin={stage.pin}
          receiver={receiver}
          onEdit={() =>
            setStage({ name: 'map', chosen: { lat: stage.pin.latitude, lng: stage.pin.longitude }, locate: false })
          }
          onSaved={() => {
            router.refresh();
            onClose();
          }}
        />
      )}
    </Sheet>
  );
}

// --- search ------------------------------------------------------------------

function PlaceSearch({
  hi,
  provider,
  onCurrentLocation,
  onPicked,
}: {
  hi: boolean;
  provider: MapDefault['provider'];
  onCurrentLocation: () => void;
  onPicked: (lat: number, lng: number) => void;
}) {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<PlaceSuggestionDto[]>([]);
  const [pending, startSearch] = useTransition();
  // One Places session per search, so Google bills the pick rather than each keystroke.
  const session = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (query.trim().length < 3) {
      setHits([]);
      return;
    }
    const timer = setTimeout(
      () => {
        session.current ??= globalThis.crypto?.randomUUID?.();
        const token = session.current;
        startSearch(async () => setHits(await searchPlaces(query, token)));
      },
      provider === 'GOOGLE' ? 250 : 400,
    );
    return () => clearTimeout(timer);
  }, [query, provider]);

  function pick(hit: PlaceSuggestionDto) {
    if (hit.latitude !== null && hit.longitude !== null) {
      onPicked(hit.latitude, hit.longitude);
      return;
    }
    if (!hit.placeId) return;
    const { placeId } = hit;
    startSearch(async () => {
      const found = await placeLocation(placeId, session.current);
      if (found) onPicked(found.latitude, found.longitude);
    });
  }

  return (
    <div className="p-4">
      <div className="flex h-11 items-center gap-2 rounded-box border border-hairline-strong bg-surface px-3">
        <Search className="size-4 shrink-0 text-ink-faint" aria-hidden />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value.slice(0, 120))}
          autoFocus
          placeholder={hi ? 'नया पता खोजें' : 'Search a new address'}
          aria-label={hi ? 'पता खोजें' : 'Search a new address'}
          className="min-w-0 flex-1 bg-transparent text-body2 text-ink outline-none"
        />
        {pending && <Loader2 className="size-4 animate-spin text-ink-faint" aria-hidden />}
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label={hi ? 'साफ़ करें' : 'Clear'}
            className="grid size-6 place-items-center rounded-pill text-ink-faint hover:bg-surface-muted"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>

      {query.trim().length < 3 ? (
        <button
          type="button"
          onClick={onCurrentLocation}
          className="mt-4 flex w-full items-center gap-3 rounded-card border border-hairline bg-surface px-4 py-4 text-left hover:bg-surface-muted"
        >
          <Crosshair className="size-5 text-brand-text" aria-hidden />
          <span className="text-heading5 text-brand-text">
            {hi ? 'मेरी मौजूदा लोकेशन' : 'Use My Current Location'}
          </span>
        </button>
      ) : hits.length > 0 ? (
        <ul className="mt-4 divide-y divide-hairline overflow-hidden rounded-card border border-hairline bg-surface">
          {hits.map((hit) => (
            <li key={hit.placeId ?? `${hit.latitude},${hit.longitude}`}>
              <button
                type="button"
                onClick={() => pick(hit)}
                className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-surface-muted"
              >
                <MapPin className="mt-0.5 size-5 shrink-0 text-ink-muted" aria-hidden />
                <span className="min-w-0">
                  <span className="block text-heading6 text-ink">{hit.label}</span>
                  {hit.sublabel && <span className="block text-body4 text-ink-muted">{hit.sublabel}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        !pending && (
          <p className="mt-4 text-center text-body4 text-ink-muted">
            {hi ? 'कुछ नहीं मिला। दूसरा नाम आज़माएँ।' : 'No matches. Try another name, or a landmark nearby.'}
          </p>
        )
      )}
    </div>
  );
}

// --- details -----------------------------------------------------------------

const LABELS = ['Home', 'Work', 'Other'] as const;

function AddressDetails({
  hi,
  pin,
  receiver,
  onEdit,
  onSaved,
}: {
  hi: boolean;
  pin: PinChoice;
  receiver: { name: string; phone: string };
  onEdit: () => void;
  onSaved: () => void;
}) {
  const [kind, setKind] = useState<(typeof LABELS)[number]>('Home');
  const [otherName, setOtherName] = useState('');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [landmark, setLandmark] = useState('');
  const [name, setName] = useState(receiver.name);
  const [phone, setPhone] = useState(receiver.phone);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, startSaving] = useTransition();

  const place = pin.resolved;
  const title = place.areaName ?? place.formatted?.split(',')[0] ?? (hi ? 'चुनी गई जगह' : 'Selected spot');
  const ready = line1.trim() !== '' && line2.trim() !== '' && name.trim() !== '' && phone.trim() !== '';

  function save() {
    setError(null);
    setErrors({});
    startSaving(async () => {
      const result = await saveAddress({
        label: kind === 'Other' ? otherName.trim() || 'Other' : kind,
        line1: line1.trim(),
        line2: line2.trim(),
        landmark: landmark.trim() || undefined,
        city: place.city ?? place.area?.city ?? '',
        state: place.state ?? place.city ?? '',
        pincode: place.pincode ?? '',
        latitude: pin.latitude,
        longitude: pin.longitude,
        receiverName: name.trim(),
        receiverPhone: phone.trim(),
        isDefault: false,
      });
      if (!result.ok) {
        setErrors(result.fieldErrors);
        setError(result.formErrors[0] ?? (hi ? 'पता सेव नहीं हुआ।' : 'Could not save the address.'));
        return;
      }
      const selected = await selectDeliveryAddress(result.data.id);
      if (!selected.ok) {
        setError(selected.error);
        return;
      }
      onSaved();
    });
  }

  return (
    <div className="flex min-h-full flex-col">
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-3 rounded-card border border-hairline bg-surface p-3">
          <div className="grid size-12 shrink-0 place-items-center rounded-box bg-surface-muted">
            <MapPin className="size-6 text-ink" fill="currentColor" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-heading5 text-ink">{title}</p>
            <p className="truncate text-body4 text-ink-muted">{place.formatted}</p>
          </div>
          <Button type="button" variant="quiet" size="sm" onClick={onEdit}>
            {hi ? 'बदलें' : 'Edit'}
          </Button>
        </div>

        <div className="rounded-card border border-hairline bg-surface p-4">
          <p className="text-heading6 text-ink">{hi ? 'पता इस नाम से सेव करें' : 'Save address as'}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {LABELS.map((label) => {
              const Icon = label === 'Home' ? Home : label === 'Work' ? Briefcase : MapPin;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setKind(label)}
                  aria-pressed={kind === label}
                  className={cn(
                    'inline-flex h-9 items-center gap-1.5 rounded-box border px-3 text-cta3',
                    kind === label
                      ? 'border-brand-text bg-brand-tint text-brand-text'
                      : 'border-hairline-strong bg-surface text-ink-muted hover:border-ink',
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {label === 'Home' ? (hi ? 'घर' : 'Home') : label === 'Work' ? (hi ? 'काम' : 'Work') : hi ? 'अन्य' : 'Others'}
                </button>
              );
            })}
          </div>
          {kind === 'Other' && (
            <Field
              label={hi ? 'नाम (जैसे साइट, गोदाम)' : 'Name (e.g. Site, Godown)'}
              value={otherName}
              onChange={setOtherName}
              className="mt-3"
            />
          )}

          <div className="mt-4 space-y-3 border-t border-dashed border-hairline-strong pt-4">
            <Field
              label={hi ? 'मकान / फ़्लैट / मंज़िल *' : 'House / Flat / Floor *'}
              value={line1}
              onChange={setLine1}
              error={errors.line1}
              autoComplete="address-line1"
            />
            <Field
              label={hi ? 'बिल्डिंग / गली *' : 'Building / Street *'}
              value={line2}
              onChange={setLine2}
              error={errors.line2}
              autoComplete="address-line2"
            />
            <Field label={hi ? 'लैंडमार्क' : 'Landmark'} value={landmark} onChange={setLandmark} />
          </div>
        </div>

        <div className="space-y-3 rounded-card border border-hairline bg-surface p-4">
          <Field
            label={hi ? 'सामान लेने वाले का नाम *' : 'Receiver name *'}
            value={name}
            onChange={setName}
            error={errors.receiverName}
            autoComplete="name"
          />
          <Field
            label={hi ? 'सामान लेने वाले का नंबर *' : 'Receiver number *'}
            value={phone}
            onChange={setPhone}
            error={errors.receiverPhone}
            prefix="+91"
            inputMode="tel"
            autoComplete="tel-national"
          />
        </div>

        {error && (
          <p role="alert" className="rounded-box bg-error-bg px-3 py-2 text-body3 text-error">
            {error}
          </p>
        )}
      </div>

      <div className="sticky bottom-0 mt-auto border-t border-hairline bg-surface p-3">
        <Button type="button" variant="buy" size="lg" block disabled={!ready || saving} onClick={save}>
          {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {hi ? 'पता सेव करें' : 'Save Address'}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  prefix,
  className,
  inputMode,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  prefix?: string;
  className?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  autoComplete?: string;
}) {
  return (
    <label className={cn('block', className)}>
      <span className="text-body4 text-ink-muted">{label}</span>
      <span
        className={cn(
          'mt-1 flex h-12 items-center gap-2 rounded-box border bg-surface px-3 focus-within:border-ink',
          error ? 'border-error' : 'border-hairline-strong',
        )}
      >
        {prefix && <span className="text-body1 text-ink">{prefix}</span>}
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          inputMode={inputMode}
          autoComplete={autoComplete}
          className="min-w-0 flex-1 bg-transparent text-body1 text-ink outline-none"
        />
      </span>
      {error && <span className="mt-0.5 block text-body5 text-error">{error}</span>}
    </label>
  );
}

// --- helpers -----------------------------------------------------------------

function LabelIcon({ label }: { label: string | null }) {
  const word = (label ?? '').trim().toLowerCase();
  const Icon = word === 'home' ? Home : word === 'work' || word === 'office' ? Briefcase : MapPin;
  return <Icon className="mt-0.5 size-5 shrink-0 text-ink" aria-hidden />;
}

export function addressLine(address: MyAddressDto): string {
  return [address.line1, address.line2, address.landmark, address.city, address.pincode]
    .filter(Boolean)
    .join(', ');
}

/** "26 m" / "7.4 km" from the area pin, as the crow flies. */
function distanceLabel(from: { lat: number; lng: number } | null, address: MyAddressDto): string | null {
  if (!from || !address.latitude || !address.longitude) return null;
  const lat = Number(address.latitude);
  const lng = Number(address.longitude);
  const rad = Math.PI / 180;
  const a =
    Math.sin(((lat - from.lat) * rad) / 2) ** 2 +
    Math.cos(from.lat * rad) * Math.cos(lat * rad) * Math.sin(((lng - from.lng) * rad) / 2) ** 2;
  const metres = 2 * 6_371_000 * Math.asin(Math.sqrt(a));
  return metres < 1000 ? `${Math.round(metres)} m` : `${(metres / 1000).toFixed(1)} km`;
}
