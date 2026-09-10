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
 *
 * HSN and SKU are deliberately **not** here. They are warehouse and accounting
 * references, not something a shopper chooses on, and the HSN still reaches the
 * customer where it is actually needed — on the GST invoice, which renders it
 * per line from the order itself.
 */
export function SpecsTable({
  specs,
  locale,
}: {
  specs: Array<{ key: string; label: string; value: string }>;
  locale: Locale;
}) {
  if (specs.length === 0) return null;

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
      </dl>
    </section>
  );
}
