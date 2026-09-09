import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { api, storeSettings } from '@/lib/api/server';
import { invoiceVerifyUrl, qrSvg } from '@/lib/invoice';
import { currentLocale } from '@/lib/locale';
import { InvoiceDocument } from '@/components/invoice/invoice-document';

export const metadata: Metadata = {
  title: 'Verify invoice',
  /*
   * Never indexed. The token is unguessable, but a crawler that reached one
   * would put a customer's name, address and order total in a search result —
   * and `noindex` is the difference between "hard to find" and "published".
   */
  robots: { index: false, follow: false, nocache: true },
};

type Props = { params: Promise<{ token: string }> };

/**
 * An invoice, opened by scanning the QR printed on it.
 *
 * **Public on purpose.** The person checking a supplier's paperwork is an
 * accountant, a site supervisor or the shop itself — not the customer, and not
 * signed in. An invoice only its buyer can verify verifies nothing.
 *
 * What makes that safe is the token rather than a session: an HMAC the server
 * alone can produce, authorising exactly one delivered invoice and nothing
 * else. See `core/src/read/invoice-token.ts`.
 *
 * A forged, edited or expired-looking token is a 404 — identical to an order
 * that does not exist, so probing tells an attacker nothing.
 */
export default async function VerifyInvoicePage({ params }: Props) {
  const { token } = await params;

  const [locale, invoice, settings] = await Promise.all([
    currentLocale(),
    api().then((client) => client.storefront.invoiceByToken.query({ token })),
    storeSettings(),
  ]);

  if (!invoice) notFound();

  const hi = locale === 'hi';
  const verifyUrl = invoiceVerifyUrl(invoice.verifyToken);
  const qr = await qrSvg(verifyUrl);

  return (
    <div className="page-w page-x py-5">
      {/*
        * The banner is the whole reason this route is separate from the
        * customer's own copy: somebody arriving here has a piece of paper in
        * their hand and one question — is this real? The answer belongs above
        * the document, not inside it.
        */}
      <div className="mb-4 flex items-start gap-3 rounded-card border border-success/25 bg-success-bg p-4 print:hidden">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-success-fg" aria-hidden />
        <div>
          <p className="text-heading5 text-success-fg">
            {hi ? 'यह बिल असली है' : 'This invoice is genuine'}
          </p>
          <p className="mt-0.5 text-body3 text-ink">
            {hi
              ? `${(hi && settings.store.nameHi) || settings.store.nameEn} के रिकॉर्ड से सीधे दिखाया गया है। कागज़ पर कुछ और लिखा हो तो नीचे वाला सही है।`
              : `Shown straight from ${settings.store.nameEn}’s own records. If the printed copy differs from what is below, the copy below is what was issued.`}
          </p>
        </div>
      </div>

      <InvoiceDocument
        invoice={invoice}
        store={settings.store}
        qr={qr}
        locale={locale}
      />
    </div>
  );
}
