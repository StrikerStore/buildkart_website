'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import type {
  ActionResult,
  DeviceLocationDto,
  MyAddressDto,
  PlaceLocationDto,
  PlaceSuggestionDto,
} from '@StrikerStore/contract';
import { NOTICE_VERSION } from '@StrikerStore/contract';
import { api } from '@/lib/api/server';
import {
  ADDRESS_COOKIE,
  BROWSE_COOKIE,
  BROWSE_MAX_AGE,
  insideIndiaBox,
  LOCATION_COOKIE,
  LOCATION_MAX_AGE,
  mapDefaultFrom,
  normalizeCoordinate,
  type MapDefault,
  type OutsideSpot,
  type StoredLocation,
} from '@/lib/location-shared';
import { currentAddressId, currentLocation, currentOutside } from '@/lib/location';
import { currentCustomer } from '@/lib/session';

/**
 * Server Actions, not browser fetches.
 *
 * The tRPC client is `server-only` and carries `SERVICE_TOKEN`, which proves a
 * request came from one of our apps. Shipping that to the browser would hand
 * every visitor a key to the whole API, so anything the customer triggers goes
 * through an action like these.
 */

export type PincodeCheck = {
  pincode: string;
  serviced: boolean;
  areaName: string | null;
  city: string | null;
  freeAbove: string | null;
  promiseHours: number | null;
};

/**
 * What a committed pin turned out to be.
 *
 * The API's answer, plus `abroad` for a coordinate outside India: that one is
 * never sent to the API at all (see `insideIndiaBox`), so it is answered here
 * as resolved, unserved and without a pincode.
 */
export type ConfirmedLocation = DeviceLocationDto & { abroad: boolean };

/** A served area, for "Right now we reach: …". */
export type ServedArea = { pincode: string; areaName: string; city: string; promiseHours: number | null };

/**
 * Options for the two commit actions.
 *
 * `rememberOutside` is passed by the header's location popup and `/location`:
 * there, an out-of-area answer is where the visitor is, and they go on looking
 * around from it. Checkout's address sheet does not pass it — a mis-searched
 * address at the till must not throw away a serviced delivery area.
 */
type CommitOptions = { rememberOutside?: boolean };

/**
 * What is at this coordinate, and do we deliver to it?
 *
 * Named `resolve…`, not `use…`: a `use` prefix makes React's lint rules treat
 * this as a hook, and calling it from an event handler then reads as a hooks
 * violation. It is a Server Action, and the name should not suggest otherwise.
 *
 * The coordinate goes to the server rather than being resolved in the browser,
 * because the geocoding key is sealed in settings and because a client that
 * resolved its own pincode could claim a serviced one — which would put the
 * delivery charge under the customer's control.
 *
 * **Writes nothing.** This fires on every settle of the map, several times per
 * drag, and a query that quietly reset the shopper's delivery area each time
 * would change what their cart costs while they were still looking for their
 * gate. Committing is `confirmLocation` below, and it happens once, on a tap.
 */
export async function resolveDeviceLocation(
  latitude: number,
  longitude: number,
): Promise<DeviceLocationDto> {
  if (!insideIndiaBox(latitude, longitude)) return abroad(latitude, longitude);
  return (await api()).storefront.resolveLocation.query({ latitude, longitude });
}

/** The answer for a coordinate outside India, without asking the API. */
function abroad(latitude: number, longitude: number): ConfirmedLocation {
  return {
    latitude: String(latitude),
    longitude: String(longitude),
    resolved: true,
    serviced: false,
    pincode: null,
    areaName: null,
    city: null,
    state: null,
    formatted: null,
    area: null,
    nearby: [],
    abroad: true,
  };
}

/**
 * Commit a confirmed pin as the delivery area.
 *
 * Re-resolves rather than trusting what the client says is there. The browser
 * has just been told the answer by `resolveDeviceLocation`, but a crafted call
 * could assert a serviced area for a coordinate we do not cover — and this is
 * the call that decides a delivery charge, so it asks the server again.
 */
export async function confirmLocation(
  latitude: number,
  longitude: number,
  options: CommitOptions = {},
): Promise<ConfirmedLocation> {
  if (!insideIndiaBox(latitude, longitude)) {
    const result = abroad(latitude, longitude);
    if (options.rememberOutside) {
      await rememberOutside({
        pincode: null,
        areaName: null,
        city: null,
        state: null,
        latitude: normalizeCoordinate(latitude),
        longitude: normalizeCoordinate(longitude),
        formatted: null,
      });
    }
    return result;
  }

  const result = {
    ...(await (await api()).storefront.resolveLocation.query({ latitude, longitude })),
    abroad: false,
  };

  /*
   * Out of area, but we know where: that is where the visitor is looking
   * around from. A spot the geocoder could not name is not remembered — the
   * prompt asks them to try another place instead.
   */
  if (options.rememberOutside && result.resolved && !(result.serviced && result.area)) {
    await rememberOutside({
      pincode: result.pincode,
      areaName: result.areaName,
      city: result.city,
      state: result.state,
      latitude: normalizeCoordinate(result.latitude),
      longitude: normalizeCoordinate(result.longitude),
      formatted: result.formatted,
    });
  }

  if (result.serviced && result.area) {
    /*
     * The **geocoder's** area name, not the serviceable-area row's.
     *
     * These answer different questions and conflating them was a real bug: the
     * row names a coverage zone ("Nehru Nagar & Bhawarkua" is the whole of
     * 452001), while the customer pinned a specific spot in Vaishali Nagar. The
     * header was telling them they had chosen a neighbourhood they had not.
     *
     * The row still decides the delivery charge and the promise — that is keyed
     * on the pincode and unaffected. This is only what the pill says.
     */
    await rememberArea(result.area.pincode, result.areaName ?? result.area.areaName, result.city ?? result.area.city, {
      latitude: result.latitude,
      longitude: result.longitude,
      formatted: result.formatted,
      // The geocoder's, not the area row's: `ServiceablePincode` has no state
      // column, and the order needs one.
      state: result.state,
    });
  }

  return result;
}

/**
 * Checks a typed pincode and, when serviceable, remembers it.
 *
 * The fallback path, for a device that will not share its location — refused
 * permission, an old browser, or indoors on a site with no fix. Returns the
 * unserviceable answer as a *value* rather than throwing, the same choice
 * `checkPincodeServiceable` documents on the API side: "we do not deliver
 * there yet" is a message to render with a notify-me form under it.
 */
export async function checkPincode(raw: string): Promise<PincodeCheck | { error: string }> {
  const pincode = raw.trim();
  if (!/^\d{6}$/.test(pincode)) {
    return { error: 'Enter a 6-digit pincode.' };
  }

  const result = await (await api()).content.checkPincode.query({ pincode });

  if (result.serviced) {
    // No coordinate: they typed a pincode rather than sharing a location, and
    // inventing one would put a pin in the middle of a postal district.
    await rememberArea(result.pincode, result.areaName, result.city, null);
  }

  return result;
}

/**
 * Choosing a saved address as the delivery area.
 *
 * Re-checks serviceability rather than trusting the row: an area can be closed
 * from the admin after an address was saved, and the address book shows that
 * but a click should not be able to bypass it.
 */
export async function chooseSavedAddress(
  addressId: string,
  options: CommitOptions = {},
): Promise<PincodeCheck | { error: string }> {
  const customer = await currentCustomer();
  if (!customer) return { error: 'Sign in to use a saved address.' };

  const addresses = await (await api()).storefront.myAddresses.query();
  const address = addresses.find((row) => row.id === addressId);
  if (!address) return { error: 'That address is not yours.' };

  const result = await (await api()).content.checkPincode.query({ pincode: address.pincode });

  // A saved place we do not deliver to yet: look around from there.
  if (!result.serviced && options.rememberOutside) {
    await rememberOutside({
      pincode: address.pincode,
      areaName: address.label || address.line1 || null,
      city: address.city,
      state: address.state,
      latitude: normalizeCoordinate(address.latitude),
      longitude: normalizeCoordinate(address.longitude),
      formatted: [address.line1, address.city].filter(Boolean).join(', '),
    });
  }

  if (result.serviced) {
    /*
     * The customer's own name for the place — "Site", "Godown" — ahead of the
     * serviceable-area row, for the same reason as `confirmLocation`: the pill
     * should say where they chose, and they already told us what to call it.
     */
    await rememberArea(
      result.pincode,
      address.label || address.line1 || result.areaName,
      address.city,
      {
        latitude: address.latitude,
        longitude: address.longitude,
        formatted: [address.line1, address.city].filter(Boolean).join(', '),
        state: address.state,
      },
    );
    // Picked from the book, so this is also where the order goes.
    (await cookies()).set(ADDRESS_COOKIE, address.id, {
      maxAge: LOCATION_MAX_AGE,
      path: '/',
      sameSite: 'lax',
      httpOnly: true,
    });
  }

  return result;
}

/**
 * Everything the location sheet needs, fetched when it opens.
 *
 * Deliberately **not** loaded in the root layout. The sheet is mounted on every
 * page so it can be opened from the header, and loading a customer's address
 * book plus the checkout config on every single page view — to fill a panel
 * most visits never open — is the cost the mini cart avoids the same way.
 */
export async function loadLocationSheet(): Promise<{
  addresses: MyAddressDto[];
  current: StoredLocation | null;
  /** Where an out-of-area visitor is looking around from, if anywhere. */
  outside: OutsideSpot | null;
  /** What we do cover, for the out-of-area notice. Empty unless `outside` is set. */
  servedAreas: ServedArea[];
  signedInPhone: string | null;
  signedInName: string | null;
  selectedAddressId: string | null;
  mapDefault: MapDefault;
}> {
  const [customer, current, outside, selectedAddressId] = await Promise.all([
    currentCustomer(),
    currentLocation(),
    currentOutside(),
    currentAddressId(),
  ]);
  const client = await api();

  const [checkout, addresses, areas] = await Promise.all([
    client.content.storefrontCheckout.query(),
    customer ? client.storefront.myAddresses.query() : Promise.resolve([]),
    /*
     * Only for the out-of-area notice. A fresh lookup carries its own
     * `nearby`, but a notice opened from a remembered spot has nothing to
     * ask — and the list is the same either way: the owner's areas, in the
     * owner's order, with no distance (see `device-location.ts`).
     */
    outside ? client.storefront.areas.query().catch(() => []) : Promise.resolve([]),
  ]);

  return {
    addresses,
    // So the map reopens on the last pin rather than the middle of India.
    current,
    outside,
    servedAreas: areas.slice(0, 3).map((area) => ({
      pincode: area.pincode,
      areaName: area.areaName,
      city: area.city,
      promiseHours: area.promiseHours,
    })),
    // So an out-of-area answer offers one tap rather than asking for a number
    // the shop has already verified.
    signedInPhone: customer?.phone ?? null,
    signedInName: customer?.name ?? null,
    selectedAddressId,
    mapDefault: mapDefaultFrom(checkout.location),
  };
}

/**
 * Localities matching a typed query, to centre the map on.
 *
 * The escape hatch for a device that will not share its location. Note what it
 * does **not** do: decide serviceability. A hit only moves the map; the pin the
 * customer then drops is what gets reverse-geocoded into a pincode. That is
 * what keeps this from being a pincode picker wearing a different hat.
 *
 * Returns an empty list rather than an error for a bad query — the map is
 * already open and draggable, so "no matches" is a nudge, not a failure.
 */
export async function searchPlaces(
  query: string,
  sessionToken?: string,
): Promise<PlaceSuggestionDto[]> {
  if (query.trim().length < 3) return [];

  try {
    return await (await api()).storefront.searchPlaces.query({ q: query, sessionToken });
  } catch {
    return [];
  }
}

/**
 * Where a picked Google autocomplete suggestion is.
 *
 * Google's suggestions arrive as place IDs without coordinates, so the pick is
 * a second lookup. Passing the same session token as the searches before it is
 * what makes Google bill the whole search as that one lookup.
 */
export async function placeLocation(
  placeId: string,
  sessionToken?: string,
): Promise<PlaceLocationDto | null> {
  try {
    return await (await api()).storefront.placeLocation.query({ placeId, sessionToken });
  } catch {
    return null;
  }
}

/** The signed-in customer's address book, for the picker's fallback. */
export async function savedAddresses(): Promise<MyAddressDto[]> {
  const customer = await currentCustomer();
  if (!customer) return [];
  return (await api()).storefront.myAddresses.query();
}

async function rememberArea(
  pincode: string,
  areaName: string | null,
  city: string | null,
  pin: {
    latitude: string | null;
    longitude: string | null;
    formatted: string | null;
    state?: string | null;
  } | null,
) {
  (await cookies()).set(
    LOCATION_COOKIE,
    JSON.stringify({
      pincode,
      areaName,
      city,
      state: pin?.state ?? null,
      // Trimmed to the precision the database stores, so a value that has been
      // through the cookie and a value straight off the wire are the same one.
      latitude: normalizeCoordinate(pin?.latitude),
      longitude: normalizeCoordinate(pin?.longitude),
      formatted: pin?.formatted ?? null,
    }),
    {
      maxAge: LOCATION_MAX_AGE,
      path: '/',
      sameSite: 'lax',
      /*
       * Readable by script on purpose — unlike the session cookie. Nothing here
       * is a credential, and everything in it is re-checked on the server
       * before it can affect a price.
       */
      httpOnly: false,
    },
  );

  /*
   * Any change of area forgets the chosen address: the cart is about to be
   * priced somewhere else, and an order must not ship to the old place at the
   * new place's price. `chooseSavedAddress` sets it again straight after.
   */
  (await cookies()).delete(ADDRESS_COOKIE);
  // A real delivery area replaces looking around from outside it.
  (await cookies()).delete(BROWSE_COOKIE);

  // The header pill and every delivery line render from this cookie.
  revalidatePath('/', 'layout');
}

/**
 * An out-of-area spot becomes where the visitor looks around from.
 *
 * Clears the delivery area and the chosen address: the visitor has just said
 * they are somewhere we do not deliver, and a cart left priced for the old
 * area — with its old address one tap from checkout — would contradict them.
 * Cart lines are kept; the cart says it cannot be delivered here and holds
 * checkout back.
 */
async function rememberOutside(spot: OutsideSpot) {
  const store = await cookies();
  store.set(BROWSE_COOKIE, JSON.stringify(spot), {
    maxAge: BROWSE_MAX_AGE,
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
  });
  store.delete(LOCATION_COOKIE);
  store.delete(ADDRESS_COOKIE);
  revalidatePath('/', 'layout');
}

/**
 * The visitor closed or skipped the location popup.
 *
 * Remembered so it is not pushed at them again on the next page; ADD asks
 * instead. Never overwrites a real answer — a delivery area, or a remembered
 * out-of-area spot — since closing the sheet after choosing is not skipping.
 */
export async function skipLocation(): Promise<void> {
  if ((await currentLocation()) || (await currentOutside())) return;
  (await cookies()).set(BROWSE_COOKIE, '1', {
    maxAge: BROWSE_MAX_AGE,
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
  });
}

/**
 * "Tell me when you deliver here", from a signed-in customer.
 *
 * The number comes off the **session**, never off the form. Two reasons, and
 * the second is the one that matters: a customer who has already proved a
 * number by OTP should not be asked to retype it, and a signed-in client that
 * could post any number would be able to file expansion requests — and the
 * calls that follow them — against somebody else's phone.
 */
export async function requestAreaForMe(pincode: string): Promise<ActionResult<void>> {
  const customer = await currentCustomer();
  if (!customer) {
    return {
      ok: false,
      formErrors: ['Sign in first, or enter your number.'],
      fieldErrors: {},
    };
  }

  return (await api()).storefront.requestArea.mutate({
    pincode,
    phone: customer.phone,
    // The button press, under the form's notice, is the yes.
    consent: true,
    noticeVersion: NOTICE_VERSION,
  });
}

/**
 * The same request from a visitor who is not signed in.
 *
 * The number is taken on trust here, because there is no session to take it
 * from and demanding an OTP before we will even note somebody's interest would
 * lose most of them. `requestPincode` upserts on `(pincode, phone)`, so the
 * worst a mistyped or invented number costs is one row the owner rings once.
 */
export async function requestArea(pincode: string, phone: string): Promise<ActionResult<void>> {
  return (await api()).storefront.requestArea.mutate({
    pincode,
    phone,
    consent: true,
    noticeVersion: NOTICE_VERSION,
  });
}
