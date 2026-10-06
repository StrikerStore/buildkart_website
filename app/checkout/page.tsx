import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { api, storeSettings } from '@/lib/api/server';
import { mapDefaultFrom } from '@/lib/location-shared';
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
export default async function CheckoutPage({
  searchParams,
}: {
  /** Set by the PayU return route when a payment did not become an order. */
  searchParams: Promise<{ payment?: string; reason?: string }>;
}) {
  const [{ payment, reason }, locale, customer, cart, area] = await Promise.all([
    searchParams,
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
  const [checkout, addresses, profile, wallet, savedCards, settings] = await Promise.all([
    client.content.storefrontCheckout.query(),
    client.storefront.myAddresses.query(),
    client.storefront.myProfile.query(),
    // A wallet that fails to load hides the option; it must not stop checkout.
    client.storefront.wallet.query().catch(() => null),
    // Saved cards are a shortcut; a gateway that is down only hides them.
    client.storefront.savedCards.query().catch(() => []),
    storeSettings(),
  ]);

  const cod = checkout.methods.find((method) => method.provider === 'COD');

  /*
   * Back from PayU without an order. The reason is PayU's or ours, passed
   * through the URL — shown as text, never as markup, and capped so a crafted
   * link cannot fill the page.
   */
  const paymentNotice =
    payment === 'failed' || payment === 'refunded' || payment === 'pending'
      ? (reason?.slice(0, 300) ??
        (locale === 'hi'
          ? 'भुगतान पूरा नहीं हुआ। आपका कार्ट सुरक्षित है।'
          : 'Payment was not completed. Your cart is safe.'))
      : null;

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
        paymentOptions={checkout.paymentOptions}
        savedCards={savedCards}
        cod={cod ? { label: cod.label, maxOrderValue: cod.maxOrderValue } : null}
        storeName={settings.store.nameEn || 'BuildKart'}
        paymentNotice={paymentNotice}
        locale={locale}
        defaultName={customer.name}
        pincode={cart.delivery.pincode}
        addresses={addresses}
        areaPin={
          area?.latitude && area.longitude
            ? { lat: Number(area.latitude), lng: Number(area.longitude) }
            : null
        }
        mapDefault={mapDefaultFrom(checkout.location)}
        area={{
          // The cart's own area is authoritative for the city; the cookie
          // carries the state, which no serviceable-area row holds.
          city: cart.delivery.city ?? area?.city ?? '',
          state: area?.state ?? '',
          label: area?.formatted ?? cart.delivery.areaName ?? null,
        }}
        askGstin={askGstin}
        defaultGstin={profile?.gstin ?? null}
        wallet={wallet}
      />
    </div>
  );
}
