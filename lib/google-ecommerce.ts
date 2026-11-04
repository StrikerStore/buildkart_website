/**
 * GA4's ecommerce events, from the shapes the storefront already has.
 *
 * **Item ids are product handles**, the id the Meta Pixel and the shop's own
 * analytics use too, so one product reads the same in all three.
 *
 * **Prices are what the shopper saw**, GST included, on every event but
 * `purchase`, whose figures the server works out without GST, delivery or
 * wallet credit (`purchase-measurement.ts` in the backend). GA4 takes revenue
 * from `purchase` alone, so the funnel's prices describe the funnel and never
 * add to revenue.
 *
 * Consent is not checked here: `googleAnalyticsEvent` does that for every
 * event, so a call site never has to know whether GA4 is on.
 */
import { googleAnalyticsEvent } from './google-tag';
import { CURRENCY, toValue, type PixelProduct } from './meta-pixel';

/** `PixelProduct`, and what GA4 can group items by when a caller has it. */
export type GaProduct = PixelProduct & {
  variant?: string | null;
  category?: string | null;
  brand?: string | null;
};

/** What a cart line or an order line has that GA4 wants. */
export type GaLine = {
  handle: string;
  nameEn: string;
  variantLabel: string | null;
  unitPrice: string;
  quantity: number;
};

export function gaItem(product: GaProduct, quantity?: number) {
  return {
    item_id: product.handle,
    item_name: product.name,
    ...(product.variant ? { item_variant: product.variant } : {}),
    ...(product.category ? { item_category: product.category } : {}),
    ...(product.brand ? { item_brand: product.brand } : {}),
    price: toValue(product.price),
    ...(quantity !== undefined ? { quantity } : {}),
  };
}

/** A cart's lines as GA4 items, with their value: the goods, without delivery. */
export function gaCart(lines: readonly GaLine[]) {
  const items = lines.map((line) =>
    gaItem(
      { handle: line.handle, name: line.nameEn, price: line.unitPrice, variant: line.variantLabel },
      line.quantity,
    ),
  );
  const value = toValue(items.reduce((sum, item) => sum + item.price * (item.quantity ?? 1), 0));
  return { currency: CURRENCY, value, items };
}

/**
 * `add_to_cart` for units added, `remove_from_cart` for units taken away,
 * nothing for no change. `delta` is the change, not the new count.
 */
export function gaCartChange(product: GaProduct, delta: number) {
  if (!Number.isFinite(delta) || delta === 0) return;
  const quantity = Math.abs(delta);
  googleAnalyticsEvent(delta > 0 ? 'add_to_cart' : 'remove_from_cart', {
    currency: CURRENCY,
    value: toValue(toValue(product.price) * quantity),
    items: [gaItem(product, quantity)],
  });
}
