'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { ArrowLeft, Loader2, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Locale } from '@/lib/i18n';
import { requestCode, verifyCode } from './actions';

/**
 * Phone, then code.
 *
 * Two steps in one component rather than two routes, because the phone number
 * has to survive between them and a URL carrying it would put a customer's
 * number in their history and in any link they shared.
 *
 * No password, no email, no name. PLAN.md §2: this audience lives on their
 * phone number, and the OTP *is* the account — there is no separate
 * registration to fail at, so a first-time customer and a returning one take
 * exactly the same path.
 */
export function LoginForm({ locale, next }: { locale: Locale; next: string }) {
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const codeRef = useRef<HTMLInputElement>(null);

  /*
   * Seconds until resending is allowed.
   *
   * A cooldown rather than a free button, for the customer's sake as much as
   * the shop's: tapping resend three times sends three codes, and only the last
   * one works — so an impatient customer would be reading a dead code out of an
   * older SMS. Thirty seconds is roughly how long a slow network takes to
   * deliver the first one.
   *
   * This is a courtesy, not the limit. The real one is on the server: five
   * codes per number per fifteen minutes, which a client-side timer cannot be
   * trusted to enforce.
   */
  const RESEND_SECONDS = 30;
  const [cooldown, setCooldown] = useState(0);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((left) => left - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const send = useCallback(
    (onSent: () => void) =>
      startTransition(async () => {
        const result = await requestCode(phone);
        if (!result.ok) {
          setError(result.fieldErrors.phone ?? result.formErrors[0] ?? null);
          return;
        }
        setDevCode(result.data.devCode);
        setCooldown(RESEND_SECONDS);
        onSent();
      }),
    [phone],
  );

  // Focus the code box the moment it appears: the customer is coming back from
  // their SMS app and should be able to type straight away.
  useEffect(() => {
    if (step === 'code') codeRef.current?.focus();
  }, [step]);

  function submitPhone(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setResent(false);
    send(() => setStep('code'));
  }

  function resend() {
    setError(null);
    setCode('');
    send(() => {
      setResent(true);
      codeRef.current?.focus();
    });
  }

  function submitCode(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await verifyCode(phone, code, next);
      // A success redirects inside the action and never returns; reaching here
      // means it failed.
      if (result && !result.ok) {
        setError(result.fieldErrors.code ?? result.formErrors[0] ?? null);
      }
    });
  }

  if (step === 'phone') {
    return (
      <form onSubmit={submitPhone} className="mt-6">
        <label htmlFor="phone" className="block text-heading6 text-ink">
          {locale === 'hi' ? 'मोबाइल नंबर' : 'Mobile number'}
        </label>
        <p className="mt-1 text-body3 text-ink-muted">
          {locale === 'hi'
            ? 'हम एक कोड भेजेंगे। कोई पासवर्ड नहीं चाहिए।'
            : 'We will send you a code. No password needed.'}
        </p>

        <div className="mt-3 flex gap-2">
          <span className="grid h-[52px] shrink-0 place-items-center rounded-box border border-hairline-strong bg-surface-muted px-3 text-body1 text-ink-muted">
            +91
          </span>
          <input
            id="phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))}
            inputMode="tel"
            autoComplete="tel"
            autoFocus
            maxLength={10}
            placeholder="9826000000"
            aria-invalid={error !== null}
            className="h-[52px] min-w-0 flex-1 rounded-box border border-hairline-strong bg-surface px-4 text-heading4 tracking-wide text-ink focus:border-ink focus:outline-none"
          />
        </div>

        {error && (
          <p role="alert" className="mt-2 text-body3 text-error">
            {error}
          </p>
        )}

        <Button
          type="submit"
          size="lg"
          block
          disabled={pending || phone.length !== 10}
          className="mt-4"
        >
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {locale === 'hi' ? 'कोड भेजें' : 'Send code'}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={submitCode} className="mt-6">
      <button
        type="button"
        onClick={() => {
          setStep('phone');
          setCode('');
          setError(null);
        }}
        className="inline-flex items-center gap-1 text-body3 text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {locale === 'hi' ? 'नंबर बदलें' : 'Change number'}
      </button>

      <label htmlFor="code" className="mt-3 block text-heading6 text-ink">
        {locale === 'hi' ? `कोड डालें` : 'Enter the code'}
      </label>
      <p className="mt-1 text-body3 text-ink-muted">
        {locale === 'hi' ? `+91 ${phone} पर भेजा गया` : `Sent to +91 ${phone}`}
      </p>

      <input
        ref={codeRef}
        id="code"
        value={code}
        onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
        inputMode="numeric"
        // Lets Android and iOS offer the code straight from the SMS.
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="••••••"
        aria-invalid={error !== null}
        className="mt-3 h-[52px] w-full rounded-box border border-hairline-strong bg-surface px-4 text-center text-heading2 tracking-[0.4em] text-ink focus:border-ink focus:outline-none"
      />

      {/*
        * Shown only when the API says no SMS went out — it returns the code
        * itself in that case so local development is possible at all. With a
        * provider configured this is null and the block never renders.
        */}
      {devCode && (
        <p className="mt-3 rounded-box bg-info-bg px-3 py-2 text-body3 text-info">
          {locale === 'hi'
            ? `कोई SMS सेवा नहीं जुड़ी है। कोड: ${devCode}`
            : `No SMS provider is configured, so nothing was sent. Your code is ${devCode}.`}
        </p>
      )}

      {error && (
        <p role="alert" className="mt-2 text-body3 text-error">
          {error}
        </p>
      )}

      {/* Confirmation that a *new* code is on its way, so a customer who
          resent does not keep typing the old one. */}
      {resent && !error && (
        <p role="status" className="mt-2 text-body3 text-success">
          {locale === 'hi' ? 'नया कोड भेज दिया।' : 'A new code is on its way.'}
        </p>
      )}

      <Button type="submit" size="lg" block disabled={pending || code.length !== 6} className="mt-4">
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {locale === 'hi' ? 'आगे बढ़ें' : 'Verify and continue'}
      </Button>

      {/*
        * Resend, with the wait stated on the control rather than hidden behind
        * a disabled button that gives no reason. An SMS that never arrives is
        * the single most common way an OTP sign-in strands somebody, and
        * "Change number" is not the answer when the number is right.
        */}
      <p className="mt-4 text-center text-body3 text-ink-muted">
        {locale === 'hi' ? 'कोड नहीं मिला?' : "Didn't get the code?"}{' '}
        {cooldown > 0 ? (
          <span aria-live="polite" className="text-ink-faint">
            {locale === 'hi' ? `${cooldown} सेकंड में दोबारा भेजें` : `Resend in ${cooldown}s`}
          </span>
        ) : (
          <button
            type="button"
            onClick={resend}
            disabled={pending}
            className="inline-flex items-center gap-1 text-cta3 text-brand-text underline hover:text-ink disabled:opacity-50"
          >
            <RotateCw className="size-3.5" aria-hidden />
            {locale === 'hi' ? 'दोबारा भेजें' : 'Resend code'}
          </button>
        )}
      </p>
    </form>
  );
}
