import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api/server';
import { currentLocale } from '@/lib/locale';
import { currentCustomer } from '@/lib/session';
import { AddressBook } from '@/components/account/address-book';

export const metadata: Metadata = {
  title: 'Addresses',
  robots: { index: false, follow: false },
};

/**
 * The address book.
 *
 * A list rather than a single address, because a contractor works several sites
 * at once — "Sector 3 plot" and "the godown" are both real destinations in the
 * same week, and each carries its own pin.
 */
export default async function AddressesPage() {
  const [locale, customer] = await Promise.all([currentLocale(), currentCustomer()]);
  if (!customer) redirect('/login?next=%2Faccount%2Faddresses');

  const client = await api();
  const [addresses, checkout] = await Promise.all([
    client.storefront.myAddresses.query(),
    // The map's default centre, for an address being added from scratch.
    client.content.storefrontCheckout.query(),
  ]);
  const hi = locale === 'hi';

  return (
    <div className="page-w page-x py-6">
      <div className="mx-auto max-w-lg">
        <h1 className="text-heading2 text-ink">{hi ? 'पते' : 'Addresses'}</h1>
        <p className="mt-1 text-body2 text-ink-muted">
          {hi
            ? 'हर साइट का अलग पता सेव करें — ऑर्डर करना तेज़ हो जाएगा।'
            : 'Save each site separately and checkout becomes two taps.'}
        </p>

        <div className="mt-5">
          <AddressBook
            addresses={addresses}
            locale={locale}
            mapDefault={{
              lat: checkout.location.defaultLat,
              lng: checkout.location.defaultLng,
              zoom: checkout.location.defaultZoom,
            }}
          />
        </div>
      </div>
    </div>
  );
}
