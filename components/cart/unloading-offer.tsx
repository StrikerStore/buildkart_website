'use client';

import { useTransition } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { formatINR, type CartUnloadingDto } from '@StrikerStore/contract';
import { setUnloading } from '@/app/cart/actions';
import { cn } from '@/lib/cn';
import type { Locale } from '@/lib/i18n';

/**
 * "Need help with unloading?" — the optional service, in the cart.
 *
 * Offered here rather than at checkout because it changes the total, and the
 * cart is where the total is agreed. Every word and the price are the owner's,
 * from Delivery → Unloading service in the admin; nothing here is fixed text
 * but the question.
 *
 * The button stores a yes/no in a cookie and the server re-prices the cart, so
 * the figure the shopper sees in the bill is always the one computed there.
 */
export function UnloadingOffer({ offer, locale }: { offer: CartUnloadingDto; locale: Locale }) {
  const hi = locale === 'hi';
  const [pending, startTransition] = useTransition();
  const name = (hi && offer.nameHi) || offer.nameEn;
  const notes = hi && offer.notesHi.length > 0 ? offer.notesHi : offer.notesEn;

  return (
    <section className="rounded-card bg-success-bg p-3 sm:p-4">
      <h2 className="text-heading5 text-ink">
        {hi ? 'सामान उतारने में मदद चाहिए?' : 'Need help with unloading?'}
      </h2>

      <div className="mt-3 rounded-card border border-hairline bg-surface p-3">
        <div className="flex items-center gap-3">
          <UnloadingArt />
          <span className="min-w-0 flex-1 text-body1 text-ink">{name}</span>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <button
              type="button"
              disabled={pending}
              aria-pressed={offer.selected}
              onClick={() => startTransition(() => setUnloading(!offer.selected))}
              className={cn(
                'inline-flex h-10 min-w-[88px] items-center justify-center gap-1.5 rounded-box border px-4 text-cta2 transition',
                offer.selected
                  ? 'border-buy bg-buy text-buy-foreground hover:bg-buy-dark'
                  : 'border-buy bg-surface text-buy hover:bg-success-bg',
                pending && 'opacity-60',
              )}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : offer.selected ? (
                <>
                  <Check className="size-4" aria-hidden />
                  {hi ? 'जोड़ा' : 'Added'}
                </>
              ) : hi ? (
                'जोड़ें'
              ) : (
                'Add'
              )}
            </button>
            <span className="text-heading6 text-ink">{formatINR(offer.price)}</span>
          </div>
        </div>

        {offer.selected && (
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => setUnloading(false))}
            className="mt-1 text-cta3 text-ink-muted underline"
          >
            {hi ? 'हटाएं' : 'Remove'}
          </button>
        )}

        {notes.length > 0 && (
          <ul className="mt-3 list-disc space-y-1 rounded-box bg-info-bg py-2.5 pl-8 pr-3 text-body3 text-info">
            {notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/** A small loaded truck and a box — drawn, so there is no image to upload. */
function UnloadingArt() {
  return (
    <svg viewBox="0 0 56 36" className="h-9 w-14 shrink-0" aria-hidden>
      <rect x="2" y="24" width="10" height="9" rx="1.5" fill="#c98a3d" />
      <path d="M2 27.5h10" stroke="#8a5a22" strokeWidth="1" />
      <rect x="14" y="6" width="26" height="20" rx="2" fill="#f5a623" />
      <path d="M18 6v20M22 6v20M26 6v20M30 6v20M34 6v20" stroke="#d98b12" strokeWidth="1.2" />
      <path d="M40 12h7l6 7v7H40z" fill="#e63d3d" />
      <path d="M42 14h4.5l3.5 4.5H42z" fill="#cde8ff" />
      <rect x="12" y="26" width="42" height="3" rx="1" fill="#4a4a4a" />
      <circle cx="21" cy="31" r="3.5" fill="#2d2d2d" />
      <circle cx="21" cy="31" r="1.4" fill="#bbb" />
      <circle cx="46" cy="31" r="3.5" fill="#2d2d2d" />
      <circle cx="46" cy="31" r="1.4" fill="#bbb" />
      <path d="M4 20l5-5m0 0v3.5M9 15H5.5" stroke="#318616" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
