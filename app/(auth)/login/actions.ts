'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { ActionResult, CustomerSessionDto, OtpRequestDto } from '@buildkart/contract';
import { api } from '@/lib/api/server';
import { SESSION_COOKIE } from '@/lib/session';

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
): Promise<ActionResult<Omit<CustomerSessionDto, 'token'>>> {
  const result = await (await api()).storefront.verifyOtp.mutate({ phone, code });
  if (!result.ok) return result;

  const { token, ...customer } = result.data;

  (await cookies()).set(SESSION_COOKIE, token, {
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
