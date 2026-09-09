import { formatINR, splitGst, type MyInvoiceDto } from '@buildkart/contract';
import type { SettingValue } from '@buildkart/contract';
import type { Locale } from '@/lib/i18n';

/** dd/mm/yyyy — how a date is written on a document in India. */
function inDate(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/**
 * The tax invoice itself, and the only copy of it.
 *
 * Rendered by two routes: the customer's own `/account/orders/…/invoice`, and
 * the public `/invoice/<token>` that the QR code opens. One component because
 * the entire promise of that QR is that the two agree — a second implementation
 * would be a second set of figures to drift, which is exactly the thing the
 * code is meant to rule out.
 *
 * Every figure is the frozen copy written with the order. Nothing is recomputed
 * from the catalogue, and nothing is recomputed from the other figures on the
 * page: the read hands over the taxable value and the tax that were actually
 * charged, and this file only splits the tax into CGST/SGST or IGST for
 * display. A reprint next year agrees with the copy that went out with the
 * goods, to the paisa.
 */
export function InvoiceDocument({
  invoice,
  store,
  qr,
  locale,
}: {
  invoice: MyInvoiceDto;
  store: SettingValue<'store.profile'>;
  /**
   * The QR, pre-rendered to SVG on the server so it survives into the print.
   *
   * The URL it encodes is deliberately **not** printed beside it. A signed
   * token is 48 characters of base64 that nobody types and nobody reads, and
   * on paper it looked like a stray file path — noise on a document whose
   * whole job is to be trusted at a glance. The code carries it; the caption
   * says what scanning it does.
   */
  qr: string;
  locale: Locale;
}) {
  const hi = locale === 'hi';
  const seller = (hi && store.nameHi) || store.nameEn;
  const totalTax = splitGst(invoice.taxTotal, invoice.taxIntraState);
  const showHsn = invoice.items.some((item) => item.hsnCode);

  return (
    <article className="rounded-card border border-hairline bg-surface p-5 print:rounded-none print:border-0 print:p-0">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <h1 className="text-heading3 text-ink">{hi ? 'टैक्स इनवॉइस' : 'Tax invoice'}</h1>
          <p className="mt-1 text-body3 text-ink-muted">
            {hi ? 'ऑर्डर' : 'Order'} <span className="text-ink">{invoice.orderNumber}</span>
          </p>
        </div>

        <div className="text-right text-body4 text-ink-muted">
          <p className="text-heading6 text-ink">{seller}</p>
          {store.addressLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
          {store.supportPhone && <p>{store.supportPhone}</p>}
          {store.gstin && (
            <p className="mt-1 text-ink">
              {hi ? 'GSTIN' : 'GSTIN'} {store.gstin}
            </p>
          )}
        </div>
      </header>

      <section className="grid gap-4 border-b border-hairline py-4 sm:grid-cols-2">
        <div>
          <h2 className="text-heading8 text-ink-faint uppercase">{hi ? 'खरीदार' : 'Billed to'}</h2>
          <p className="mt-1 text-body2 text-ink">{invoice.buyerName || invoice.buyerPhone}</p>
          <p className="text-body4 text-ink-muted">{invoice.buyerPhone}</p>
          <p className="mt-1 text-body4 text-ink-muted">
            {invoice.address.line1}
            {invoice.address.line2 ? `, ${invoice.address.line2}` : ''}
            {invoice.address.landmark ? `, ${invoice.address.landmark}` : ''}
            <br />
            {invoice.address.city}, {invoice.address.state} {invoice.address.pincode}
          </p>
          {invoice.buyerGstin && (
            <p className="mt-1 text-body4 text-ink">GSTIN {invoice.buyerGstin}</p>
          )}
        </div>

        <dl className="text-body4 sm:text-right">
          <div className="flex justify-between gap-4 sm:justify-end sm:gap-2">
            <dt className="text-ink-muted">{hi ? 'ऑर्डर की तारीख' : 'Order date'}</dt>
            <dd className="text-ink">{inDate(invoice.placedAt)}</dd>
          </div>
          {/* The date of supply, which on a delivered order is the delivery. */}
          <div className="flex justify-between gap-4 sm:justify-end sm:gap-2">
            <dt className="text-ink-muted">{hi ? 'डिलीवरी की तारीख' : 'Date of supply'}</dt>
            <dd className="text-ink">{inDate(invoice.deliveredAt)}</dd>
          </div>
          <div className="flex justify-between gap-4 sm:justify-end sm:gap-2">
            <dt className="text-ink-muted">{hi ? 'भुगतान' : 'Payment'}</dt>
            <dd className="text-ink">
              {invoice.paymentMethod === 'COD'
                ? hi
                  ? 'डिलीवरी पर नकद'
                  : 'Cash on delivery'
                : invoice.paymentMethod}
            </dd>
          </div>
        </dl>
      </section>

      {/* Wide on paper, scrollable on a phone — never a page that scrolls sideways. */}
      <div className="-mx-5 overflow-x-auto px-5 print:mx-0 print:overflow-visible print:px-0">
        <table className="mt-4 w-full min-w-[560px] border-collapse text-body4">
          <thead>
            <tr className="border-b border-hairline text-left text-ink-faint">
              <th className="py-2 font-medium">{hi ? 'सामान' : 'Item'}</th>
              {showHsn && <th className="py-2 font-medium">HSN</th>}
              <th className="py-2 text-right font-medium">{hi ? 'मात्रा' : 'Qty'}</th>
              <th className="py-2 text-right font-medium">{hi ? 'दर' : 'Rate'}</th>
              <th className="py-2 text-right font-medium">{hi ? 'कर योग्य' : 'Taxable'}</th>
              <th className="py-2 text-right font-medium">GST</th>
              <th className="py-2 text-right font-medium">{hi ? 'कुल' : 'Amount'}</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item) => (
              <tr key={item.id} className="border-b border-hairline align-top">
                <td className="py-2 text-ink">
                  {(hi && item.nameHi) || item.nameEn}
                  {item.variantLabel && (
                    <span className="block text-body5 text-ink-faint">{item.variantLabel}</span>
                  )}
                </td>
                {showHsn && <td className="py-2 text-ink-muted">{item.hsnCode ?? '—'}</td>}
                <td className="py-2 text-right tabular-nums text-ink">
                  {item.quantity}
                  {item.unitLabelEn && <span className="text-ink-faint"> {item.unitLabelEn}</span>}
                </td>
                <td className="py-2 text-right tabular-nums text-ink">
                  {formatINR(item.unitPrice)}
                </td>
                <td className="py-2 text-right tabular-nums text-ink">
                  {formatINR(item.taxableAmount)}
                </td>
                <td className="py-2 text-right tabular-nums text-ink">
                  {formatINR(item.taxAmount)}
                  <span className="block text-body5 text-ink-faint">{item.taxPercent}%</span>
                </td>
                <td className="py-2 text-right tabular-nums text-ink">
                  {formatINR(item.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:justify-between">
        {/*
         * The per-rate GST summary.
         *
         * Printed from the frozen breakdown rather than grouped from the
         * lines above: the two are computed the same way at write time, and
         * regrouping here would be a second implementation to disagree with
         * the first on a rounded paisa.
         */}
        {invoice.taxBreakdown.length > 0 && (
          <div className="text-body4">
            <h2 className="text-heading8 text-ink-faint uppercase">
              {hi ? 'GST विवरण' : 'GST summary'}
            </h2>
            <table className="mt-1 border-collapse">
              <thead>
                <tr className="text-left text-ink-faint">
                  <th className="pr-4 font-medium">{hi ? 'दर' : 'Rate'}</th>
                  <th className="pr-4 font-medium">{hi ? 'कर योग्य' : 'Taxable'}</th>
                  <th className="pr-4 font-medium">{invoice.taxIntraState ? 'CGST' : 'IGST'}</th>
                  {invoice.taxIntraState && <th className="font-medium">SGST</th>}
                </tr>
              </thead>
              <tbody className="tabular-nums text-ink">
                {invoice.taxBreakdown.map((row) => {
                  const split = splitGst(row.taxAmount, invoice.taxIntraState);
                  return (
                    <tr key={row.percent}>
                      <td className="pr-4">{row.percent}%</td>
                      <td className="pr-4">{formatINR(row.taxableAmount)}</td>
                      <td className="pr-4">
                        {formatINR(invoice.taxIntraState ? split.cgst : split.igst)}
                      </td>
                      {invoice.taxIntraState && <td>{formatINR(split.sgst)}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <dl className="min-w-[220px] space-y-1 text-body3 sm:ml-auto">
          <Line label={hi ? 'उप-योग' : 'Subtotal'} value={formatINR(invoice.subtotal)} />
          {invoice.discountTotal !== '0.00' && (
            <Line
              label={`${hi ? 'छूट' : 'Discount'}${invoice.discountCode ? ` · ${invoice.discountCode}` : ''}`}
              value={`− ${formatINR(invoice.discountTotal)}`}
            />
          )}
          {invoice.taxTotal !== '0.00' && (
            <>
              {invoice.taxIntraState ? (
                <>
                  <Line label="CGST" value={formatINR(totalTax.cgst)} />
                  <Line label="SGST" value={formatINR(totalTax.sgst)} />
                </>
              ) : (
                <Line label="IGST" value={formatINR(totalTax.igst)} />
              )}
            </>
          )}
          <Line
            label={hi ? 'डिलीवरी' : 'Delivery'}
            value={
              invoice.deliveryCharge === '0.00'
                ? hi
                  ? 'मुफ़्त'
                  : 'Free'
                : formatINR(invoice.deliveryCharge)
            }
          />
          <div className="flex justify-between gap-4 border-t border-hairline pt-2 text-heading5 text-ink">
            <dt>{hi ? 'कुल' : 'Total'}</dt>
            <dd className="tabular-nums">{formatINR(invoice.grandTotal)}</dd>
          </div>
        </dl>
      </div>

      <footer className="mt-5 flex flex-wrap items-start justify-between gap-4 border-t border-hairline pt-3 text-body5 text-ink-faint">
        {/*
         * The verification block.
         *
         * A PDF can be edited by anyone who has one; this is what makes that
         * pointless. The QR opens the same invoice rendered from the
         * database, for somebody who is not signed in — so an accountant or a
         * supplier holding the sheet can check the figures against the shop's
         * own record rather than against the paper in their hand.
         */}
        <div className="flex shrink-0 items-start gap-3">
          <div
            className="size-[84px] shrink-0 [&>svg]:size-full"
            // The SVG is generated by `qrcode` from a URL this server built —
            // no user input reaches it, and the library emits markup, not text.
            dangerouslySetInnerHTML={{ __html: qr }}
            aria-hidden
          />
          <div className="max-w-[15rem]">
            <p className="text-heading8 text-ink uppercase">
              {hi ? 'असली बिल जाँचें' : 'Verify this invoice'}
            </p>
            <p className="mt-0.5">
              {hi
                ? 'स्कैन करने पर दुकान का असली रिकॉर्ड खुलेगा। कागज़ पर कुछ और लिखा हो तो वही सही है।'
                : 'Scan to open the shop’s own record of this invoice. If the paper disagrees with it, the record is what counts.'}
            </p>
          </div>
        </div>

        <div className="min-w-0">
          <p>
            {invoice.taxInclusive
              ? hi
                ? 'ऊपर दिए गए दामों में GST शामिल है।'
                : 'GST is included in the prices shown above.'
              : hi
                ? 'GST ऊपर दिए गए दामों के अतिरिक्त है।'
                : 'GST has been added to the prices shown above.'}
          </p>
          <p className="mt-1">
            {hi
              ? 'कंप्यूटर से बना बिल — हस्ताक्षर की आवश्यकता नहीं।'
              : 'Computer-generated invoice. No signature required.'}
          </p>
        </div>
      </footer>
    </article>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="tabular-nums text-ink">{value}</dd>
    </div>
  );
}
