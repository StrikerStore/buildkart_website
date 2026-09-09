import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api/server';
import { pricedCart } from '@/lib/cart';
import { currentLocale } from '@/lib/locale';
import { currentLocation } from '@/lib/location';
import { currentCustomer } from '@/lib/session';
import { CheckoutForm } from './checkout-form';

export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false, follow: false },
};

/**
 * Checkout.
 *
 * Four things must be true to be here, and each sends you somewhere different
 * rather than showing a form that cannot be submitted: signed in, a cart with
 * something in it, a delivery area chosen, and an order over the minimum. The
 * checks run on the server, so none of them can be skipped by arriving at the
 * URL directly.
 */
export default async function CheckoutPage() {
  const [locale, customer, cart, area] = await Promise.all([
    currentLocale(),
    currentCustomer(),
    pricedCart(),
    // The pin captured at the location step, if they shared one. Read from the
    // cookie rather than the priced cart: `priceCart` takes a pincode and knows
    // nothing about coordinates, and it should stay that way.
    currentLocation(),
  ]);

  if (!customer) redirect('/login?next=%2Fcheckout');
  if (cart.lines.length === 0) redirect('/cart');
  // No area means nothing was priced for delivery; the picker is the fix.
  if (!cart.delivery?.serviced) redirect('/location');
  if (!cart.meetsMinimum) redirect('/cart');

  const client = await api();
  const [checkout, addresses, profile] = await Promise.all([
    client.content.storefrontCheckout.query(),
    client.storefront.myAddresses.query(),
    client.storefront.myProfile.query(),
  ]);

  /*
   * Whether to ask for a GST number, per the shop's own checkout settings.
   *
   * The rest of this form is hand-built rather than generated from the field
   * catalogue, and honestly so — a locked pincode and a map picker are not a
   * list of text inputs. But GSTIN *is* just a text input, the admin already
   * has a switch for it, and ignoring that switch would make the setting a lie.
   */
  const askGstin = checkout.fields.find((field) => field.key === 'gstin')?.visible ?? false;

  return (
    <div className="page-w page-x py-5">
      <h1 className="mb-4 text-heading3 text-ink sm:text-heading2">
        {locale === 'hi' ? 'ऑर्डर पूरा करें' : 'Checkout'}
      </h1>

      <CheckoutForm
        cart={cart}
        methods={checkout.methods.map((method) => ({
          provider: method.provider,
          label: method.label,
        }))}
        locale={locale}
        defaultName={customer.name}
        pincode={cart.delivery.pincode}
        addresses={addresses}
        areaPin={
          area?.latitude && area.longitude
            ? { lat: Number(area.latitude), lng: Number(area.longitude) }
            : null
        }
        mapDefault={{
          lat: checkout.location.defaultLat,
          lng: checkout.location.defaultLng,
          zoom: checkout.location.defaultZoom,
        }}
        area={{
          // The cart's own area is authoritative for the city; the cookie
          // carries the state, which no serviceable-area row holds.
          city: cart.delivery.city ?? area?.city ?? '',
          state: area?.state ?? '',
          label: area?.formatted ?? cart.delivery.areaName ?? null,
        }}
        askGstin={askGstin}
        defaultGstin={profile?.gstin ?? null}
      />
    </div>
  );
}
