'use client';

import { useState, useTransition } from 'react';
import { Bell, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Locale } from '@/lib/i18n';
import { requestArea, requestAreaForMe } from './actions';

/**
 * "Tell me when you deliver here."
 *
 * Shown only after a location comes back unserviceable, so it never asks for a
 * number from someone who is about to be able to order anyway.
 *
 * **A signed-in customer sees a button, not a field.** They proved a number by
 * OTP to get here; asking them to type it again is asking them to re-do work
 * the shop has already done, and every field on a form like this costs
 * completions from an audience typing on a phone at a building site. Their
 * number is read from the session on the server, so it is also the one number
 * we know is really theirs.
 *
 * A visitor who is not signed in gets the single field. Demanding a sign-in
 * before the shop will even note their interest would lose most of them, and
 * the request is only worth a callback either way.
 */
export function NotifyForm({
  pincode,
  locale,
  signedInPhone,
}: {
  pincode: string;
  locale: Locale;
  /** The signed-in customer's number, or null when nobody is signed in. */
  signedInPhone: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [phone, setPhone] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hi = locale === 'hi';

  function run(action: () => Promise<{ ok: boolean; formErrors?: string[]; fieldErrors?: Record<string, string> }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        setDone(true);
        return;
      }
      setError(
        result.fieldErrors?.phone ??
          result.formErrors?.[0] ??
          (hi ? 'दोबारा कोशिश करें' : 'Something went wrong. Try again.'),
      );
    });
  }

  if (done) {
    return (
      <p className="mt-3 flex items-center gap-2 text-body2 text-success">
        <Check className="size-4 shrink-0" aria-hidden />
        {hi
          ? 'हम आपको बता देंगे जब यहाँ डिलीवरी शुरू होगी।'
          : 'We will let you know when we start delivering here.'}
      </p>
    );
  }

  // --- signed in: one tap, no typing --------------------------------------
  if (signedInPhone) {
    return (
      <div className="mt-3">
        <Button
          type="button"
          variant="quiet"
          disabled={pending}
          onClick={() => run(() => requestAreaForMe(pincode))}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Bell className="size-4" aria-hidden />
          )}
          {hi ? 'शुरू होने पर बताएं' : 'Notify me when you start'}
        </Button>

        {/* Which number will be called, said out loud. A button that promises
            to ring you should show what it is going to ring. */}
        <p className="mt-1.5 text-body4 text-ink-muted">
          {hi ? 'हम इस नंबर पर बताएंगे' : 'We will let you know on'} +91 {signedInPhone}
        </p>

        {error && (
          <p role="alert" className="mt-2 text-body3 text-error">
            {error}
          </p>
        )}
      </div>
    );
  }

  // --- not signed in: ask for the number ----------------------------------
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        run(() => requestArea(pincode, phone));
      }}
      className="mt-3"
    >
      <label htmlFor="notify-phone" className="block text-body3 text-ink-muted">
        {hi
          ? 'मोबाइल नंबर दें — शुरू होते ही बताएंगे'
          : 'Leave your number and we will tell you when we start'}
      </label>

      <div className="mt-1.5 flex gap-2">
        <input
          id="notify-phone"
          value={phone}
          onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))}
          inputMode="tel"
          autoComplete="tel"
          maxLength={10}
          placeholder="9826000000"
          aria-invalid={error !== null}
          className="h-[var(--tap)] w-44 rounded-box border border-hairline-strong bg-surface px-4 text-body1 text-ink focus:border-ink focus:outline-none"
        />
        <Button type="submit" variant="quiet" disabled={pending || phone.length !== 10}>
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {hi ? 'बताएं' : 'Notify me'}
        </Button>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-body3 text-error">
          {error}
        </p>
      )}
    </form>
  );
}
