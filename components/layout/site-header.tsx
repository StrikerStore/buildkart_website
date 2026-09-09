import Link from 'next/link';
import { Search, User } from 'lucide-react';
import { publishedMenu, storeSettings } from '@/lib/api/server';
import { cartCount, currentCart } from '@/lib/cart';
import { currentCustomer } from '@/lib/session';
import { tr, type Locale } from '@/lib/i18n';
import { LocaleToggle } from './locale-toggle';
import { LocationButton } from './location-button';
import { MainNav } from './main-nav';
import { MobileMenu } from './mobile-menu';
import { MiniCart } from '@/components/cart/mini-cart';
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
  const [settings, cart, customer, headerMenu, mobileMenu] = await Promise.all([
    storeSettings(),
    currentCart(),
    currentCustomer(),
    publishedMenu('header'),
    publishedMenu('mobile'),
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
            <SearchField locale={locale} />
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
          <SearchField locale={locale} />
        </form>

        {/* --- row three: the owner's menu, on desktop only ---------------- */}
        <MainNav items={headerMenu.items} locale={locale} />
      </div>
    </header>
  );
}

/**
 * A GET form, not a controlled input.
 *
 * Submitting navigates to `/search?q=…`, which means the results page is a real
 * URL: shareable over WhatsApp, back-button-able, and rendered on the server.
 * An input that filters a client-side list would be none of those.
 */
function SearchField({ locale }: { locale: Locale }) {
  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-ink-faint"
        aria-hidden
      />
      <input
        type="search"
        name="q"
        autoComplete="off"
        placeholder={tr(locale, 'header.searchPlaceholder')}
        aria-label={tr(locale, 'header.search')}
        className="h-[var(--tap)] w-full rounded-box border border-hairline-strong bg-surface-warm pl-11 pr-3 text-body1 text-ink placeholder:text-ink-faint focus:border-ink focus:bg-surface focus:outline-none"
      />
    </div>
  );
}
