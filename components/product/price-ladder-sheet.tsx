'use client';

import { useEffect, useRef } from 'react';
import { Info, X } from 'lucide-react';
import {
  formatINR,
  subtractMoney,
  type BulkTierBasis,
  type PriceTierDto,
} from '@StrikerStore/contract';
import type { Locale } from '@/lib/i18n';

/**
 * "Bulk from ₹370 — how?", and the ladder that answers it.
 *
 * The bulk rule on this shop is **a ladder per variant, judged on one line**:
 * either the units on that line ("20 or more bags") or what that line is worth
 * ("₹10,000 or more of this item"). It is not the cart-wide unlock this sheet
 * used to explain, and it deliberately is the per-quantity ladder that older
 * copy here disclaimed — the trade quotes in price breaks, so the shop does too.
 *
 * A table rather than prose, because a ladder is a table: the shopper wants to
 * find the row they are in and see the row below it. Ranges are derived from
 * consecutive thresholds, with the last one open-ended.
 */
export function PriceLadderSheet({
  open,
  onClose,
  productName,
  listPrice,
  tiers,
  basis,
  unit,
  locale,
}: {
  open: boolean;
  onClose: () => void;
  productName: string;
  listPrice: string;
  /** Ascending. Empty is impossible here — the caller only opens with rungs. */
  tiers: PriceTierDto[];
  basis: BulkTierBasis;
  unit: string | null;
  locale: Locale;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const hi = locale === 'hi';
  const quantity = basis === 'QUANTITY';

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    // `showModal`, not the `open` attribute: only the former gives the backdrop
    // and the focus trap.
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  /*
   * One row per band, including the list price the ladder starts above.
   *
   * `subtractMoney` rather than arithmetic on numbers: `413.30 - 410.00` in
   * floats is 3.299999999999997, which is not a money string and would throw on
   * the way to `formatINR`. That mattered once with a single bulk price; with a
   * rung per row it is N chances to get it wrong.
   */
  const rows = [
    { from: null as string | null, rate: listPrice, saving: null as string | null },
    ...tiers.map((tier) => ({
      from:
        tier.minQuantity !== null
          ? String(tier.minQuantity)
          : formatINR(tier.minAmount!),
      rate: tier.unitPrice,
      saving: subtractMoney(listPrice, tier.unitPrice),
    })),
  ];

  /** "1–19", "20–39", "40+" — the band this rate covers. */
  function bandLabel(index: number): string {
    const row = rows[index]!;
    const next = rows[index + 1];

    if (!quantity) {
      if (row.from === null) return hi ? `${formatINR(listPrice)} तक` : `Up to ${next?.from ?? '—'}`;
      return next ? `${row.from} – ${next.from}` : `${row.from}+`;
    }

    const start = row.from === null ? 1 : Number(row.from);
    if (!next) return `${start}+`;
    return `${start} – ${Number(next.from) - 1}`;
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      // Clicking the backdrop closes it. The check is on the target being the
      // dialog itself — a click inside the content bubbles up here too.
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      /*
       * `m-auto` is load-bearing, not tidiness.
       *
       * A modal `<dialog>` is centred by the UA stylesheet's `margin: auto`
       * against its `inset: 0` — there is no flex or transform involved.
       * Tailwind's preflight sets `margin: 0` on `*`, which kills exactly that
       * declaration, and the dialog collapses into the top-left corner on every
       * breakpoint. Putting the margin back is the whole fix.
       *
       * The height cap and scroll are for a short phone in landscape, where the
       * sheet would otherwise run off the bottom with no way to reach the rest.
       */
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(28rem,calc(100vw-2rem))] overflow-y-auto rounded-card border border-hairline bg-surface p-0 text-ink backdrop:bg-ink/40"
    >
      <div className="flex items-start justify-between gap-3 border-b border-hairline p-4">
        <div className="min-w-0">
          <h2 className="text-heading4 text-ink">{hi ? 'बल्क भाव' : 'Bulk prices'}</h2>
          <p className="mt-0.5 truncate text-body4 text-ink-muted">{productName}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={hi ? 'बंद करें' : 'Close'}
          className="grid size-9 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-surface-muted"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>

      <div className="space-y-3 p-4">
        <div className="overflow-hidden rounded-card border border-hairline">
          <table className="w-full border-collapse text-body3">
            <thead>
              <tr className="bg-surface-muted text-left text-ink-muted">
                <th className="px-3 py-2 font-medium">
                  {quantity
                    ? hi
                      ? 'मात्रा'
                      : 'Quantity'
                    : hi
                      ? 'ऑर्डर मूल्य'
                      : 'Order value'}
                </th>
                <th className="px-3 py-2 font-medium">{hi ? 'भाव' : 'Rate'}</th>
                <th className="px-3 py-2 text-right font-medium">{hi ? 'बचत' : 'You save'}</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {rows.map((row, index) => (
                <tr key={index} className="border-t border-hairline">
                  <td className="px-3 py-2 text-ink">{bandLabel(index)}</td>
                  <td className="px-3 py-2 font-medium text-ink">{formatINR(row.rate)}</td>
                  <td className="px-3 py-2 text-right text-success-fg">
                    {row.saving && row.saving !== '0.00'
                      ? `${formatINR(row.saving)}${unit ? ` / ${unit}` : ''}`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="flex gap-2 rounded-box bg-surface-muted p-3 text-body3 text-ink">
          <Info className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden />
          <span>
            {quantity
              ? hi
                ? 'यह भाव इसी सामान की गिनती पर लगता है — कार्ट के कुल पर नहीं।'
                : 'These rates go on how many of this item you buy on one line, not on the cart total.'
              : hi
                ? 'यह भाव इसी सामान के कुल मूल्य पर लगता है — पूरे कार्ट पर नहीं।'
                : 'These rates go on what this one item comes to, not on the cart total.'}
          </span>
        </p>
      </div>
    </dialog>
  );
}
