'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import type { MyErasureDto } from '@StrikerStore/contract';
import { cancelErasure, confirmErasure, requestErasureCode } from '@/app/account/actions';
import { Button } from '@/components/ui/button';
import type { Locale } from '@/lib/i18n';

/**
 * "Delete my account" (DPDP Act §12).
 *
 * Three steps, each one there for a reason: a code on WhatsApp, so a phone
 * left signed in on a site somewhere cannot be used to do it; then a week
 * before it runs, so a change of mind costs nothing; then it happens on its
 * own. Until then it can be cancelled from here.
 *
 * Refused up front, with the reason, while an order is on the way or money is
 * still owed — the shop cannot finish an order for someone it has forgotten.
 */
export function DeleteAccount({ initial, locale }: { initial: MyErasureDto; locale: Locale }) {
  const hi = locale === 'hi';
  const [state, setState] = useState(initial);
  const [step, setStep] = useState<'start' | 'code'>('start');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const date = (iso: string) =>
    new Date(iso).toLocaleDateString(hi ? 'hi-IN' : 'en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    });

  function sendCode() {
    setError(null);
    startTransition(async () => {
      const result = await requestErasureCode();
      if (!result.ok) {
        setError(result.formErrors[0] ?? (hi ? 'कोड नहीं भेजा जा सका।' : 'Could not send the code.'));
        return;
      }
      setDevCode(result.data.devCode);
      setStep('code');
    });
  }

  function confirm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await confirmErasure(code);
      if (!result.ok) {
        setError(result.fieldErrors.code ?? result.formErrors[0] ?? (hi ? 'कोड सही नहीं है।' : 'That code is not right.'));
        return;
      }
      setState(result.data);
      setStep('start');
      setCode('');
    });
  }

  function cancel() {
    setError(null);
    startTransition(async () => {
      const result = await cancelErasure();
      if (!result.ok) {
        setError(result.formErrors[0] ?? null);
        return;
      }
      setState(result.data);
    });
  }

  // --- scheduled: say when, and offer the way back -------------------------
  if (state.scheduledFor) {
    return (
      <div className="space-y-3 rounded-card border border-error/40 bg-error-bg p-4">
        <p className="text-body2 text-ink">
          {hi
            ? `आपका अकाउंट ${date(state.scheduledFor)} को मिटा दिया जाएगा।`
            : `Your account will be deleted on ${date(state.scheduledFor)}.`}
        </p>
        <p className="text-body4 text-ink-muted">
          {hi ? 'तब तक आप इसे रद्द कर सकते हैं।' : 'You can cancel until then.'}
        </p>
        {error && (
          <p role="alert" className="text-body4 text-error">
            {error}
          </p>
        )}
        <Button type="button" variant="quiet" disabled={pending} onClick={cancel}>
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {hi ? 'मिटाना रद्द करें' : 'Cancel deletion'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-card border border-hairline bg-surface p-4">
      <ul className="list-disc space-y-1 pl-5 text-body3 text-ink-muted">
        <li>
          {hi
            ? 'आपका नाम, ईमेल, GST नंबर, पते, सेव किए कार्ड, मैसेज और फ़ोटो मिटा दिए जाएँगे।'
            : 'Your name, email, GST number, addresses, saved cards, messages and photos are deleted.'}
        </li>
        <li>
          {hi
            ? 'पुराने ऑर्डर के बिल टैक्स क़ानून के अनुसार 8 साल तक रखे जाते हैं, फिर उनसे भी आपकी पहचान हटा दी जाती है।'
            : 'Invoices for past orders are kept for 8 years, as tax law requires, then your details are removed from them too.'}
        </li>
        {state.walletBalance !== '0' && state.walletBalance !== '0.00' && (
          <li className="text-ink">
            {hi
              ? `आपके वॉलेट के ₹${state.walletBalance} भी चले जाएँगे।`
              : `The ₹${state.walletBalance} in your wallet goes with the account.`}
          </li>
        )}
        <li>
          {hi
            ? 'इसी नंबर से बाद में नया अकाउंट बना सकते हैं।'
            : 'You can sign up again later with the same number, as a new customer.'}
        </li>
      </ul>

      {state.blockers.length > 0 ? (
        <div className="rounded-box bg-surface-muted px-3 py-2 text-body3 text-ink">
          {state.blockers.map((reason) => (
            <p key={reason}>{reason}</p>
          ))}
        </div>
      ) : step === 'start' ? (
        <Button type="button" variant="quiet" disabled={pending} onClick={sendCode} className="text-error">
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {hi ? 'मेरा अकाउंट मिटाएँ' : 'Delete my account'}
        </Button>
      ) : (
        <form onSubmit={confirm} className="space-y-2">
          <label htmlFor="erase-code" className="block text-body3 text-ink">
            {hi
              ? 'पुष्टि के लिए WhatsApp पर भेजा गया कोड डालें। अकाउंट 7 दिन बाद मिटेगा।'
              : 'Enter the code we sent on WhatsApp to confirm. Your account is deleted 7 days later.'}
          </label>
          {devCode && (
            <p className="rounded-box bg-info-bg px-3 py-2 text-body4 text-info">
              {hi ? `कोड: ${devCode}` : `Your code is ${devCode}.`}
            </p>
          )}
          <div className="flex gap-2">
            <input
              id="erase-code"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="••••••"
              className="h-[var(--tap)] w-36 rounded-box border border-hairline-strong bg-surface px-3 text-center text-heading5 tracking-[0.3em] text-ink focus:border-ink focus:outline-none"
            />
            <Button type="submit" disabled={pending || code.length !== 6} className="bg-error text-ink-inverted">
              {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {hi ? 'पुष्टि करें' : 'Confirm'}
            </Button>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className="text-body4 text-error">
          {error}
        </p>
      )}
    </div>
  );
}
