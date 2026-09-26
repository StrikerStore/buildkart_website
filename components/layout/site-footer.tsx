import Link from 'next/link';
import { MessageCircle, MessageSquare, Phone } from 'lucide-react';
import { whatsappHref } from '@StrikerStore/contract';
import { api, storeSettings } from '@/lib/api/server';
import { tr, type Locale } from '@/lib/i18n';
import { FooterFold } from './footer-fold';

/** One column of the footer: a title, optionally a link of its own, and links under it. */
type Column = {
  title: string | null;
  /** Set when the title is itself a link — a group title (`HEADING`) has no href. */
  titleHref: string | null;
  links: Array<{ label: string; url: string }>;
};

/**
 * The footer.
 *
 * Its link list is **not** hard-coded: it renders the `footer` menu the owner
 * builds in the admin, which is why `content.publishedMenu` exists. Policies,
 * About and Contact are `Page` rows — the ones Razorpay asks to see before it
 * approves a merchant account (PLAN.md §10) — so they have to be editable
 * without a deploy.
 *
 * **The menu's shape is the footer's shape.** A top-level row with children —
 * or one saved as a group title — is a titled column: "Company", "Policy". A
 * top-level row on its own is a plain link, and a run of them shares one
 * untitled column rather than each claiming a column of its own, which is what
 * a footer of four loose policy links would otherwise turn into. That is the
 * whole layout rule, and it is why the owner rearranges the footer's columns in
 * the menu builder without anyone touching this file.
 *
 * A missing menu is not an error. The store may not have one yet, and a footer
 * that throws would take every page down with it; the contact column below is
 * the part that actually matters to this audience and it comes from settings.
 *
 * Everything below the store name is folded away on a phone — see `FooterFold`,
 * which takes it as children so this stays a server component and keeps doing
 * its own fetching.
 */
export async function SiteFooter({ locale }: { locale: Locale }) {
  const [settings, menu] = await Promise.all([
    storeSettings(),
    api()
      .then((client) => client.content.publishedMenu.query({ handle: 'footer' }))
      .catch(() => null),
  ]);

  const { store } = settings;
  const name = (locale === 'hi' && store.nameHi) || store.nameEn;
  const year = new Date().getFullYear();

  const label = (item: { labelEn: string; labelHi: string | null }) =>
    locale === 'hi' && item.labelHi ? item.labelHi : item.labelEn;

  /*
   * Fold the flat menu into columns in one pass, keeping the owner's order.
   *
   * `loose` is the untitled column currently being filled. It is dropped when a
   * titled column interrupts, so loose links on either side of a group stay on
   * their own side of it rather than collecting together at the front.
   */
  const columns: Column[] = [];
  let loose: Column | null = null;

  for (const item of menu?.items ?? []) {
    const isColumn = item.isHeading || item.children.length > 0;

    if (isColumn) {
      loose = null;
      columns.push({
        title: label(item),
        titleHref: item.isHeading ? null : item.url,
        links: item.children.map((child) => ({ label: label(child), url: child.url })),
      });
      continue;
    }

    if (!loose) {
      loose = { title: null, titleHref: null, links: [] };
      columns.push(loose);
    }
    loose.links.push({ label: label(item), url: item.url });
  }

  const hasContact =
    Boolean(store.supportEmail) || Boolean(store.supportPhone) || store.addressLines.length > 0;
  const whatsapp = whatsappHref(store.whatsappNumber);

  return (
    <footer className="mt-10 border-t border-hairline bg-surface print:hidden">
      {/* No vertical padding on a phone: collapsed, the fold's own summary row
          is the entire footer, and container padding under it would leave a
          band of empty surface below a closed strip. The body carries its own
          bottom padding for when it is open. */}
      <div className="page-w page-x md:py-8">
        <FooterFold name={name} locale={locale}>
          {/*
           * One grid for everything — brand, the owner's columns, contact — so
           * every column sits on the same baseline, instead of the menu being a
           * block nested inside a two-up split. Four across is the shape a
           * footer of brand + two groups + contact wants; more groups than that
           * wrap onto a second row rather than squeezing.
           */}
          <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {/* --- brand, and the ways to reach a person -------------------- */}
            <div className="min-w-0">
              {/*
               * Hidden on a phone because the fold's own summary row is already
               * showing it — `hidden` is `display: none`, so exactly one of the
               * two is in the accessibility tree at any width rather than the
               * name being announced twice.
               */}
              <h2 className="hidden md:block">
                {/* The logo carries the heading; its alt is the heading's text. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brand/logo.png"
                  alt={name}
                  width={318}
                  height={96}
                  loading="lazy"
                  className="h-10 w-auto"
                />
              </h2>

              {/*
               * `tel:` and `wa.me` are still here, and still first: a thekedar
               * with a question calls, and a form that promises a reply in two
               * days is not an answer to "is the cement in stock".
               *
               * Chat sits beside them rather than replacing them, because it is
               * the only one of the three where the shop keeps the conversation
               * — with the customer's orders already beside it. The phone stays
               * for the person who will always rather phone.
               */}
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/support"
                  className="inline-flex h-[var(--tap)] items-center gap-2 rounded-box border border-hairline-strong px-4 text-cta2 text-ink hover:bg-surface-muted"
                >
                  <MessageSquare className="size-4" aria-hidden />
                  {tr(locale, 'footer.support')}
                </Link>

                {store.supportPhone && (
                  <a
                    href={`tel:${store.supportPhone}`}
                    className="inline-flex h-[var(--tap)] items-center gap-2 rounded-box border border-hairline-strong px-4 text-cta2 text-ink hover:bg-surface-muted"
                  >
                    <Phone className="size-4" aria-hidden />
                    {tr(locale, 'footer.callUs')}
                  </a>
                )}
                {whatsapp && (
                  <a
                    href={whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-[var(--tap)] items-center gap-2 rounded-box border border-hairline-strong px-4 text-cta2 text-ink hover:bg-surface-muted"
                  >
                    <MessageCircle className="size-4" aria-hidden />
                    {tr(locale, 'footer.whatsapp')}
                  </a>
                )}
              </div>
            </div>

            {/* --- the owner's menu, one column per group -------------------- */}
            {columns.map((column, index) => (
              /*
               * Keyed by position, not by title: an untitled column has none to
               * key on. Nothing here reorders on the client, so the index is a
               * stable identity for the life of the render.
               */
              <nav
                key={index}
                aria-label={column.title ?? tr(locale, 'footer.links')}
                className="min-w-0"
              >
                {column.title &&
                  (column.titleHref ? (
                    <Link
                      href={column.titleHref}
                      className="block text-heading6 text-ink hover:underline"
                    >
                      {column.title}
                    </Link>
                  ) : (
                    <h3 className="text-heading6 text-ink">{column.title}</h3>
                  ))}

                {/*
                 * An untitled column doubles up on a phone. Four loose policy
                 * links stacked one per row is most of a small screen for what
                 * is, to this shopper, fine print; under a title the same
                 * pairing would instead read as two columns sharing a heading.
                 */}
                <ul
                  className={
                    column.title
                      ? 'mt-3 flex flex-col gap-2'
                      : 'grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-1'
                  }
                >
                  {column.links.map((link) => (
                    <li key={link.url}>
                      <Link
                        href={link.url}
                        className="block py-1 text-body2 text-ink-muted hover:text-ink"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}

            {/* --- contact, as its own column -------------------------------- */}
            {hasContact && (
              <div className="min-w-0">
                <h3 className="text-heading6 text-ink">{tr(locale, 'footer.contact')}</h3>

                <div className="mt-3 flex flex-col gap-3 text-body3 text-ink-muted">
                  {store.supportEmail && (
                    <p>
                      <span className="text-ink">{tr(locale, 'footer.email')}: </span>
                      {/* A `mailto:` rather than plain text: this column is read
                          on a phone, where "copy the address by hand" is not a
                          step anyone finishes. */}
                      <a
                        href={`mailto:${store.supportEmail}`}
                        className="break-words hover:text-ink"
                      >
                        {store.supportEmail}
                      </a>
                    </p>
                  )}

                  {store.supportPhone && (
                    <p>
                      <span className="text-ink">{tr(locale, 'footer.phone')}: </span>
                      <a href={`tel:${store.supportPhone}`} className="hover:text-ink">
                        {store.supportPhone}
                      </a>
                    </p>
                  )}

                  {store.addressLines.length > 0 && (
                    <div>
                      <span className="text-ink">{tr(locale, 'footer.address')}:</span>
                      <address className="mt-1 not-italic">
                        {store.addressLines.map((line) => (
                          <span key={line} className="block">
                            {line}
                          </span>
                        ))}
                      </address>
                    </div>
                  )}

                  {store.gstin && (
                    <p className="text-body4 text-ink-faint">
                      {tr(locale, 'footer.gstin')}: {store.gstin}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <p className="mt-8 border-t border-hairline pt-4 text-body4 text-ink-faint">
            © {year} {name}. {tr(locale, 'footer.rights')}
          </p>
        </FooterFold>
      </div>
    </footer>
  );
}
