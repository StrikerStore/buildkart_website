'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import type { ActionResult, MyAddressDto, MyProfileDto } from '@StrikerStore/contract';
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
