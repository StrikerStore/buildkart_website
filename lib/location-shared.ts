/**
 * The chosen delivery area, as the browser and the server both see it.
 *
 * Stored in a cookie rather than `localStorage` for one reason: the header, the
 * cart and every price band are Server Components, and a value only the browser
 * can read would force all of them to render a placeholder first and correct
 * themselves after hydration. A cookie is on the request, so the first HTML the
 * customer receives already says "Delivery to Vaishali Nagar in 4 hours".
 *
 * Only the pincode and enough to label it are kept. Delivery charge, free
 * threshold and the promise itself are re-read from `content.checkPincode` on
 * the server, because they are the owner's settings and a stale cookie must
 * never be what decides a delivery fee.
 */

export const LOCATION_COOKIE = 'bk_area';

/** Ninety days. Long enough that a returning customer is not asked again. */
export const LOCATION_MAX_AGE = 60 * 60 * 24 * 90;

export type StoredLocation = {
  pincode: string;
  /** The area name as it was when chosen — a label only, never a price input. */
  areaName: string | null;
  city: string | null;
  /**
   * The state the pin fell in, from the geocoder.
   *
   * Carried so checkout does not have to ask for it. `placeOrderSchema` needs a
   * state on every order, and a customer who has already dropped a pin has
   * already told us — asking again is a field that can only be got wrong.
   */
  state: string | null;

  /*
   * The coordinate, when the customer shared one.
   *
   * Carried so the checkout and address forms can prefill a pin the customer
   * has *already* granted permission for, rather than asking a second time —
   * a second permission prompt on the same visit is the one most people refuse.
   *
   * Strings, not numbers: they came off the wire as strings and are handed
   * straight back, so no float is reparsed on the way through. Like everything
   * else in this cookie they are a convenience — the server re-derives the
   * delivery charge from the pincode regardless.
   */
  latitude: string | null;
  longitude: string | null;
  /** What the geocoder called the spot, to show back as confirmation. */
  formatted: string | null;
};

/**
 * Parses the cookie, returning null for anything malformed.
 *
 * Cookies are user-editable, so this validates rather than trusts: a six-digit
 * pincode or nothing. Everything downstream re-checks serviceability anyway,
 * but a bad value should not reach it in the first place.
 */
export function parseLocation(raw: string | undefined): StoredLocation | null {
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;

    const value = parsed as Record<string, unknown>;
    const pincode = value.pincode;
    if (typeof pincode !== 'string' || !/^\d{6}$/.test(pincode)) return null;

    /*
     * Validated as a **number**, not by matching the string.
     *
     * An earlier version used a regex capped at ten decimal places, which quietly
     * broke the whole feature: a real browser geolocation fix is a float like
     * 22.69551234567891 — fourteen decimals — so every genuine pin failed to
     * parse and was dropped. The cookie still carried the formatted address, so
     * checkout looked right while insisting "exact location needed" for a
     * location the customer had already given.
     *
     * The generous ±180 bound is deliberate: this is a display and prefill
     * convenience, and the India box is enforced server-side by
     * `placeOrderSchema`, which is the only place it can actually be trusted.
     */
    const coordinate = (raw: unknown): string | null => {
      if (typeof raw !== 'string') return null;
      const value = Number(raw);
      if (!Number.isFinite(value) || Math.abs(value) > 180) return null;
      return raw;
    };

    return {
      pincode,
      areaName: typeof value.areaName === 'string' ? value.areaName.slice(0, 80) : null,
      city: typeof value.city === 'string' ? value.city.slice(0, 80) : null,
      state: typeof value.state === 'string' ? value.state.slice(0, 80) : null,
      latitude: coordinate(value.latitude),
      longitude: coordinate(value.longitude),
      formatted: typeof value.formatted === 'string' ? value.formatted.slice(0, 200) : null,
    };
  } catch {
    return null;
  }
}

/**
 * Trims a coordinate to the precision the database actually stores.
 *
 * `Address.latitude` is `Decimal(10, 7)` — about a centimetre — while a browser
 * hands back a float with fourteen meaningless decimals. Normalising on the way
 * into the cookie keeps the two in step and stops a round trip through storage
 * changing the value.
 */
export function normalizeCoordinate(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || Math.abs(parsed) > 180) return null;
  return parsed.toFixed(7);
}

/** The short label the header pill shows — area if known, else the pincode. */
export function locationLabel(location: StoredLocation): string {
  return location.areaName ?? location.pincode;
}
