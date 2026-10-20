'use server';

import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  NOTICE_VERSION,
  serializeConsentCookie,
  type ActionResult,
  type CustomerSessionDto,
  type OtpRequestDto,
} from '@StrikerStore/contract';
import { api } from '@/lib/api/server';
import { SESSION_COOKIE } from '@/lib/session';
import { orderAttribution } from '@/lib/attribution-server';
import { CONSENT_COOKIE, CONSENT_MAX_AGE, parseConsent } from '@/lib/consent';
import { REGISTERED_COOKIE } from '@/lib/registration';

/**
 * Sign-in, in two steps.
 *
 * The token never touches client JavaScript. `verify` receives it from the API
 * and writes it straight into an `httpOnly` cookie inside this action — so the
 * only thing the browser ever holds is a cookie it cannot read, and the only
 * thing that forwards it is the server-side API client.
 */

export async function requestCode(phone: string): Promise<ActionResult<OtpRequestDto>> {
  return (await api()).storefront.requestOtp.mutate({ phone });
}

export async function verifyCode(
  phone: string,
  code: string,
  next: string,
  said: { ageConfirmed: boolean; whatsappOffers: boolean },
): Promise<ActionResult<Omit<CustomerSessionDto, 'token'>>> {
  const result = await (
    await api()
  ).storefront.verifyOtp.mutate({
    phone,
    code,
    ageConfirmed: said.ageConfirmed,
    whatsappMarketing: said.whatsappOffers,
    noticeVersion: NOTICE_VERSION,
    // The cookie-banner answers, and — only where they allow it — browser ids
    // and user agent for the server copy of Meta's CompleteRegistration.
    attribution: await orderAttribution(),
  });
  if (!result.ok) return result;

  const { token, ...customer } = result.data;
  const store = await cookies();

  /*
   * The account answered the cookie banner more recently somewhere else (or
   * this device never has): put that answer here, so a "no" given on another
   * phone is not overruled by an old "yes" on this one — and nobody is asked
   * twice.
   */
  const device = parseConsent(store.get(CONSENT_COOKIE)?.value);
  const account = customer.consent;
  if (account && (!device || device.at < Date.parse(account.at))) {
    store.set(
      CONSENT_COOKIE,
      serializeConsentCookie({
        id: device?.id ?? randomUUID(),
        analytics: account.analytics,
        marketing: account.marketing,
        at: Date.parse(account.at),
        v: NOTICE_VERSION,
      }),
      { maxAge: CONSENT_MAX_AGE, path: '/', sameSite: 'lax' },
    );
  }

  /*
   * A new account: leave its id for `<RegistrationEvent>`, which fires the
   * browser copy of CompleteRegistration on the page the redirect lands on —
   * nothing after `redirect()` runs in the page that submitted the form.
   * Readable by script on purpose, short-lived, and not a credential.
   */
  if (customer.isNewCustomer) {
    store.set(REGISTERED_COOKIE, customer.id, { maxAge: 600, path: '/', sameSite: 'lax' });
  }

  store.set(SESSION_COOKIE, token, {
    maxAge: result.data.expiresInSeconds,
    path: '/',
    sameSite: 'lax',
    // The one cookie on this site that is a credential, and the only one with
    // these two flags. The cart and the locale are readable by script; this
    // must never be.
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  });

  revalidatePath('/', 'layout');

  /*
   * The token is stripped from what goes back to the browser. It is already in
   * the cookie; returning it as well would put a live credential into the
   * action's response body, where client code could read it.
   */
  redirect(safeNext(next));

  return { ok: true, data: customer };
}

export async function signOut(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  revalidatePath('/', 'layout');
  redirect('/');
}

/**
 * Only a path on this site.
 *
 * `?next=` comes from a URL anyone can write, and following it blindly turns
 * the login page into an open redirect — the classic phishing shape, where a
 * link that genuinely starts at this shop's domain lands somewhere else after
 * sign-in. Anything with a scheme or a protocol-relative `//` prefix is
 * refused in favour of the home page.
 */
function safeNext(next: string): string {
  if (!next.startsWith('/') || next.startsWith('//')) return '/';
  return next;
}
