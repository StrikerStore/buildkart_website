import Link from 'next/link';
import { AlertTriangle, X } from 'lucide-react';
import { formatINR, type CartLineDto } from '@StrikerStore/contract';
import { imageUrl, IMAGE } from '@/lib/media';
import type { Locale } from '@/lib/i18n';
import { CartQuantity } from './cart-quantity';
import { RemoveLine } from './remove-line';

/**
 * One row of the cart.
 *
 * Quantity is `CartQuantity`, not the card's `Stepper`: a cart line is where
 * somebody sets forty bags, so the number is typeable and the minus turns into
 * a bin at one. Both still call the same idempotent `setCartQuantity` action,
 * so "this variant, this many" is asserted identically wherever it changes.
 *
 * There is also an explicit remove in the corner, which is redundant with the
 * bin and deliberately so — the corner ✕ is where people look to delete a row,
 * and making them discover that decrementing past one does it is a puzzle
 * nobody asked for.
 */
export async function CartLine({ line, locale }: { line: CartLineDto; locale: Locale }) {
  const src = await imageUrl(line.imageKey, IMAGE.thumb);
  const name = (locale === 'hi' && line.nameHi) || line.nameEn;
  const unit = (locale === 'hi' && line.unitLabelHi) || line.unitLabelEn;

  return (
    <li className="relative flex gap-3 py-3">
      {/* Top-right, out of the flow, so it never crowds the name on a
          360px screen. */}
      <RemoveLine variantId={line.variantId} locale={locale}>
        <X className="size-4" aria-hidden />
      </RemoveLine>

      <Link
        href={`/products/${line.handle}`}
        className="size-[72px] shrink-0 overflow-hidden rounded-box bg-surface-muted sm:size-[88px]"
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={name} loading="lazy" className="size-full object-cover" />
        ) : (
          <span className="grid size-full place-items-center text-body6 text-ink-faint">
            {locale === 'hi' ? 'फ़ोटो नहीं' : 'No photo'}
          </span>
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <Link href={`/products/${line.handle}`} className="clamp-2 pr-8 text-heading7 text-ink sm:text-heading6">
          {name}
        </Link>

        {line.variantLabel && (
          <p className="mt-0.5 text-body4 text-ink-muted">{line.variantLabel}</p>
        )}

        <p className="mt-0.5 text-body4 text-ink-muted">
          {formatINR(line.unitPrice)}
          {unit && ` ${unit}`}
          {/* The list rate struck through, but only when a bulk rate replaced
              it — this is the moment the unlock pays off, and showing the
              before-price is what makes it visible. */}
          {line.wasBulkPrice && (
            <span className="ml-1.5 text-ink-faint line-through">
              {formatINR(line.listUnitPrice)}
            </span>
          )}
        </p>

        {/* Which rung is paying off, not just that one is. */}
        {line.appliedTier && (
          <p className="mt-0.5 text-body5 text-success">
            {line.appliedTier.minQuantity !== null
              ? locale === 'hi'
                ? `${line.appliedTier.minQuantity}+ का बल्क भाव`
                : `Bulk rate · ${line.appliedTier.minQuantity}+`
              : locale === 'hi'
                ? `${formatINR(line.appliedTier.minAmount!)} से ऊपर का भाव`
                : `Bulk rate · over ${formatINR(line.appliedTier.minAmount!)}`}
          </p>
        )}

        {/*
          * The nudge, on the row rather than the cart.
          *
          * "Three more bags" is only actionable next to the control that adds
          * the third bag, which is two lines below this. The old cart-wide
          * progress bar pointed at a store-wide cutoff that no longer exists.
          */}
        {line.nextTier && (
          <p className="mt-0.5 text-body5 text-brand-text">
            {line.nextTier.quantityShort !== null
              ? locale === 'hi'
                ? `${line.nextTier.quantityShort} और लें — ${formatINR(line.nextTier.unitPrice)} प्रति, ${formatINR(line.nextTier.saving)} बचत`
                : `${line.nextTier.quantityShort} more → ${formatINR(line.nextTier.unitPrice)} each, save ${formatINR(line.nextTier.saving)}`
              : locale === 'hi'
                ? `${formatINR(line.nextTier.amountShort!)} और — ${formatINR(line.nextTier.unitPrice)} प्रति`
                : `${formatINR(line.nextTier.amountShort!)} more of this → ${formatINR(line.nextTier.unitPrice)} each`}
          </p>
        )}

        {/* Only when the shelf cannot cover what was asked for. */}
        {line.availableQty !== null && (
          <p className="mt-1 flex items-center gap-1 text-body5 text-warning">
            <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
            {locale === 'hi'
              ? `सिर्फ़ ${line.availableQty} उपलब्ध`
              : `Only ${line.availableQty} available`}
          </p>
        )}

        <div className="mt-2 flex items-center justify-between gap-3">
          <CartQuantity variantId={line.variantId} quantity={line.quantity} locale={locale} />
          <span className="text-heading6 text-ink">{formatINR(line.lineTotal)}</span>
        </div>
      </div>
    </li>
  );
}
