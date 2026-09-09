import type { Metadata, Viewport } from 'next';
import { Noto_Sans_Devanagari } from 'next/font/google';
import { announcementBar, api, storeSettings } from '@/lib/api/server';
import { cartCount, currentCart } from '@/lib/cart';
import { currentLocale, htmlLang } from '@/lib/locale';
import { currentLocation } from '@/lib/location';
import { siteUrl } from '@/lib/site';
import { BrandTagline } from '@/components/layout/brand-tagline';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { AnnouncementBar } from '@/components/layout/announcement-bar';
import { CartBar } from '@/components/cart/cart-bar';
import { LocationProvider } from '@/components/location/location-provider';
import './globals.css';

/*
 * Devanagari only.
 *
 * Latin is Okra with Helvetica behind it — see `--font-sans` in globals.css.
 * Neither carries a single Devanagari glyph, so Hindi still needs a face of its
 * own, and Noto Sans Devanagari is the one that was already here.
 *
 * The Latin Noto Sans that used to sit beside it is **gone on purpose**: once
 * `--font-sans` stopped naming it, it was five weights downloaded on every
 * first visit and used by nothing. On the connection this shop's customers
 * actually have, an unused webfont is the most expensive kind of dead code.
 */
const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-devanagari',
  display: 'swap',
});

/**
 * The site's metadata, read from the database.
 *
 * Title, template, description and whether the site may be indexed at all are
 * the owner's, set on the SEO screen in the admin. A hard-coded title here
 * would quietly outrank whatever they typed, and `robotsIndexable` would have
 * nothing to switch — which is the setting a shop needs while it is still
 * entering its catalogue.
 *
 * `metadataBase` is what makes every relative `canonical` and OG image on every
 * page resolve to an absolute URL. Without it Next emits relative canonicals,
 * which some crawlers ignore and others resolve against the wrong origin.
 */
export async function generateMetadata(): Promise<Metadata> {
  const [settings, locale, seo] = await Promise.all([
    storeSettings(),
    currentLocale(),
    api()
      .then((client) => client.content.seoDefaults.query())
      .catch(() => null),
  ]);

  const name = settings.store.nameEn || 'BuildKart';
  const hi = locale === 'hi';

  const homeTitle =
    (hi ? seo?.homeTitleHi : seo?.homeTitleEn) || (hi ? seo?.homeTitleEn : '') || name;

  const description =
    (hi ? seo?.homeDescriptionHi : seo?.homeDescriptionEn) ||
    seo?.homeDescriptionEn ||
    `Cement, sariya, plywood and more — delivered to your site in ${settings.commerce.promiseHours} hours.`;

  return {
    metadataBase: new URL(siteUrl()),
    title: {
      default: homeTitle,
      // The owner's template, with `%s` standing in for the page's own title.
      template: seo?.titleTemplate?.includes('%s') ? seo.titleTemplate : `%s · ${name}`,
    },
    description,
    applicationName: name,
    formatDetection: { telephone: true },
    // One switch closes the whole site to crawlers while the catalogue is
    // still being entered.
    ...(seo && !seo.robotsIndexable ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      type: 'website',
      siteName: name,
      title: homeTitle,
      description,
      locale: hi ? 'hi_IN' : 'en_IN',
    },
    twitter: { card: 'summary_large_image', title: homeTitle, description },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  /*
   * No `maximumScale`. Locking zoom on a site whose audience is often reading
   * a 12px unit label in daylight on a building site is a genuine
   * accessibility failure, and it buys nothing.
   */
  themeColor: '#2d333a',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [locale, cart, location, announcements] = await Promise.all([
    currentLocale(),
    currentCart(),
    currentLocation(),
    announcementBar(),
  ]);

  return (
    <html lang={htmlLang(locale)} className={notoDevanagari.variable}>
      <body className="min-h-screen antialiased">
        {/*
          * The first thing in the tab order, visible only when focused. A
          * keyboard user should not have to tab through the category strip and
          * every filter to reach the products.
          */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-box focus:bg-ink focus:px-4 focus:py-2 focus:text-cta2 focus:text-ink-inverted"
        >
          {locale === 'hi' ? 'सीधे सामान पर जाएँ' : 'Skip to content'}
        </a>

        {/*
          * Wraps everything so the header's pill, the cart and checkout can all
          * open the same location sheet without a navigation — and so a first
          * visit with no area set is asked once, up front, the way every quick
          * commerce app does it.
          */}
        <LocationProvider locale={locale} hasLocation={location !== null}>
          {/* Above the header and outside it: the header is the sticky part,
              and the strip should scroll away once it has been read. */}
          <AnnouncementBar bar={announcements} locale={locale} />

          <SiteHeader locale={locale} />

          {/* `pb-24 md:pb-0` leaves room for the mobile cart bar, which is fixed
              and would otherwise sit on top of the last row of any page. */}
          <main id="main" className="pb-24 md:pb-0">
            {children}
          </main>

          {/* Closes every page, above the footer rather than inside it: the
              footer is a list of links and this is the shop signing off. */}
          <BrandTagline locale={locale} />
          <SiteFooter locale={locale} />
          <CartBar count={cartCount(cart)} locale={locale} />
        </LocationProvider>
      </body>
    </html>
  );
}
