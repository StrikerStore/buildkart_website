import { api, storeSettings } from '@/lib/api/server';
import { currentLocale } from '@/lib/locale';
import { siteUrl } from '@/lib/site';
import { Hero } from '@/components/home/hero';
import { HomepageSections } from '@/components/home/homepage-sections';

/**
 * The home page.
 *
 * It contains no merchandising decisions and, since the trust strip became a
 * section, no structural ones either. The banners, the bands, their order and
 * their contents all come from `storefront.home`, which resolves whatever the
 * owner arranged in the admin — that split between a theme and a store is the
 * whole design, and it is the same one Shopify draws.
 *
 * Dynamic, not cached. Every render reads the locale, the delivery area and the
 * cart from cookies — the header pill and each card's ADD button depend on
 * them — so a cached HTML page would serve one shopper's cart to the next.
 */
export const metadata = { alternates: { canonical: '/' } };

export default async function HomePage() {
  const [locale, home, settings] = await Promise.all([
    currentLocale(),
    api().then((c) => c.storefront.home.query()),
    storeSettings(),
  ]);

  const { store } = settings;

  return (
    <>
      <Hero banners={home.hero} locale={locale} />
      <HomepageSections sections={home.sections} locale={locale} />

      {/*
        * Who this shop is, in the form a search engine reads.
        *
        * `Store` rather than `Organization`: it sells to the public from a
        * known address, and the phone number here is the one Google puts in a
        * knowledge panel — which for a business whose customers ring before
        * ordering is the most valuable thing on this page.
        *
        * Every field comes from settings, so a changed number is a changed
        * panel without a deploy.
        */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Store',
            name: store.nameEn,
            url: siteUrl(),
            ...(store.supportPhone ? { telephone: store.supportPhone } : {}),
            ...(store.supportEmail ? { email: store.supportEmail } : {}),
            ...(store.addressLines.length > 0
              ? {
                  address: {
                    '@type': 'PostalAddress',
                    streetAddress: store.addressLines.join(', '),
                    addressCountry: 'IN',
                  },
                }
              : {}),
            ...(store.gstin ? { taxID: store.gstin } : {}),
          }),
        }}
      />
    </>
  );
}
