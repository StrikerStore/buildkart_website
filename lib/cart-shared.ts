/**
 * What the cart cookie holds — and, just as importantly, what it does not.
 *
 * **Variant ids and quantities. No prices, no totals, no names.**
 *
 * That is the same rule `core/src/write/create-order.ts` states for the order
 * payload, and for the same reason: a cart that carries its own line total is a
 * cart that can be edited to carry a different one. Every rupee the customer
 * sees comes back from `storefront.priceCart`, which recomputes from the
 * catalogue. The cookie is a shopping list, not an invoice.
 *
 * A cookie rather than `localStorage` because the cart badge, the cart page and
 * checkout are all Server Components — see the note in `location-shared.ts`.
 */

export const CART_COOKIE = 'bk_cart';

/** Thirty days. Long enough to come back to a part-built material list. */
export const CART_MAX_AGE = 60 * 60 * 24 * 30;

/**
 * A hard ceiling per line, and a separate one on distinct lines.
 *
 * Not a business rule — the owner's minimum and maximum order values live in
 * settings — but a bound on what a cookie may contain. Without it a crafted
 * cookie asks the pricing engine to multiply by a billion, and a 4KB cookie
 * limit turns into a silently truncated cart.
 */
export const MAX_QTY_PER_LINE = 999;
export const MAX_LINES = 50;

export type CartLine = {
  variantId: string;
  qty: number;
};

/**
 * Parses the cookie, discarding anything malformed.
 *
 * Cookies are user-editable, so every field is checked rather than trusted. A
 * bad line is dropped instead of failing the whole cart: one corrupt entry
 * should not empty a contractor's twenty-line material list.
 */
export function parseCart(raw: string | undefined): CartLine[] {
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const lines: CartLine[] = [];
    const seen = new Set<string>();

    for (const entry of parsed) {
      if (typeof entry !== 'object' || entry === null) continue;
      const line = entry as Record<string, unknown>;

      const variantId = line.variantId;
      const qty = line.qty;
      if (typeof variantId !== 'string' || variantId.length === 0 || variantId.length > 64) continue;
      if (typeof qty !== 'number' || !Number.isInteger(qty) || qty < 1) continue;
      // A duplicated variant would price twice; keep the first and move on.
      if (seen.has(variantId)) continue;

      seen.add(variantId);
      lines.push({ variantId, qty: Math.min(qty, MAX_QTY_PER_LINE) });
      if (lines.length >= MAX_LINES) break;
    }

    return lines;
  } catch {
    return [];
  }
}

export function serialiseCart(lines: CartLine[]): string {
  return JSON.stringify(lines.slice(0, MAX_LINES));
}

/**
 * Applies a quantity change and returns the new list.
 *
 * Pure, so the rules — a zero removes the line, a new variant appends, the
 * ceiling clamps — are testable without a request, and identical whether the
 * change came from a card's ADD or the cart page's stepper.
 */
export function withQuantity(lines: CartLine[], variantId: string, qty: number): CartLine[] {
  const clamped = Math.max(0, Math.min(Math.trunc(qty), MAX_QTY_PER_LINE));

  if (clamped === 0) return lines.filter((line) => line.variantId !== variantId);

  const existing = lines.find((line) => line.variantId === variantId);
  if (existing) {
    return lines.map((line) => (line.variantId === variantId ? { ...line, qty: clamped } : line));
  }

  if (lines.length >= MAX_LINES) return lines;
  return [...lines, { variantId, qty: clamped }];
}

/** Total items, for the header badge. */
export function cartCount(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.qty, 0);
}

/**
 * The discount code the shopper typed.
 *
 * Its own cookie rather than a field in the cart cookie: a code is not a line,
 * it survives the cart emptying, and keeping it separate means a malformed code
 * can never cost somebody their cart when the parser rejects it.
 *
 * The code is *stored*, never the discount it is worth — the server re-resolves
 * it on every price, so a cookie cannot assert a discount nobody granted.
 */
export const PROMO_COOKIE = 'bk_promo';

/** Codes are matched upper-case and bounded; anything else is not a code. */
export function parsePromo(raw: string | undefined): string | null {
  if (!raw) return null;
  const code = raw.trim().toUpperCase();
  return /^[A-Z0-9_-]{1,64}$/.test(code) ? code : null;
}
