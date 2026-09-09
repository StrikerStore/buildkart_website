'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { AlertTriangle, Check, Loader2, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import type { DeviceLocationDto, MyAddressDto } from '@StrikerStore/contract';
import { Button } from '@/components/ui/button';
import { MapPicker, type ConfirmedPin } from '@/components/location/map-picker';
import { cn } from '@/lib/cn';
import type { Locale } from '@/lib/i18n';
import { deleteAddress, saveAddress } from '@/app/account/actions';

/**
 * The address book.
 *
 * A contractor works several sites at once, which is why this is a list rather
 * than one editable address: "Sector 3 plot" and "the godown" are both real
 * destinations in the same week. The label field exists for exactly that — the
 * customer's own word for the place, not a category.
 *
 * **Every new address starts with a pin.** The map comes first and the details
 * second, which is the quick-commerce order and the honest one: the coordinate
 * is what a rider navigates to, and the flat number is what they read once they
 * are outside. City, state and pincode are *derived* from the pin and shown
 * read-only — typing them was how a delivery ended up in the wrong Vijay Nagar.
 *
 * Rows saved before this rule keep working, flagged "add exact location". They
 * are usable everywhere except checkout, which needs the coordinate.
 */
export function AddressBook({
  addresses,
  locale,
  mapDefault,
}: {
  addresses: MyAddressDto[];
  locale: Locale;
  /** `checkout.location`'s default centre and zoom, set by the owner. */
  mapDefault: { lat: number; lng: number; zoom: number };
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<MyAddressDto | 'new' | null>(null);
  const [pending, startTransition] = useTransition();
  const hi = locale === 'hi';

  function remove(id: string) {
    startTransition(async () => {
      await deleteAddress(id);
      router.refresh();
    });
  }

  function makeDefault(address: MyAddressDto) {
    startTransition(async () => {
      await saveAddress({ ...address, isDefault: true });
      router.refresh();
    });
  }

  if (editing) {
    return (
      <AddressForm
        address={editing === 'new' ? null : editing}
        locale={locale}
        mapDefault={mapDefault}
        onDone={() => {
          setEditing(null);
          router.refresh();
        }}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <div className={cn(pending && 'opacity-60')}>
      {addresses.length === 0 ? (
        <p className="rounded-card border border-hairline bg-surface px-4 py-8 text-center text-body2 text-ink-muted">
          {hi
            ? 'अभी कोई पता सेव नहीं है।'
            : 'No saved addresses yet. Add one and checkout gets a lot faster.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {addresses.map((address) => {
            const pinned = Boolean(address.latitude && address.longitude);

            return (
              <li key={address.id} className="rounded-card border border-hairline bg-surface p-4">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 size-5 shrink-0 text-ink-muted" aria-hidden />

                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      {address.label && (
                        <span className="text-heading6 text-ink">{address.label}</span>
                      )}
                      {address.isDefault && (
                        <span className="rounded-pill bg-brand-tint px-2 py-0.5 text-heading9 text-brand-text">
                          {hi ? 'डिफ़ॉल्ट' : 'Default'}
                        </span>
                      )}
                    </p>

                    <address className="mt-0.5 not-italic text-body3 text-ink-muted">
                      <span className="block text-ink">{address.line1}</span>
                      {address.line2 && <span className="block">{address.line2}</span>}
                      {address.landmark && <span className="block">{address.landmark}</span>}
                      <span className="block">
                        {address.city}, {address.state} {address.pincode}
                      </span>
                    </address>

                    {pinned ? (
                      <p className="mt-1 flex items-center gap-1 text-body5 text-success">
                        <Check className="size-3.5 shrink-0" aria-hidden />
                        {hi ? 'सटीक लोकेशन सेव है' : 'Exact location saved'}
                      </p>
                    ) : (
                      /* Saved before the pin was required. Named, not hidden —
                         and the button below is what closes the gap. */
                      <p className="mt-1 flex items-center gap-1 text-body5 text-warning">
                        <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
                        {hi
                          ? 'सटीक लोकेशन नहीं है — ऑर्डर से पहले जोड़ें'
                          : 'No exact location — needed before you can order'}
                      </p>
                    )}

                    {!address.serviced && (
                      <p className="mt-1.5 flex items-center gap-1 text-body4 text-warning">
                        <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
                        {hi
                          ? 'यहाँ अभी डिलीवरी नहीं है'
                          : 'We do not deliver to this pincode right now'}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={pinned ? 'quiet' : 'brand'}
                    onClick={() => setEditing(address)}
                  >
                    {pinned ? (
                      <>
                        <Pencil className="size-3.5" aria-hidden />
                        {hi ? 'बदलें' : 'Edit'}
                      </>
                    ) : (
                      <>
                        <MapPin className="size-3.5" aria-hidden />
                        {hi ? 'सटीक लोकेशन जोड़ें' : 'Add exact location'}
                      </>
                    )}
                  </Button>

                  {!address.isDefault && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="quiet"
                        disabled={pending}
                        onClick={() => makeDefault(address)}
                      >
                        {hi ? 'डिफ़ॉल्ट बनाएँ' : 'Make default'}
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="danger"
                        disabled={pending}
                        onClick={() => remove(address.id)}
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                        {hi ? 'हटाएँ' : 'Delete'}
                      </Button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Button type="button" variant="quiet" block className="mt-3" onClick={() => setEditing('new')}>
        <Plus className="size-4" aria-hidden />
        {hi ? 'नया पता जोड़ें' : 'Add an address'}
      </Button>
    </div>
  );
}

/**
 * Adding or editing one address, in two steps.
 *
 * Step one is the map, and it cannot be skipped. Step two is everything a rider
 * reads once they have arrived: flat or plot number, floor, a landmark, and the
 * customer's own label for the place.
 *
 * The pincode that comes back from step one is the one serviceability is judged
 * on, so it is shown rather than asked for. That is the whole point of the
 * rework — a typed pincode is a claim about where you are; a pin is where you
 * are.
 */
function AddressForm({
  address,
  locale,
  mapDefault,
  onDone,
  onCancel,
}: {
  address: MyAddressDto | null;
  locale: Locale;
  mapDefault: { lat: number; lng: number; zoom: number };
  onDone: () => void;
  onCancel: () => void;
}) {
  const hi = locale === 'hi';

  const existingPin =
    address?.latitude && address.longitude
      ? { lat: Number(address.latitude), lng: Number(address.longitude) }
      : null;

  /*
   * An address being edited that already has a pin skips straight to the
   * details — re-confirming a location they set last month is friction for no
   * gain. Everything else starts on the map.
   */
  const [step, setStep] = useState<'map' | 'details'>(existingPin ? 'details' : 'map');
  const [pin, setPin] = useState<ConfirmedPin | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  /** What the details step will save: a fresh pin, else what was already there. */
  const coordinate = pin
    ? { lat: pin.latitude, lng: pin.longitude }
    : existingPin;

  /** The place the pin resolved to, when we have just set one. */
  const resolved: DeviceLocationDto | null = pin?.resolved ?? null;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!coordinate) {
      setError(hi ? 'पहले नक़्शे पर जगह चुनें।' : 'Set the location on the map first.');
      setStep('map');
      return;
    }

    const form = new FormData(event.currentTarget);
    const value = (key: string) => String(form.get(key) ?? '').trim();

    /*
     * City, state and pincode come from the pin when there is a fresh one, and
     * otherwise from the row being edited. They are never read off the form —
     * there are no inputs for them.
     */
    const city = resolved?.city ?? address?.city ?? '';
    const state = resolved?.state ?? address?.state ?? '';
    const pincode = resolved?.pincode ?? address?.pincode ?? '';

    if (!pincode) {
      setError(
        hi
          ? 'इस जगह का पिनकोड नहीं मिला। पिन को थोड़ा हिलाएँ।'
          : 'We could not read a pincode for that spot. Nudge the pin and try again.',
      );
      setStep('map');
      return;
    }

    startTransition(async () => {
      const result = await saveAddress({
        ...(address ? { id: address.id } : {}),
        label: value('label') || undefined,
        line1: value('line1'),
        line2: value('line2') || undefined,
        landmark: value('landmark') || undefined,
        city,
        state,
        pincode,
        latitude: coordinate.lat,
        longitude: coordinate.lng,
        isDefault: form.get('isDefault') === 'on' || Boolean(address?.isDefault),
      });

      if (!result.ok) {
        setError(Object.values(result.fieldErrors)[0] ?? result.formErrors[0] ?? null);
        return;
      }
      onDone();
    });
  }

  // --- step one: the pin ---------------------------------------------------
  if (step === 'map') {
    return (
      <div className="space-y-3">
        <div>
          <h2 className="text-heading5 text-ink">
            {address
              ? hi
                ? 'सटीक जगह चुनें'
                : 'Set the exact location'
              : hi
                ? 'पहले जगह चुनें'
                : 'First, where is it?'}
          </h2>
          <p className="mt-1 text-body3 text-ink-muted">
            {hi
              ? 'पिन को उस जगह लाएँ जहाँ माल उतारना है।'
              : 'Put the pin where the load should be dropped.'}
          </p>
        </div>

        <MapPicker
          locale={locale}
          initial={{
            lat: existingPin?.lat ?? mapDefault.lat,
            lng: existingPin?.lng ?? mapDefault.lng,
            zoom: existingPin ? 17 : mapDefault.zoom,
          }}
          confirmLabel={hi ? 'यही जगह — आगे बढ़ें' : 'Use this spot'}
          onConfirm={(confirmed) => {
            setPin(confirmed);
            setStep('details');
          }}
          onCancel={onCancel}
        />
      </div>
    );
  }

  // --- step two: what the rider reads on arrival ---------------------------
  return (
    <form onSubmit={submit} className="rounded-card border border-hairline bg-surface p-4">
      <h2 className="text-heading5 text-ink">
        {address ? (hi ? 'पता बदलें' : 'Edit address') : hi ? 'पता लिखें' : 'Address details'}
      </h2>

      {/* What was pinned, and a way back to change it. */}
      <div className="mt-3 flex items-start gap-2 rounded-box bg-surface-muted p-3">
        <MapPin className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-body3 text-ink">
            {resolved?.formatted ??
              [address?.line1, address?.city, address?.pincode].filter(Boolean).join(', ')}
          </p>
          {coordinate && (
            <p className="mt-0.5 font-mono text-body5 tabular-nums text-ink-faint">
              {coordinate.lat.toFixed(5)}, {coordinate.lng.toFixed(5)}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setStep('map')}
          className="shrink-0 text-cta3 text-brand-text hover:underline"
        >
          {hi ? 'बदलें' : 'Change'}
        </button>
      </div>

      <div className="mt-4 grid gap-3">
        <Field
          name="line1"
          label={hi ? 'मकान / प्लॉट नंबर' : 'House / plot number'}
          required
          defaultValue={address?.line1 ?? ''}
        />
        <Field
          name="line2"
          label={hi ? 'मंज़िल / ब्लॉक' : 'Floor, block (optional)'}
          defaultValue={address?.line2 ?? ''}
        />
        <Field
          name="landmark"
          label={hi ? 'लैंडमार्क' : 'Landmark'}
          hint={hi ? 'जैसे: पानी की टंकी के पास' : 'e.g. near the water tank'}
          defaultValue={address?.landmark ?? ''}
        />
        <Field
          name="label"
          label={hi ? 'इसे क्या कहें?' : 'Save as'}
          hint={hi ? 'जैसे: साइट, गोदाम, घर' : 'e.g. Site, Godown, Home'}
          defaultValue={address?.label ?? ''}
        />

        {/* Derived, not typed. The pin decided these. */}
        <p className="text-body4 text-ink-muted">
          {hi ? 'इलाक़ा' : 'Area'}:{' '}
          <span className="text-ink">
            {[resolved?.city ?? address?.city, resolved?.pincode ?? address?.pincode]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </p>

        {!address?.isDefault && (
          <label className="flex items-center gap-2 text-body2 text-ink">
            <input type="checkbox" name="isDefault" className="size-4 accent-[var(--ink)]" />
            {hi ? 'इसे डिफ़ॉल्ट बनाएँ' : 'Make this my default address'}
          </label>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-3 text-body3 text-error">
          {error}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {hi ? 'सेव करें' : 'Save address'}
        </Button>
        <Button type="button" variant="quiet" onClick={onCancel}>
          {hi ? 'रद्द करें' : 'Cancel'}
        </Button>
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  hint,
  required,
  defaultValue,
}: {
  name: string;
  label: string;
  hint?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <div>
      <label htmlFor={`addr-${name}`} className="block text-body3 text-ink-muted">
        {label}
        {required && <span className="text-error"> *</span>}
      </label>
      <input
        id={`addr-${name}`}
        name={name}
        required={required}
        defaultValue={defaultValue}
        className="mt-1 h-[var(--tap)] w-full rounded-box border border-hairline-strong bg-surface px-3 text-body1 text-ink focus:border-ink focus:outline-none"
      />
      {hint && <p className="mt-0.5 text-body5 text-ink-faint">{hint}</p>}
    </div>
  );
}
