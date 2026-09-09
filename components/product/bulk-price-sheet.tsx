'use client';

import { useEffect, useRef } from 'react';
import { Info, X } from 'lucide-react';
import { formatINR } from '@StrikerStore/contract';
import type { Locale } from '@/lib/i18n';

/**
 * "Bulk price ₹382 — how?", and the sheet that answers it.
 *
 * The bulk rule on this shop is **one rate per variant, unlocked by the cart's
 * subtotal** — not the per-quantity ladder ("10+ at ₹405, 30+ at ₹400") that
 * some competitors run. So this explains the rule that actually prices the
 * order rather than a nicer-looking one that would not: a shopper who reads
 * "buy 10 for ₹390" and is charged ₹410 has been lied to by their own product
 * page.
 *
 * A `<dialog>` rather than a hand-rolled overlay: the browser gives the modal
 * backdrop, the focus trap, Escape-to-close and the inert background for free,
 * and every one of those is a thing a div gets wrong.
 */
export function BulkPriceSheet({
  open,
  onClose,
  productName,
  listPrice,
  bulkPrice,
  unlockCutoff,
  unit,
  locale,
}: {
  open: boolean;
  onClose: () => void;
  productName: string;
  listPrice: string;
  bulkPrice: string;
  /** Cart subtotal at which every bulk-priced line switches to its bulk rate. */
  unlockCutoff: string;
  unit: string | null;
  locale: Locale;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const hi = locale === 'hi';

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    // `showModal`, not the `open` attribute: only the former gives the backdrop
    // and the focus trap.
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const saving = Number(listPrice) - Number(bulkPrice);
  const percent = Number(listPrice) > 0 ? Math.round((saving / Number(listPrice)) * 100) : 0;

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
          <h2 className="text-heading4 text-ink">{hi ? 'बल्क भाव' : 'Bulk price'}</h2>
          <p className="mt-0.5 truncate text-body4 text-ink-muted">{productName}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={hi ? 'बंद करें' : 'Close'}
          className="grid size-9 shrink-0 place-items-center rounded-box text-ink-muted hover:bg-surface-muted"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-baseline justify-between gap-3 rounded-box bg-success-bg px-3 py-2.5">
          <span className="text-body2 text-success-fg">
            {hi ? 'बल्क में' : 'Bulk rate'}
            {unit ? ` · ${unit}` : ''}
          </span>
          <span className="text-heading3 text-success-fg">{formatINR(bulkPrice)}</span>
        </div>

        <div className="flex items-baseline justify-between gap-3 px-3">
          <span className="text-body3 text-ink-muted">{hi ? 'सामान्य भाव' : 'Normal rate'}</span>
          <span className="text-body2 text-ink-muted line-through">{formatINR(listPrice)}</span>
        </div>

        <p className="flex gap-2 rounded-box bg-surface-muted p-3 text-body3 text-ink">
          <Info className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden />
          <span>
            {hi
              ? `कार्ट ${formatINR(unlockCutoff)} से ऊपर जाते ही, बल्क वाले हर सामान पर यह भाव अपने-आप लग जाता है — इसी सामान की गिनती नहीं, पूरे कार्ट का जोड़ देखा जाता है।`
              : `Every bulk-priced item in your cart switches to its bulk rate once the cart passes ${formatINR(unlockCutoff)}. It goes on the cart total, not on how many of this one item you buy — so mixing materials counts towards it too.`}
          </span>
        </p>

        {saving > 0 && (
          <p className="px-3 text-body4 text-ink-muted">
            {hi
              ? `इस सामान पर ${formatINR(String(saving))} प्रति यूनिट की बचत (${percent}%).`
              : `That is ${formatINR(String(saving))} off each unit on this item — about ${percent}%.`}
          </p>
        )}
      </div>
    </dialog>
  );
}
