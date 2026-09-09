'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Banknote, CreditCard, Loader2, MapPin, Plus } from 'lucide-react';
import { formatINR, type CartDto, type MyAddressDto } from '@StrikerStore/contract';
import { Button } from '@/components/ui/button';
import { MapPicker } from '@/components/location/map-picker';
import { useLocationSheet } from '@/components/location/location-provider';
import { cn } from '@/lib/cn';
import type { Locale } from '@/lib/i18n';
import { placeOrder } from './actions';

type Method = { provider: string; label: string };

/**
 * Address, payment, place.
 *
 * One page rather than a wizard. PLAN.md §2 asks for the fewest possible steps
 * for a low-tech audience, and a three-screen checkout on a weak connection is
 * three chances to lose someone — where a single scrollable form is one.
 *
 * The **pincode is locked** to the delivery area already chosen. It is what the
 * cart was priced against, so letting it be retyped here would show a total
 * computed for one area and deliver to another. Changing it means going back to
 * the location picker, where the cart reprices.
 */
export function CheckoutForm({
  cart,
  methods,
  locale,
  defaultName,
  pincode,
  addresses,
  areaPin,
  mapDefault,
  area,
  askGstin,
  defaultGstin,
}: {
  cart: CartDto;
  methods: Method[];
  locale: Locale;
  defaultName: string | null;
  pincode: string;
  addresses: MyAddressDto[];
  /**
   * The coordinate captured when they chose their delivery area, if any.
   *
   * Prefilled so checkout does not raise a second permission prompt on the same
   * visit — the one most people refuse. They can still re-capture, which is
   * worth doing when the plot is not where they were standing earlier.
   */
  areaPin: { lat: number; lng: number } | null;
  /** `checkout.location`'s default centre, for a shopper with no pin at all. */
  mapDefault: { lat: number; lng: number; zoom: number };
  /**
   * What the chosen delivery area resolved to.
   *
   * The city and state an order needs, taken from the pin rather than asked for
   * again — and the line shown above the details so the shopper can see which
   * spot they are filling in a house number for.
   */
  area: { city: string; state: string; label: string | null };
  /**
   * Whether to ask for a GSTIN at all.
   *
   * Read from the shop's checkout-field settings rather than hard-coded, so an
   * owner selling only to individuals can turn the question off and never see
   * it again.
   */
  askGstin: boolean;
  /** The GSTIN this customer gave last time, so a regular firm types it once. */
  defaultGstin: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(areaPin);
  const [picking, setPicking] = useState(false);
  const [method, setMethod] = useState(methods[0]?.provider ?? '');
  const hi = locale === 'hi';
  const { open: openLocation } = useLocationSheet();

  const areaCity = area.city;
  const areaState = area.state;
  const areaLabel = area.label;

  /*
   * Only addresses in the area the cart was priced for are selectable.
   *
   * A saved address in another pincode carries a different delivery charge and
   * possibly a different promise, so offering it here would let somebody check
   * out at a total computed for somewhere else. The rest are *named* below as a
   * prompt to change the area — which reprices — rather than silently dropped,
   * because an address that vanishes reads as one the site lost.
   */
  const here = addresses.filter((address) => address.pincode === pincode);
  const elsewhere = addresses.filter((address) => address.pincode !== pincode);

  const [chosen, setChosen] = useState<string | null>(
    here.find((address) => address.isDefault)?.id ?? here[0]?.id ?? null,
  );
  const saved = here.find((address) => address.id === chosen) ?? null;

  /**
   * The coordinate this order would ship to, or null.
   *
   * A saved address carries its own; a typed one uses whatever pin has been
   * captured. Null means the order cannot be placed — `placeOrderSchema`
   * requires a coordinate, so submitting would fail at the server anyway, and
   * failing here says something the shopper can act on.
   */
  const orderPin = saved
    ? saved.latitude && saved.longitude
      ? { lat: Number(saved.latitude), lng: Number(saved.longitude) }
      : null
    : pin;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const value = (key: string) => String(form.get(key) ?? '').trim();

    /*
     * The name is required, and checked here as well as by the input's own
     * `required`. A hidden field cannot be validated by the browser, and this
     * one sits in its own section that is always visible — but the guard costs
     * a line and covers the case where it is not.
     */
    if (!value('name')) {
      setError(hi ? 'अपना नाम लिखें।' : 'Please tell us your name.');
      return;
    }

    if (!orderPin) {
      setError(
        hi
          ? 'इस पते की सटीक लोकेशन चाहिए। नीचे से लोकेशन जोड़ें।'
          : 'This address has no exact location yet. Add one below so the rider can find you.',
      );
      return;
    }

    /*
     * A picked address wins over the form. The form stays mounted but hidden,
     * so anything half-typed survives switching back and forth; what is *sent*
     * is whichever the shopper actually selected.
     */
    const address = saved
      ? {
          line1: saved.line1,
          line2: saved.line2 ?? undefined,
          landmark: saved.landmark ?? undefined,
          city: saved.city,
          state: saved.state,
          pincode,
          latitude: orderPin.lat,
          longitude: orderPin.lng,
        }
      : {
          line1: value('line1'),
          line2: value('line2') || undefined,
          landmark: value('landmark') || undefined,
          // From the pin, not the form. There are no inputs for these any
          // more — the coordinate already decided them.
          city: areaCity,
          state: areaState,
          pincode,
          latitude: orderPin.lat,
          longitude: orderPin.lng,
        };

    startTransition(async () => {
      const result = await placeOrder({
        name: value('name'),
        // Only meaningful when this address is about to be filed; a saved one
        // already has whatever name the customer gave it.
        addressLabel: saved ? undefined : value('addressLabel') || undefined,
        address,
        paymentMethod: method,
        customerNote: value('note') || undefined,
        // A saved address is already in the book; only a typed one is added.
        saveAddress: !saved,
        // Normalised and checksum-checked on the server; an empty box is
        // simply absent rather than an empty string to validate.
        gstin: askGstin ? value('gstin') || undefined : undefined,
      });

      if (!result.ok) {
        setError(result.formErrors[0] ?? Object.values(result.fieldErrors)[0] ?? null);
        return;
      }

      router.replace(`/account/orders/${result.data.orderId}?placed=1`);
    });
  }

  return (
    <form onSubmit={submit} className="gap-8 lg:flex lg:items-start">
      <div className="min-w-0 flex-1 space-y-5">
        <section className="rounded-card border border-hairline bg-surface p-4">
          <h2 className="text-heading5 text-ink">{hi ? 'डिलीवरी का पता' : 'Delivery address'}</h2>

          {here.length > 0 && (
            <div className="mt-3 space-y-2">
              {here.map((address) => (
                <label
                  key={address.id}
                  className={cn(
                    'flex cursor-pointer gap-3 rounded-box border p-3',
                    chosen === address.id
                      ? 'border-ink bg-surface-muted'
                      : 'border-hairline-strong hover:border-ink',
                  )}
                >
                  <input
                    type="radio"
                    name="savedAddress"
                    checked={chosen === address.id}
                    onChange={() => setChosen(address.id)}
                    className="mt-1 size-4 shrink-0 accent-[var(--ink)]"
                  />
                  <span className="min-w-0 text-body3 text-ink-muted">
                    {address.label && (
                      <span className="block text-heading7 text-ink">{address.label}</span>
                    )}
                    <span className="block">{address.line1}</span>
                    {address.landmark && <span className="block">{address.landmark}</span>}
                    <span className="block">
                      {address.city} {address.pincode}
                    </span>

                    {/* Saved before a pin was required. Flagged here rather
                        than at the submit button, so the shopper sees why
                        before they have filled anything else in. */}
                    {!(address.latitude && address.longitude) && (
                      <span className="mt-1 flex items-center gap-1 text-body5 text-warning">
                        <MapPin className="size-3 shrink-0" aria-hidden />
                        {hi ? 'सटीक लोकेशन नहीं है' : 'No exact location'}
                      </span>
                    )}
                  </span>
                </label>
              ))}

              <label
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-box border p-3',
                  chosen === null
                    ? 'border-ink bg-surface-muted'
                    : 'border-hairline-strong hover:border-ink',
                )}
              >
                <input
                  type="radio"
                  name="savedAddress"
                  checked={chosen === null}
                  onChange={() => setChosen(null)}
                  className="size-4 shrink-0 accent-[var(--ink)]"
                />
                <Plus className="size-4 shrink-0 text-ink-muted" aria-hidden />
                <span className="text-body2 text-ink">
                  {hi ? 'नया पता डालें' : 'Use a different address'}
                </span>
              </label>
            </div>
          )}

          {elsewhere.length > 0 && (
            <p className="mt-3 flex items-start gap-1.5 text-body4 text-ink-muted">
              <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {hi
                ? `${elsewhere.length} और पते दूसरे इलाक़े में सेव हैं। उन पर भेजने के लिए पहले इलाक़ा बदलें।`
                : `You have ${elsewhere.length} saved ${
                    elsewhere.length === 1 ? 'address' : 'addresses'
                  } in another area. Change your delivery area to use ${
                    elsewhere.length === 1 ? 'it' : 'them'
                  }.`}
            </p>
          )}

          {/*
            * The details, asked only when the pinned spot is not already one of
            * their saved addresses.
            *
            * City, state and pincode are **absent** — the pin resolved them, and
            * they are shown below rather than typed. What is left is the part a
            * coordinate genuinely cannot supply: which plot, which floor, and
            * what to look for on arrival.
            *
            * Hidden rather than unmounted when a saved address is picked, so a
            * half-typed address survives switching back.
            */}
          <div className={cn('mt-3 grid gap-3', saved && 'hidden')}>
            {areaLabel && (
              <div className="rounded-box bg-surface-muted p-3">
                <p className="text-body4 text-ink-muted">
                  {hi ? 'डिलीवरी यहाँ' : 'Delivering to'}
                </p>
                <p className="mt-0.5 text-body2 text-ink">{areaLabel}</p>
                <button
                  type="button"
                  onClick={openLocation}
                  className="mt-1 text-cta3 text-brand-text hover:underline"
                >
                  {hi ? 'जगह बदलें' : 'Change location'}
                </button>
              </div>
            )}

            <Field
              name="line1"
              label={hi ? 'मकान / प्लॉट नंबर' : 'House / plot number'}
              required={!saved}
              autoComplete="address-line1"
            />
            <Field
              name="line2"
              label={hi ? 'मंज़िल / ब्लॉक' : 'Floor, block (optional)'}
              autoComplete="address-line2"
            />
            <Field
              name="landmark"
              label={hi ? 'लैंडमार्क' : 'Landmark'}
              hint={hi ? 'जैसे: पानी की टंकी के पास' : 'e.g. near the water tank'}
            />

            {/*
              * The nickname, asked here because this is the moment the customer
              * is thinking about the place. It is what the address book and the
              * location picker will show them next time — a book of bare street
              * lines is one nobody picks from.
              */}
            <Field
              name="addressLabel"
              label={hi ? 'इस जगह को क्या कहें?' : 'Save this place as'}
              hint={hi ? 'जैसे: साइट, गोदाम, घर' : 'e.g. Site, Godown, Home'}
              required={!saved}
            />
          </div>

          {/*
            * The pin. Shown whenever this order does not have one yet — for a
            * newly typed address, and for a saved address from before pins were
            * required. Hidden only when the chosen address already carries one.
            *
            * For a four-hour promise "near the water tank" is not precise
            * enough; the coordinate is what the rider actually navigates to
            * (PLAN.md §6.7), and `placeOrderSchema` now refuses an order
            * without it.
            */}
          {/*
            * The pin is already known in the ordinary case — the gate took it
            * before browsing began — so this states it rather than asking for
            * it again.
            *
            * The one case that still asks is a *saved* address from before pins
            * were required. The area pin cannot stand in for it: it is where the
            * customer is now, not where that plot is, and quietly substituting
            * one for the other is precisely the wrong-gate delivery this whole
            * rework exists to prevent. So that case says so specifically rather
            * than implying we lost the location.
            */}
          {orderPin ? (
            <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-body3 text-success">
              <MapPin className="size-4 shrink-0" aria-hidden />
              {hi ? 'सटीक लोकेशन तय है' : 'Exact location set'}
              <span className="font-mono text-body5 tabular-nums text-ink-faint">
                {orderPin.lat.toFixed(5)}, {orderPin.lng.toFixed(5)}
              </span>
              {!saved && (
                <button
                  type="button"
                  onClick={() => setPicking(true)}
                  className="text-cta3 text-brand-text hover:underline"
                >
                  {hi ? 'बदलें' : 'Change'}
                </button>
              )}
            </p>
          ) : (
            <div className="mt-4 rounded-box border border-warning/30 bg-warning-bg p-3">
              <p className="flex items-center gap-2 text-heading7 text-ink">
                <MapPin className="size-4 shrink-0 text-warning" aria-hidden />
                {hi
                  ? 'इस सेव किए पते की लोकेशन नहीं है'
                  : 'This saved address has no pinned location'}
              </p>
              <p className="mt-1 text-body4 text-ink-muted">
                {hi
                  ? 'यह पता पिन ज़रूरी होने से पहले सेव हुआ था। एक बार जगह चुन दें — आगे से नहीं पूछेंगे।'
                  : 'It was saved before pins were required. Set it once and we will not ask again.'}
              </p>
              <Button
                type="button"
                variant="quiet"
                className="mt-2"
                onClick={() => setPicking(true)}
              >
                <MapPin className="size-4" aria-hidden />
                {hi ? 'लोकेशन चुनें' : 'Set exact location'}
              </Button>
            </div>
          )}

          {picking && (
            <div className="mt-3">
              <MapPicker
                locale={locale}
                initial={{
                  lat: orderPin?.lat ?? mapDefault.lat,
                  lng: orderPin?.lng ?? mapDefault.lng,
                  zoom: orderPin ? 17 : mapDefault.zoom,
                }}
                confirmLabel={hi ? 'यही जगह' : 'Use this spot'}
                onConfirm={(confirmed) => {
                  setPin({ lat: confirmed.latitude, lng: confirmed.longitude });
                  /*
                   * A saved address cannot take the new pin without a write, so
                   * switching to the typed form is the honest move: the order
                   * ships to the pin, and the book is left alone.
                   */
                  setChosen(null);
                  setPicking(false);
                }}
                onCancel={() => setPicking(false)}
              />
            </div>
          )}
        </section>

        <section className="rounded-card border border-hairline bg-surface p-4">
          <h2 className="text-heading5 text-ink">{hi ? 'पेमेंट' : 'Payment'}</h2>

          {methods.length === 0 ? (
            <p className="mt-2 text-body2 text-error">
              {hi
                ? 'अभी कोई पेमेंट तरीका चालू नहीं है। कृपया कॉल करें।'
                : 'No payment method is switched on. Please call us to order.'}
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {methods.map((entry) => (
                <label
                  key={entry.provider}
                  className={cn(
                    'flex min-h-[var(--tap)] cursor-pointer items-center gap-3 rounded-box border px-4 py-3',
                    method === entry.provider
                      ? 'border-ink bg-surface-muted'
                      : 'border-hairline-strong hover:border-ink',
                  )}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={entry.provider}
                    checked={method === entry.provider}
                    onChange={() => setMethod(entry.provider)}
                    className="size-4 accent-[var(--ink)]"
                  />
                  {entry.provider === 'COD' ? (
                    <Banknote className="size-5 text-ink-muted" aria-hidden />
                  ) : (
                    <CreditCard className="size-5 text-ink-muted" aria-hidden />
                  )}
                  <span className="text-body1 text-ink">{entry.label}</span>
                </label>
              ))}
            </div>
          )}

          {/*
            * Said plainly rather than left to be discovered on the payment
            * screen. Online payment is not wired to a gateway yet — the order
            * is placed and the shop calls to collect.
            */}
          {method && method !== 'COD' && (
            <p className="mt-3 rounded-box bg-info-bg px-3 py-2 text-body3 text-info">
              {hi
                ? 'ऑनलाइन पेमेंट अभी चालू नहीं है। ऑर्डर दर्ज होगा और हम पेमेंट के लिए कॉल करेंगे।'
                : 'Online payment is not live yet. Your order will be placed and we will call you to take payment.'}
            </p>
          )}
        </section>

        <section className="rounded-card border border-hairline bg-surface p-4">
          <h2 className="text-heading5 text-ink">{hi ? 'आपका नाम' : 'Your name'}</h2>
          <p className="mt-0.5 text-body4 text-ink-muted">
            {hi
              ? 'डिलीवरी के समय राइडर इसी नाम से पूछेगा।'
              : 'The rider asks for this name on arrival.'}
          </p>
          <div className="mt-3">
            <Field
              name="name"
              label={hi ? 'नाम' : 'Full name'}
              required
              defaultValue={defaultName ?? ''}
              autoComplete="name"
            />
          </div>
        </section>

        {/*
          * The GST number — optional, and in its own section rather than beside
          * the name.
          *
          * Most of this shop's customers are individuals building a house and
          * have no GSTIN at all. Putting it in the contact block would make
          * every one of them read a tax field to work out it does not apply.
          * A separate, clearly-labelled block is one they can skip at a glance,
          * and the contractors it *is* for are looking for it.
          */}
        {askGstin && (
          <section className="rounded-card border border-hairline bg-surface p-4">
            <h2 className="text-heading5 text-ink">
              {hi ? 'GST बिल चाहिए?' : 'Need a GST invoice?'}
            </h2>
            <p className="mt-0.5 text-body4 text-ink-muted">
              {hi
                ? 'फर्म के नाम पर बिल चाहिए तो GST नंबर लिखें। निजी खरीद के लिए खाली छोड़ दें।'
                : 'For an invoice in your firm’s name. Leave it blank if you are buying personally.'}
            </p>
            <div className="mt-3">
              <Field
                name="gstin"
                label={hi ? 'GST नंबर' : 'GST number'}
                defaultValue={defaultGstin ?? ''}
                hint={
                  hi
                    ? '15 अक्षर — जैसे 23AABCU9603R1ZM'
                    : '15 characters, e.g. 23AABCU9603R1ZM'
                }
              />
            </div>
          </section>
        )}

        <section className="rounded-card border border-hairline bg-surface p-4">
          <label htmlFor="note" className="text-heading5 text-ink">
            {hi ? 'कोई बात कहनी है?' : 'Anything we should know?'}
          </label>
          <textarea
            id="note"
            name="note"
            rows={2}
            maxLength={2000}
            placeholder={
              hi
                ? 'जैसे: सुबह 9 बजे से पहले पहुँचा दें'
                : 'e.g. deliver before 9am, gate is on the side'
            }
            className="mt-2 w-full rounded-box border border-hairline-strong bg-surface p-3 text-body2 text-ink focus:border-ink focus:outline-none"
          />
        </section>
      </div>

      <div className="mt-5 lg:mt-0 lg:w-80 lg:shrink-0">
        <div className="rounded-card border border-hairline bg-surface p-4">
          <h2 className="text-heading5 text-ink">{hi ? 'ऑर्डर' : 'Your order'}</h2>

          <ul className="mt-3 space-y-2 text-body3">
            {cart.lines.map((line) => (
              <li key={line.variantId} className="flex justify-between gap-3">
                <span className="min-w-0 text-ink-muted">
                  <span className="clamp-1 block">
                    {(hi && line.nameHi) || line.nameEn}
                    {line.variantLabel && ` · ${line.variantLabel}`}
                  </span>
                  <span className="text-ink-faint">× {line.quantity}</span>
                </span>
                <span className="shrink-0 text-ink">{formatINR(line.lineTotal)}</span>
              </li>
            ))}
          </ul>

          <dl className="mt-3 space-y-1.5 border-t border-hairline pt-3 text-body3">
            <Row label={hi ? 'सामान' : 'Subtotal'} value={formatINR(cart.subtotal)} />
            {cart.discountTotal !== '0.00' && (
              <Row
                label={hi ? 'छूट' : 'Discount'}
                value={`− ${formatINR(cart.discountTotal)}`}
                tone="success"
              />
            )}
            <Row
              label={hi ? 'डिलीवरी' : 'Delivery'}
              value={
                cart.deliveryCharge === '0.00'
                  ? hi
                    ? 'मुफ़्त'
                    : 'Free'
                  : formatINR(cart.deliveryCharge)
              }
            />
            <div className="flex justify-between border-t border-hairline pt-2">
              <dt className="text-heading5 text-ink">{hi ? 'कुल' : 'To pay'}</dt>
              <dd className="text-heading3 text-ink">{formatINR(cart.grandTotal)}</dd>
            </div>
          </dl>

          {error && (
            <p role="alert" className="mt-3 rounded-box bg-error-bg px-3 py-2 text-body3 text-error">
              {error}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            block
            disabled={pending || methods.length === 0 || !orderPin}
            className="mt-4"
          >
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {hi ? 'ऑर्डर करें' : 'Place order'}
          </Button>

          <p className="mt-2 text-center text-body5 text-ink-faint">
            {cart.delivery?.promiseHours
              ? hi
                ? `${cart.delivery.promiseHours} घंटे में डिलीवरी`
                : `Delivery in ${cart.delivery.promiseHours} hours`
              : null}
          </p>
        </div>
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
  autoComplete,
}: {
  name: string;
  label: string;
  hint?: string;
  required?: boolean;
  defaultValue?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-body3 text-ink-muted">
        {label}
        {required && <span className="text-error"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        required={required}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        className="mt-1 h-[var(--tap)] w-full rounded-box border border-hairline-strong bg-surface px-3 text-body1 text-ink focus:border-ink focus:outline-none"
      />
      {hint && <p className="mt-0.5 text-body5 text-ink-faint">{hint}</p>}
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'success' }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-muted">{label}</dt>
      <dd className={tone === 'success' ? 'text-success' : 'text-ink'}>{value}</dd>
    </div>
  );
}
