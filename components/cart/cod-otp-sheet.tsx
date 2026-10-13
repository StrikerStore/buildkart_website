'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import type { Locale } from '@/lib/i18n';

/** Thirty seconds before resending — the same courtesy as sign-in. */
const RESEND_SECONDS = 30;

/**
 * Confirming a cash-on-delivery order with the code sent to WhatsApp.
 *
 * Nobody pays for a COD order until the van arrives, so this is the shop's one
 * check that the order is wanted by the person whose number it is on. The code
 * comes through the same WhatsApp "sign-in code" message as logging in.
 *
 * The parent owns the calls; this owns the typing, the cooldown and the
 * messages. `onConfirm` resolves to an error to show, or never resolves at all
 * when the order is placed (the page navigates away).
 */
export function CodOtpSheet({
  locale,
  phone,
  devCode,
  busy,
  error,
  onConfirm,
  onResend,
  onClose,
}: {
  locale: Locale;
  /** The account's number, ten digits. */
  phone: string;
  /** Only when no WhatsApp sender is set up — the code itself, as at sign-in. */
  devCode: string | null;
  busy: boolean;
  error: string | null;
  onConfirm: (code: string) => void;
  onResend: () => Promise<boolean>;
  onClose: () => void;
}) {
  const hi = locale === 'hi';
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);
  const [resent, setResent] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((left) => left - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function resend() {
    setCode('');
    setResent(false);
    const ok = await onResend();
    if (ok) {
      setResent(true);
      setCooldown(RESEND_SECONDS);
      inputRef.current?.focus();
    }
  }

  return (
    <Sheet
      title={hi ? 'ऑर्डर पक्का करें' : 'Confirm your order'}
      onClose={onClose}
      closeLabel={hi ? 'बंद करें' : 'Close'}
      footer={
        <div className="p-4">
          <Button
            type="button"
            variant="buy"
            size="lg"
            block
            disabled={busy || code.length !== 6}
            onClick={() => onConfirm(code)}
          >
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {hi ? 'पुष्टि करें और ऑर्डर करें' : 'Confirm and place order'}
          </Button>
        </div>
      }
    >
      <form
        className="p-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (code.length === 6 && !busy) onConfirm(code);
        }}
      >
        <p className="text-body2 text-ink-muted">
          {hi
            ? `डिलीवरी पर भुगतान वाला ऑर्डर पक्का करने के लिए +91 ${phone} पर WhatsApp पर भेजा गया कोड डालें।`
            : `To confirm this cash-on-delivery order, enter the code sent on WhatsApp to +91 ${phone}.`}
        </p>

        <input
          ref={inputRef}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          // Lets the phone offer the code straight from the message.
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="••••••"
          aria-label={hi ? 'कोड' : 'Code'}
          aria-invalid={error !== null}
          className="mt-4 h-[52px] w-full rounded-box border border-hairline-strong bg-surface px-4 text-center text-heading2 tracking-[0.4em] text-ink focus:border-ink focus:outline-none"
        />

        {devCode && (
          <p className="mt-3 rounded-box bg-info-bg px-3 py-2 text-body3 text-info">
            {hi
              ? `कोड भेजने की कोई सेवा नहीं जुड़ी है। कोड: ${devCode}`
              : `No WhatsApp sender is configured, so nothing was sent. Your code is ${devCode}.`}
          </p>
        )}

        {error && (
          <p role="alert" className="mt-2 text-body3 text-error">
            {error}
          </p>
        )}

        {resent && !error && (
          <p role="status" className="mt-2 text-body3 text-success">
            {hi ? 'नया कोड भेज दिया।' : 'A new code is on its way.'}
          </p>
        )}

        <p className="mt-4 text-center text-body3 text-ink-muted">
          {hi ? 'कोड नहीं मिला?' : "Didn't get the code?"}{' '}
          {cooldown > 0 ? (
            <span aria-live="polite" className="text-ink-faint">
              {hi ? `${cooldown} सेकंड में दोबारा भेजें` : `Resend in ${cooldown}s`}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => void resend()}
              disabled={busy}
              className="inline-flex items-center gap-1 text-cta3 text-brand-text underline hover:text-ink disabled:opacity-50"
            >
              <RotateCw className="size-3.5" aria-hidden />
              {hi ? 'दोबारा भेजें' : 'Resend code'}
            </button>
          )}
        </p>
      </form>
    </Sheet>
  );
}
