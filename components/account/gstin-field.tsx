'use client';

import { useState, useTransition } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { saveProfile } from '@/app/account/actions';
import { Button } from '@/components/ui/button';
import type { Locale } from '@/lib/i18n';

/**
 * The customer's GST number, editable outside a checkout.
 *
 * Checkout asks for it too, but only at checkout, and only for that order. A
 * contractor who buys weekly wants it set once and printed on every invoice
 * after — and a customer who has stopped buying through their firm needs
 * somewhere to take it off again, which is what clearing the box does.
 *
 * The validation that matters is on the server: `updateProfileSchema` runs the
 * checksum, and this only relays what it says. A second copy of the rule here
 * would be one to drift.
 */
export function GstinField({
  initial,
  name,
  locale,
}: {
  initial: string | null;
  /** Posted alongside, because the profile mutation takes a whole profile. */
  name: string | null;
  locale: Locale;
}) {
  const hi = locale === 'hi';
  const [value, setValue] = useState(initial ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const dirty = value.trim().toUpperCase() !== (initial ?? '');

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);

    startTransition(async () => {
      const result = await saveProfile(name ?? '', undefined, value.trim());
      if (!result.ok) {
        setError(result.fieldErrors.gstin ?? result.formErrors[0] ?? 'Could not save that.');
        return;
      }
      // Echo the server's normalised value, so a lowercase paste visibly
      // becomes the uppercase number that will be printed.
      setValue(result.data.gstin ?? '');
      setSaved(true);
    });
  }

  return (
    <form onSubmit={submit} className="rounded-card border border-hairline bg-surface p-4">
      <label htmlFor="gstin" className="block text-body3 text-ink-muted">
        {hi ? 'GST नंबर' : 'GST number'}
      </label>
      <div className="mt-1 flex gap-2">
        <input
          id="gstin"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setSaved(false);
          }}
          // `characters` rather than `words`: a GSTIN is one token in caps, and
          // a phone keyboard that auto-capitalises words gets it half right.
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={20}
          placeholder="23AABCU9603R1ZM"
          aria-invalid={Boolean(error)}
          className="h-[var(--tap)] min-w-0 flex-1 rounded-box border border-hairline-strong bg-surface px-3 font-mono text-body1 tracking-wide text-ink uppercase focus:border-ink focus:outline-none"
        />
        <Button type="submit" disabled={pending || !dirty}>
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {hi ? 'सेव' : 'Save'}
        </Button>
      </div>

      {error ? (
        <p className="mt-1.5 text-body4 text-error">{error}</p>
      ) : saved ? (
        <p className="mt-1.5 flex items-center gap-1 text-body4 text-success-fg">
          <Check className="size-4" aria-hidden />
          {value
            ? hi
              ? 'सेव हो गया — आगे के बिल इसी नंबर पर बनेंगे।'
              : 'Saved. Future invoices will carry this number.'
            : hi
              ? 'हटा दिया गया।'
              : 'Removed.'}
        </p>
      ) : (
        <p className="mt-1.5 text-body4 text-ink-faint">
          {hi
            ? 'फर्म के नाम पर बिल चाहिए तो भरें। खाली छोड़ने पर निजी बिल बनेगा।'
            : 'For invoices in your firm’s name. Leave it blank to bill personally.'}
        </p>
      )}
    </form>
  );
}
