import type { Metadata } from 'next';
import { api } from '@/lib/api/server';
import { currentLocale } from '@/lib/locale';
import { currentLocation } from '@/lib/location';
import { currentCustomer } from '@/lib/session';
import { LocationPicker } from './location-picker';

export const metadata: Metadata = {
  title: 'Delivery area',
  robots: { index: false, follow: false },
};

/**
 * Choosing where the order is going.
 *
 * Deliberately a **page with its own URL**, not only a modal — a delivery
 * location is something people send each other, and a page can be linked.
 *
 * Two ways in, both of which end in a coordinate: the device's location, or a
 * saved address that already carries one. There is no pincode entry and no list
 * of areas to pick from; neither says where the customer actually is, and a
 * four-hour delivery to a plot with no street address needs the pin.
 */
export default async function LocationPage() {
  const [locale, location, customer] = await Promise.all([
    currentLocale(),
    currentLocation(),
    currentCustomer(),
  ]);

  const client = await api();
  const [checkout, addresses] = await Promise.all([
    /*
     * For the map's default centre and zoom. The owner sets these on the
     * checkout screen in the admin, and hard-coding Indore here would be a
     * second place to change on the day the shop opens a second city.
     */
    client.content.storefrontCheckout.query(),
    // Only for a signed-in customer; an anonymous visitor has no book, and
    // `myAddresses` would refuse them.
    customer ? client.storefront.myAddresses.query() : Promise.resolve([]),
  ]);

  return (
    <div className="page-w page-x py-8">
      <div className="mx-auto max-w-lg">
        <h1 className="text-heading2 text-ink">
          {locale === 'hi' ? 'हम कहाँ डिलीवर करें?' : 'Where should we deliver?'}
        </h1>
        <p className="mt-2 text-body2 text-ink-muted">
          {locale === 'hi'
            ? 'हमें आपकी सटीक जगह चाहिए — ताकि सामान सीधे आपके गेट पर पहुँचे, गली के आख़िर में नहीं।'
            : 'We need your exact spot so the load reaches your gate, not the end of the street.'}
        </p>

        <LocationPicker
          locale={locale}
          current={location}
          addresses={addresses}
          signedInPhone={customer?.phone ?? null}
          mapDefault={{
            lat: checkout.location.defaultLat,
            lng: checkout.location.defaultLng,
            zoom: checkout.location.defaultZoom,
          }}
        />
      </div>
    </div>
  );
}
