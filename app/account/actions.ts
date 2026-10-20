'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import type {
  ActionResult,
  OtpRequestDto,
  MyActiveDeliveryDto,
  MyAddressDto,
  MyErasureDto,
  MyPrivacyDto,
  MyPrivacyRequestDto,
  MyProfileDto,
  OnlineGateway,
} from '@StrikerStore/contract';
import { api } from '@/lib/api/server';
import { LOCALE_COOKIE, LOCALE_MAX_AGE } from '@/lib/locale-shared';

/**
 * Account writes.
 *
 * None of these takes a customer id. The API reads it off the session, so there
 * is no argument here that could name somebody else's account — which is why
 * the signatures look thinner than the screens they serve.
 */

export async function saveProfile(
  name: string,
  locale?: 'en' | 'hi',
  /**
   * The GSTIN, when the caller is the field that edits it.
   *
   * `undefined` leaves the stored value alone — the language picker posts a
   * name and a locale and must not clear a tax number as a side effect. An
   * empty string is the customer deliberately removing it.
   */
  gstin?: string,
): Promise<ActionResult<MyProfileDto>> {
  const result = await (await api()).storefront.updateProfile.mutate({
    name,
    locale,
    ...(gstin !== undefined ? { gstin } : {}),
  });

  if (result.ok && locale) {
    /*
     * The language is stored twice on purpose, and they answer different
     * questions. The cookie is what *this browser* renders in, including for a
     * visitor who never signs in; the column is the customer's preference, and
     * is what an SMS or an invoice would be written in. Saving one without the
     * other leaves the shop reading Hindi on screen and writing English to the
     * phone.
     */
    (await cookies()).set(LOCALE_COOKIE, locale, {
      maxAge: LOCALE_MAX_AGE,
      path: '/',
      sameSite: 'lax',
      httpOnly: false,
    });
  }

  if (result.ok) revalidatePath('/', 'layout');
  return result;
}

/**
 * WhatsApp updates or offers, on or off — one switch per call. Turning one off
 * is the same call as turning it on, which is the point: taking a yes back must
 * be no harder than giving it.
 */
export async function savePrivacy(input: {
  whatsappUpdates?: boolean;
  whatsappOffers?: boolean;
}): Promise<ActionResult<MyPrivacyDto>> {
  const result = await (await api()).storefront.savePrivacy.mutate(input);
  if (result.ok) revalidatePath('/account/settings');
  return result;
}

export async function saveAddress(input: unknown): Promise<ActionResult<{ id: string }>> {
  const result = await (await api()).storefront.saveAddress.mutate(input);
  if (result.ok) revalidatePath('/account/addresses');
  return result;
}

export async function deleteAddress(id: string): Promise<ActionResult<void>> {
  const result = await (await api()).storefront.deleteAddress.mutate({ id });
  if (result.ok) revalidatePath('/account/addresses');
  return result;
}

export async function listAddresses(): Promise<MyAddressDto[]> {
  return (await api()).storefront.myAddresses.query();
}

/**
 * The customer's orders still on their way, for the home screen's countdown
 * capsule.
 *
 * Fetched by the capsule after paint and polled while the home screen is open,
 * never by the layout — that would put an order query on every page view of
 * every visitor. Swallows errors into "nothing to show": signed out, a blip,
 * an API older than the endpoint. The capsule is a reminder, and must never be
 * the thing that breaks the page it floats over.
 */
export async function loadActiveDeliveries(): Promise<MyActiveDeliveryDto[]> {
  try {
    return await (await api()).storefront.myActiveDeliveries.query();
  } catch {
    return [];
  }
}

/**
 * Asks the gateway to forget a saved card. The API checks the token belongs to
 * this customer's own gateway account before passing the request on.
 */
export async function removeSavedCard(
  gateway: OnlineGateway,
  tokenId: string,
): Promise<ActionResult<void>> {
  const result = await (await api()).storefront.removeSavedCard.mutate({ gateway, tokenId });
  if (result.ok) {
    revalidatePath('/account/settings');
    revalidatePath('/checkout');
  }
  return result;
}

// --- the customer's rights (DPDP Act §§11-14) -----------------------------

/** Correcting the email the shop holds. Blank removes it. */
export async function saveEmail(email: string): Promise<ActionResult<MyPrivacyDto>> {
  const result = await (await api()).storefront.saveEmail.mutate({ email });
  if (result.ok) revalidatePath('/account/privacy');
  return result;
}

/** Naming, changing or removing the nominee. All blank removes them. */
export async function saveNominee(input: {
  name: string;
  relation: string;
  phone: string;
}): Promise<ActionResult<MyPrivacyDto>> {
  const result = await (await api()).storefront.saveNominee.mutate(input);
  if (result.ok) revalidatePath('/account/privacy');
  return result;
}

/** A correction, a deletion or a complaint, to the grievance officer's queue. */
export async function createPrivacyRequest(input: {
  type: 'ERASURE' | 'CORRECTION' | 'GRIEVANCE';
  details: string;
}): Promise<ActionResult<MyPrivacyRequestDto>> {
  const result = await (await api()).storefront.createPrivacyRequest.mutate(input);
  if (result.ok) revalidatePath('/account/privacy');
  return result;
}

/** Withdrawing a request the shop has not started on. */
export async function cancelPrivacyRequest(id: string): Promise<ActionResult<void>> {
  const result = await (await api()).storefront.cancelPrivacyRequest.mutate({ id });
  if (result.ok) revalidatePath('/account/privacy');
  return result;
}

// --- deleting the account ---------------------------------------------------

/** Step one: a code on WhatsApp, so only the phone's owner can do this. */
export async function requestErasureCode(): Promise<ActionResult<OtpRequestDto>> {
  return (await api()).storefront.requestErasureCode.mutate();
}

/** Step two: the code. The deletion is then scheduled a week out. */
export async function confirmErasure(code: string): Promise<ActionResult<MyErasureDto>> {
  const result = await (await api()).storefront.confirmErasure.mutate({ code });
  if (result.ok) revalidatePath('/account/privacy');
  return result;
}

/** Changing their mind, any time before it runs. */
export async function cancelErasure(): Promise<ActionResult<MyErasureDto>> {
  const result = await (await api()).storefront.cancelErasure.mutate();
  if (result.ok) revalidatePath('/account/privacy');
  return result;
}
