import Link from 'next/link';
import { User } from 'lucide-react';
import { categoryNav, publishedMenu, storeSettings } from '@/lib/api/server';
import { imageUrl, IMAGE } from '@/lib/media';
import { cartCount, currentCart } from '@/lib/cart';
import { currentCustomer } from '@/lib/session';
import { tr, type Locale } from '@/lib/i18n';
import { LocaleToggle } from './locale-toggle';
import { LocationButton } from './location-button';
import { MainNav } from './main-nav';
import { MobileMenu } from './mobile-menu';
import { MiniCart } from '@/components/cart/mini-cart';
import { SearchBox, type SearchCategory } from './search-box';
import { WalletPill } from './wallet-pill';

/**
 * The sticky header.
 *
 * Zepto's arrangement, because it solves the right problem: the **address and
 * ETA sit second from the left, before the search box** — in quick commerce
 * "where, and how fast" outranks "what" as a question, and burying it in a menu
 * is what makes a delivery site feel like a catalogue.
 *
 * Two rows on a phone rather than one. The search field needs the full width to
 * be tappable, and the alternative — collapsing it to a magnifier icon — hides
 * the single most-used control on the site behind a tap.
 *
 * The owner's menus hang off it at both sizes, and they are two separate menus
 * on purpose — `header` and `mobile` are distinct handles in the admin, because
 * a row that fits eight labels across a desktop is not the list you want on a
 * phone. A desktop gets `header` as a bar under this one; a phone gets `mobile`
 * in a side panel behind the mark left of the logo.
 */
export async function SiteHeader({ locale }: { locale: Locale }) {
  const [settings, cart, customer, headerMenu, mobileMenu, categories] = await Promise.all([
    storeSettings(),
    currentCart(),
    currentCustomer(),
    publishedMenu('header'),
    publishedMenu('mobile'),
    searchCategories(locale),
  ]);
  const count = cartCount(cart);
  const name = settings.store.nameEn;
  const nameHi = settings.store.nameHi;
  const promiseHours = settings.commerce.promiseHours;

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-surface print:hidden">
      <div className="page-w page-x">
        {/* --- row one: identity, location, search, actions --------------- */}
        <div className="flex h-[var(--header-h)] items-center gap-3">
          {/* Before the logo, and only on a phone: the desktop shows these
              links along the bar below rather than behind a tap. */}
          <MobileMenu items={mobileMenu.items} locale={locale} />

          <Link
            href="/"
            className="flex shrink-0 items-center gap-2"
            aria-label={tr(locale, 'header.home')}
          >
            <span className="grid size-9 place-items-center rounded-box bg-ink text-heading5 text-brand">
              B
            </span>
            <span className="hidden text-heading4 text-ink sm:block">
              {locale === 'hi' && nameHi ? nameHi : name}
            </span>
          </Link>

          {/*
            * The delivery promise, stated as a fact rather than a marketing
            * line. `promiseHours` is the owner's setting — if they change it to
            * six, the header says six.
            */}
          <LocationButton locale={locale} promiseHours={promiseHours} />

          <form
            action="/search"
            role="search"
            className="ml-auto hidden min-w-0 flex-1 md:block md:max-w-md"
          >
            <SearchBox categories={categories} locale={locale} />
          </form>

          <div className="ml-auto flex shrink-0 items-center gap-1 md:ml-0">
            <LocaleToggle locale={locale} />

            <WalletPill locale={locale} />

            {/* Icon-only on a phone, labelled from `md` up. Previously hidden
                below `md` altogether, which left no way to reach an account on
                the device almost every customer uses. */}
            {/* Signed in, the control is the account; signed out it is the way
                in. One slot either way, so the header does not reflow when a
                session appears. */}
            <Link
              href={customer ? '/account' : '/login'}
              aria-label={customer ? tr(locale, 'nav.account') : tr(locale, 'header.login')}
              className="inline-flex h-[var(--tap)] items-center gap-2 rounded-box px-2 text-cta2 text-ink hover:bg-surface-muted md:px-3"
            >
              <User className="size-5" aria-hidden />
              <span className="hidden md:inline">
                {customer
                  ? customer.name || `+91 ${customer.phone}`
                  : tr(locale, 'header.login')}
              </span>
            </Link>

            <MiniCart count={count} locale={locale} />
          </div>
        </div>

        {/* --- row two: search, on phones only ---------------------------- */}
        <form action="/search" role="search" className="pb-3 md:hidden">
          <SearchBox categories={categories} locale={locale} />
        </form>

        {/* --- row three: the owner's menu, on desktop only ---------------- */}
        <MainNav items={headerMenu.items} locale={locale} />
      </div>
    </header>
  );
}

/**
 * The categories behind the search box, or none.
 *
 * Swallowing, like `publishedMenu` and unlike `categoryNav` itself, which
 * throws. The search box is an enhancement: it rotates category names in the
 * placeholder and offers them on focus, and neither is worth taking the header
 * — and therefore every page on the site — down for. With an empty list the
 * box falls back to the static placeholder it always had.
 *
 * Flattened to roots only. A dropdown offering "Cement" and then "OPC Cement"
 * under it is answering a question the shopper has not asked yet; the category
 * page itself is where children belong.
 */
async function searchCategories(locale: Locale): Promise<SearchCategory[]> {
  try {
    const tree = await categoryNav();

    /*
     * Image URLs are resolved here, not in the search box.
     *
     * `lib/media.ts` is `server-only` — it needs the media config — so a Client
     * Component cannot turn an `imageKey` into a URL. The same reason
     * `/api/suggest` resolves its thumbnails before answering.
     */
    return await Promise.all(
      tree.slice(0, 8).map(async (category) => ({
        slug: category.slug,
        name: (locale === 'hi' && category.nameHi) || category.nameEn,
        productCount: category.productCount,
        imageSrc: await imageUrl(category.imageKey, IMAGE.tile),
      })),
    );
  } catch {
    return [];
  }
}
