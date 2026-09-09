import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { api, storeSettings } from '@/lib/api/server';
import { invoiceVerifyUrl, qrSvg } from '@/lib/invoice';
import { currentLocale } from '@/lib/locale';
import { InvoiceDocument } from '@/components/invoice/invoice-document';
import { PrintInvoice } from './print-button';

export const metadata: Metadata = {
  title: 'Tax invoice',
  // Nobody's invoice belongs in a search index, and this one is behind a
  // session anyway — but saying so costs a line and covers a misconfiguration.
  robots: { index: false, follow: false },
};

/**
 * The customer's own copy of a delivered order's tax invoice.
 *
 * A **page**, not a download endpoint. It can be read, bookmarked, sent to an
 * accountant, and saved as a PDF from the print dialog — `print-button.tsx`
 * says why that is the right pipeline for a bilingual shop rather than a
 * generated file, and the `@media print` block in `globals.css` is what makes
 * the result a document rather than a screenshot of the website.
 *
 * The document itself lives in `InvoiceDocument`, shared with the public
 * `/invoice/<token>` route the QR opens, so the two cannot disagree.
 *
 * 404 covers three cases at once — not yours, does not exist, not yet delivered
 * — because `getMyInvoice` folds them together on purpose.
 */
export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [locale, invoice, settings] = await Promise.all([
    currentLocale(),
    api().then((client) => client.storefront.myInvoice.query({ id })),
    storeSettings(),
  ]);

  if (!invoice) notFound();

  const hi = locale === 'hi';
  const verifyUrl = invoiceVerifyUrl(invoice.verifyToken);
  const qr = await qrSvg(verifyUrl);

  return (
    <div className="page-w page-x py-5">
      {/* Screen furniture. None of it prints. */}
      <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
        <Link
          href={`/account/orders/${invoice.orderId}`}
          className="inline-flex items-center gap-1 text-cta3 text-brand-text hover:underline"
        >
          <ChevronLeft className="size-4" aria-hidden />
          {hi ? 'ऑर्डर पर वापस' : 'Back to order'}
        </Link>
        <PrintInvoice locale={locale} />
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
