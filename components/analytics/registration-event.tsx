'use client';

import { useEffect } from 'react';
import { readCookie, writeCookie } from '@/lib/browser-cookies';
import { track } from '@/lib/meta-pixel';
import { REGISTERED_COOKIE } from '@/lib/registration';

/**
 * Meta's CompleteRegistration, from the browser.
 *
 * The sign-in action ends in a redirect, so no code after it runs in the page
 * that submitted the form. Instead it leaves a ten-minute cookie naming the new
 * customer, and this — mounted on every page — fires the event on whatever page
 * the redirect lands on, then clears it. `register-<id>` is the id the API's
 * server copy carries, so Meta counts the pair as one sign-up.
 */
export function RegistrationEvent() {
  useEffect(() => {
    try {
      const customerId = readCookie(REGISTERED_COOKIE);
      if (!customerId || !/^[A-Za-z0-9_-]{8,64}$/.test(customerId)) return;
      writeCookie(REGISTERED_COOKIE, '', 0);
      track(
        'CompleteRegistration',
        { status: 'registered', content_name: 'phone_otp' },
        `register-${customerId}`,
      );
    } catch {
      // A missed sign-up event is not worth a broken page.
    }
  }, []);

  return null;
}
