import type { Locale } from '@/lib/i18n';

/**
 * The specifications table.
 *
 * A description list, not a `<table>`: these are label/value pairs rather than
 * a grid with meaningful columns, and `<dl>` says exactly that to a screen
 * reader. It also wraps cleanly on a phone, which a two-column table does not.
 *
 * The rows are whatever metafields the owner defined — grade, thickness, gauge,
 * coverage. Nothing here knows what a construction material has; the admin
 * decides and this renders it.
 */
export function SpecsTable({
  specs,
  hsnCode,
  sku,
  locale,
}: {
  specs: Array<{ key: string; label: string; value: string }>;
  hsnCode: string | null;
  /**
   * The selected variant's SKU, or null.
   *
   * Passed in rather than read from the product, because it belongs to the
   * *variant* and changes as the shopper switches size — which is also why this
   * table is now rendered from inside `VariantPicker`, the only thing that
   * knows which variant is selected.
   *
   * It used to sit under the price. Nobody buys on an SKU; they quote it when
   * ordering by phone or checking a delivery note, and that is reference
   * material — which is what this table is for.
   */
  sku: string | null;
  locale: Locale;
}) {
  if (specs.length === 0 && !hsnCode && !sku) return null;

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-heading4 text-ink">
        {locale === 'hi' ? 'जानकारी' : 'Specifications'}
      </h2>

      <dl className="divide-y divide-hairline rounded-card border border-hairline bg-surface">
        {specs.map((spec) => (
          <div key={spec.key} className="flex gap-4 px-4 py-2.5">
            <dt className="w-2/5 shrink-0 text-body3 text-ink-muted">{spec.label}</dt>
            <dd className="text-body2 text-ink">{spec.value}</dd>
          </div>
        ))}

        {/* HSN and SKU last, and only when set. Contractors ask for the HSN on
            the GST bill and quote the SKU down the phone, so both belong on the
            page rather than only on the invoice. */}
        {hsnCode && (
          <div className="flex gap-4 px-4 py-2.5">
            <dt className="w-2/5 shrink-0 text-body3 text-ink-muted">HSN</dt>
            <dd className="text-body2 text-ink">{hsnCode}</dd>
          </div>
        )}

        {sku && (
          <div className="flex gap-4 px-4 py-2.5">
            <dt className="w-2/5 shrink-0 text-body3 text-ink-muted">SKU</dt>
            <dd className="text-body2 text-ink">{sku}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}
