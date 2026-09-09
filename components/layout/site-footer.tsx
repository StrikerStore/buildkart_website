import Link from 'next/link';
import { MessageCircle, MessageSquare, Phone } from 'lucide-react';
import { api, storeSettings } from '@/lib/api/server';
import { tr, type Locale } from '@/lib/i18n';
import { FooterFold } from './footer-fold';

/**
 * The footer.
 *
 * Its link list is **not** hard-coded: it renders the `footer` menu the owner
 * builds in the admin, which is why `content.publishedMenu` exists. Policies,
 * About and Contact are `Page` rows — the ones Razorpay asks to see before it
 * approves a merchant account (PLAN.md §10) — so they have to be editable
 * without a deploy.
 *
 * A missing menu is not an error. The store may not have one yet, and a footer
 * that throws would take every page down with it; the contact block below is
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

  return (
    <footer className="mt-10 border-t border-hairline bg-surface print:hidden">
      {/* No vertical padding on a phone: collapsed, the fold's own summary row
          is the entire footer, and container padding under it would leave a
          band of empty surface below a closed strip. The body carries its own
          bottom padding for when it is open. */}
      <div className="page-w page-x md:py-8">
        <FooterFold name={name} locale={locale}>
          <div className="grid gap-8 md:grid-cols-[1fr_2fr]">
            {/* --- contact: the half this audience uses --------------------- */}
            <div>
              {/*
               * Hidden on a phone because the fold's own summary row is already
               * showing it — `hidden` is `display: none`, so exactly one of the
               * two is in the accessibility tree at any width rather than the
               * name being announced twice.
               */}
              <h2 className="hidden text-heading4 text-ink md:block">{name}</h2>

              {store.addressLines.length > 0 && (
                <address className="mt-2 not-italic text-body3 text-ink-muted">
                  {store.addressLines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </address>
              )}

              {store.gstin && (
                <p className="mt-2 text-body4 text-ink-faint">
                  {tr(locale, 'footer.gstin')}: {store.gstin}
                </p>
              )}

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
                {store.whatsappNumber && (
                  <a
                    href={`https://wa.me/${store.whatsappNumber.replace(/\D/g, '')}`}
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

            {/* --- the owner's menu ----------------------------------------- */}
            {menu && menu.items.length > 0 && (
              <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
                {/* Keyed on the URL: `getPublishedMenu` projects label and url
                  only, with no id, and a menu cannot hold the same destination
                  twice without being a mistake in its own right. */}
                {menu.items.map((item) => (
                  <Link
                    key={item.url}
                    href={item.url}
                    className="py-1 text-body2 text-ink-muted hover:text-ink"
                  >
                    {locale === 'hi' && item.labelHi ? item.labelHi : item.labelEn}
                  </Link>
                ))}
              </nav>
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
