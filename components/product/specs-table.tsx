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
 *
 * No heading of its own: this renders inside an accordion whose summary is
 * already the heading, and a second "Specifications" under the bar that says
 * the same word reads as a mistake.
 *
 * Ruled like a table — boxed, with a divider under every row and a tinted
 * label column — because that is how a spec sheet is read: down one column to
 * find the property, across to the value. Still a `<dl>` underneath, so a
 * screen reader announces each value as belonging to its label rather than as
 * a cell at some grid coordinate, and so the two columns can stack on a narrow
 * phone where a real `<table>` would force a sideways scroll.
 */
export function SpecsTable({
  specs,
}: {
  specs: Array<{ key: string; label: string; value: string }>;
}) {
  if (specs.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-card border border-hairline">
      <dl className="divide-y divide-hairline">
        {specs.map((spec) => (
          <div key={spec.key} className="flex items-stretch">
            <dt className="w-2/5 shrink-0 border-r border-hairline bg-surface-muted px-3 py-2.5 text-body3 text-ink-muted">
              {spec.label}
            </dt>
            <dd className="min-w-0 flex-1 px-3 py-2.5 text-body2 text-ink">{spec.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
