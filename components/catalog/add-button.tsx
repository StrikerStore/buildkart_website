import { quantityOf } from '@/lib/cart';
import type { Locale } from '@/lib/i18n';
import { QuickOptions } from './quick-options';
import { Stepper } from './stepper';

/**
 * The ADD control on a product card.
 *
 * Three states, and which one appears is decided on the **server** from the
 * cart cookie — so a card that is already in the cart renders as a stepper in
 * the first HTML, with no hydration flash of the wrong control.
 *
 *   - single sellable variant  → a stepper that starts at ADD
 *   - several variants         → Options, which opens a sheet to pick the size
 *                                and quantity, with Add to cart and Buy now
 *   - nothing sellable         → a disabled label
 *
 * The middle case is the one worth stating: an ADD button on a multi-size
 * product would have to pick a size on the customer's behalf, and picking 8 mm
 * when they wanted 12 mm is worse than one more tap.
 */
export async function AddButton({
  variantId,
  handle,
  inStock,
  locale,
}: {
  variantId: string | null;
  handle: string;
  inStock: boolean;
  locale: Locale;
}) {
  if (!inStock) {
    return (
      <span className="inline-flex h-10 items-center rounded-box border border-hairline px-3 text-cta3 text-ink-faint">
        {locale === 'hi' ? 'नहीं है' : 'Sold out'}
      </span>
    );
  }

  if (!variantId) return <QuickOptions handle={handle} locale={locale} />;

  return <Stepper variantId={variantId} quantity={await quantityOf(variantId)} locale={locale} />;
}
