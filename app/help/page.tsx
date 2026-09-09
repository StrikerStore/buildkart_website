import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, MessageCircle, MessageSquare, Package, Phone } from 'lucide-react';
import { api, storeSettings } from '@/lib/api/server';
import { currentLocale } from '@/lib/locale';

export const metadata: Metadata = {
  title: 'Help',
  description: 'Contact BuildKart, track an order, or read our delivery and returns policies.',
  alternates: { canonical: '/help' },
};

/**
 * Help.
 *
 * **Calling comes first, and everything else is below it.** For this audience
 * that is not a fallback — a thekedar with a question about whether the cement
 * is in stock picks up the phone, and a page that opens with a search box and a
 * contact form is a page that wastes their time before failing them.
 *
 * The policy list is whatever the owner has published in the admin. Nothing
 * here is hard-coded, which matters because those are the pages Razorpay asks
 * to see before approving a merchant account (PLAN.md §10) and their wording
 * will change without a deploy.
 */
export default async function HelpPage() {
  const [locale, settings, pages] = await Promise.all([
    currentLocale(),
    storeSettings(),
    api()
      .then((client) => client.content.publishedPages.query())
      // A shop with no pages yet still gets a working help screen — the phone
      // number is the part that matters.
      .catch(() => []),
  ]);

  const hi = locale === 'hi';
  const { store, commerce } = settings;
  const whatsapp = store.whatsappNumber.replace(/\D/g, '');

  return (
    <div className="page-w page-x py-6">
      <div className="mx-auto max-w-lg">
        <h1 className="text-heading2 text-ink">{hi ? 'मदद' : 'Help'}</h1>
        <p className="mt-1 text-body2 text-ink-muted">
          {hi
            ? 'सबसे तेज़ तरीक़ा — हमें सीधे कॉल करें।'
            : 'The fastest way to get an answer is to call us.'}
        </p>

        {/* --- talk to a person -------------------------------------------- */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {store.supportPhone && (
            <a
              href={`tel:${store.supportPhone}`}
              className="flex min-h-[64px] items-center gap-3 rounded-card border border-brand bg-brand-tint px-4 py-3 hover:bg-brand/20"
            >
              <Phone className="size-5 shrink-0 text-brand-text" aria-hidden />
              <span>
                <span className="block text-heading6 text-ink">{hi ? 'कॉल करें' : 'Call us'}</span>
                <span className="block text-body3 text-ink-muted">{store.supportPhone}</span>
              </span>
            </a>
          )}

          {whatsapp && (
            <a
              href={`https://wa.me/${whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[64px] items-center gap-3 rounded-card border border-hairline-strong bg-surface px-4 py-3 hover:bg-surface-muted"
            >
              <MessageCircle className="size-5 shrink-0 text-success" aria-hidden />
              <span>
                <span className="block text-heading6 text-ink">
                  {hi ? 'व्हाट्सएप करें' : 'WhatsApp us'}
                </span>
                <span className="block text-body3 text-ink-muted">
                  {hi ? 'फ़ोटो भेज सकते हैं' : 'Send a photo of what you need'}
                </span>
              </span>
            </a>
          )}
        </div>

        {/*
         * Chat sits below the phone and WhatsApp rather than beside them,
         * because the page's opening claim — that calling is fastest — is still
         * true. What chat adds is a written record the shop keeps, with the
         * customer's orders already attached to it.
         */}
        <Link
          href="/support"
          className="mt-3 flex min-h-[64px] items-center gap-3 rounded-card border border-hairline-strong bg-surface px-4 py-3 hover:bg-surface-muted"
        >
          <MessageSquare className="size-5 shrink-0 text-ink-muted" aria-hidden />
          <span className="flex-1">
            <span className="block text-heading6 text-ink">
              {hi ? 'हमसे चैट करें' : 'Chat with us'}
            </span>
            <span className="block text-body3 text-ink-muted">
              {hi ? 'सवाल पूछें, जवाब ऐप में ही मिलेगा' : 'Ask a question and we will reply here'}
            </span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-ink-faint" aria-hidden />
        </Link>

        {/* --- the two questions people actually arrive with ---------------- */}
        <section className="mt-6">
          <h2 className="mb-2 text-heading6 text-ink-muted">{hi ? 'आम सवाल' : 'Common questions'}</h2>

          <dl className="divide-y divide-hairline rounded-card border border-hairline bg-surface">
            <Faq
              q={hi ? 'डिलीवरी में कितना समय लगता है?' : 'How fast is delivery?'}
              a={
                hi
                  ? `सर्विस वाले इलाक़ों में ${commerce.promiseHours} घंटे में${commerce.cutoffTime ? `। ${commerce.cutoffTime} के बाद के ऑर्डर अगली सुबह पहुँचते हैं।` : '।'}`
                  : `${commerce.promiseHours} hours in the areas we cover${commerce.cutoffTime ? `. Orders after ${commerce.cutoffTime} arrive the next morning.` : '.'}`
              }
            />
            <Faq
              q={hi ? 'पेमेंट कैसे करें?' : 'How can I pay?'}
              a={
                commerce.codEnabled
                  ? hi
                    ? 'डिलीवरी के समय कैश दे सकते हैं। ऑनलाइन पेमेंट जल्द शुरू हो रहा है।'
                    : 'Cash on delivery is available today. Online payment is coming soon.'
                  : hi
                    ? 'पेमेंट के तरीक़ों के लिए हमें कॉल करें।'
                    : 'Call us to arrange payment for your order.'
              }
            />
            <Faq
              q={hi ? 'क्या मेरे इलाक़े में डिलीवरी है?' : 'Do you deliver to my area?'}
              a={
                hi
                  ? 'अपना पिनकोड डालकर देखें — अगर हम वहाँ नहीं पहुँचते तो नंबर छोड़ दें, शुरू होते ही बताएंगे।'
                  : 'Check your pincode. If we are not there yet, leave your number and we will tell you when we start.'
              }
              href="/location"
              cta={hi ? 'पिनकोड देखें' : 'Check pincode'}
            />
          </dl>
        </section>

        <Link
          href="/account/orders"
          className="mt-3 flex min-h-[var(--tap)] items-center gap-3 rounded-card border border-hairline bg-surface px-4 py-3 hover:bg-surface-muted"
        >
          <Package className="size-5 shrink-0 text-ink-muted" aria-hidden />
          <span className="flex-1 text-body1 text-ink">
            {hi ? 'अपना ऑर्डर देखें' : 'Track an order'}
          </span>
          <ChevronRight className="size-4 shrink-0 text-ink-faint" aria-hidden />
        </Link>

        {/* --- whatever the owner has published ----------------------------- */}
        {pages.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-2 text-heading6 text-ink-muted">
              {hi ? 'नियम और जानकारी' : 'Policies and information'}
            </h2>
            <ul className="divide-y divide-hairline rounded-card border border-hairline bg-surface">
              {pages.map((page) => (
                <li key={page.slug}>
                  <Link
                    href={`/pages/${page.slug}`}
                    className="flex min-h-[var(--tap)] items-center gap-3 px-4 py-3 hover:bg-surface-muted"
                  >
                    <span className="flex-1 text-body1 text-ink">
                      {(hi && page.titleHi) || page.titleEn}
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-ink-faint" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {store.addressLines.length > 0 && (
          <address className="mt-6 not-italic text-body3 text-ink-muted">
            <span className="block text-heading6 text-ink">{store.nameEn}</span>
            {store.addressLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
            {store.gstin && <span className="mt-1 block text-ink-faint">GSTIN {store.gstin}</span>}
          </address>
        )}
      </div>
    </div>
  );
}

function Faq({ q, a, href, cta }: { q: string; a: string; href?: string; cta?: string }) {
  return (
    <div className="px-4 py-3">
      <dt className="text-heading6 text-ink">{q}</dt>
      <dd className="mt-1 text-body2 text-ink-muted">
        {a}
        {href && cta && (
          <>
            {' '}
            <Link href={href} className="text-brand-text underline">
              {cta}
            </Link>
          </>
        )}
      </dd>
    </div>
  );
}
