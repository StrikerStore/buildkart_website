'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import type {
  ActionResult,
  DeviceLocationDto,
  MyAddressDto,
  PlaceSuggestionDto,
} from '@buildkart/contract';
import { api } from '@/lib/api/server';
import {
  LOCATION_COOKIE,
  LOCATION_MAX_AGE,
  normalizeCoordinate,
  type StoredLocation,
} from '@/lib/location-shared';
import { currentLocation } from '@/lib/location';
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
  deliveryCharge: string;
  freeAbove: string | null;
  promiseHours: number | null;
};

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
  return (await api()).storefront.resolveLocation.query({ latitude, longitude });
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
): Promise<DeviceLocationDto> {
  const result = await (await api()).storefront.resolveLocation.query({ latitude, longitude });

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
): Promise<PincodeCheck | { error: string }> {
  const customer = await currentCustomer();
  if (!customer) return { error: 'Sign in to use a saved address.' };

  const addresses = await (await api()).storefront.myAddresses.query();
  const address = addresses.find((row) => row.id === addressId);
  if (!address) return { error: 'That address is not yours.' };

  const result = await (await api()).content.checkPincode.query({ pincode: address.pincode });

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
  signedInPhone: string | null;
  mapDefault: { lat: number; lng: number; zoom: number };
}> {
  const [customer, current] = await Promise.all([currentCustomer(), currentLocation()]);
  const client = await api();

  const [checkout, addresses] = await Promise.all([
    client.content.storefrontCheckout.query(),
    customer ? client.storefront.myAddresses.query() : Promise.resolve([]),
  ]);

  return {
    addresses,
    // So the map reopens on the last pin rather than the middle of India.
    current,
    // So an out-of-area answer offers one tap rather than asking for a number
    // the shop has already verified.
    signedInPhone: customer?.phone ?? null,
    mapDefault: {
      lat: checkout.location.defaultLat,
      lng: checkout.location.defaultLng,
      zoom: checkout.location.defaultZoom,
    },
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
export async function searchPlaces(query: string): Promise<PlaceSuggestionDto[]> {
  if (query.trim().length < 3) return [];

  try {
    return await (await api()).storefront.searchPlaces.query({ q: query });
  } catch {
    return [];
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

  // The header pill and every delivery line render from this cookie.
  revalidatePath('/', 'layout');
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

  return (await api()).storefront.requestArea.mutate({ pincode, phone: customer.phone });
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
  return (await api()).storefront.requestArea.mutate({ pincode, phone });
}
