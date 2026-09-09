import 'server-only';
import { cache } from 'react';
import { api } from './api/server';

/**
 * The customer's session, as the storefront holds it.
 *
 * The API mints the token and hands it back in the response body; **this app
 * owns the cookie the browser sees.** That split matters: the cookie is
 * `httpOnly`, so no script on the page can read the token, and the only thing
 * that ever forwards it is `lib/api/client.ts` on the server.
 *
 * Unlike the cart and the locale, this cookie is a credential. It is the one
 * that gets `httpOnly` and `secure`, and the one never written from the client.
 */
export const SESSION_COOKIE = 'bk_session';

/**
 * Who is signed in, or null.
 *
 * Asks the API rather than trusting the cookie's contents, because only the API
 * holds the signing key — this app cannot tell a real token from a forged one,
 * and should not be able to. `cache`d so the header and a page body cost one
 * check between them.
 */
export const currentCustomer = cache(async () => (await api()).storefront.me.query());
