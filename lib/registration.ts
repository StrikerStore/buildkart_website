/**
 * Set by the sign-in action when the account is new, read once by
 * `<RegistrationEvent>` on the page the redirect lands on.
 *
 * In a plain module, not the component's file: a server action importing a
 * value from a `'use client'` module receives a client reference, not the
 * string.
 */
export const REGISTERED_COOKIE = 'bk_reg';
