'use client';

import { useState, useTransition } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { saveEmail } from '@/app/account/actions';
import { Button } from '@/components/ui/button';
import type { Locale } from '@/lib/i18n';

/**
 * The email the shop holds, which the customer can correct or remove
 * (DPDP Act §12). Nothing needs an email to work — the phone is the account —
 * so clearing it is allowed.
 */
export function EmailField({ initial, locale }: { initial: string | null; locale: Locale }) {
  const hi = locale === 'hi';
  const [value, setValue] = useState(initial ?? '');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty = value.trim().toLowerCase() !== (initial ?? '');

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await saveEmail(value.trim());
      if (!result.ok) {
        setError(result.fieldErrors.email ?? result.formErrors[0] ?? (hi ? 'सेव नहीं हो सका।' : 'Could not save that.'));
        return;
      }
      setValue(result.data.email ?? '');
      setSaved(true);
    });
  }

  return (
    <form onSubmit={submit}>
      <label htmlFor="email" className="block text-body3 text-ink-muted">
        {hi ? 'ईमेल' : 'Email'}
      </label>
      <div className="mt-1 flex gap-2">
        <input
          id="email"
          type="email"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setSaved(false);
          }}
          autoComplete="email"
          placeholder={hi ? 'ज़रूरी नहीं' : 'Optional'}
          aria-invalid={Boolean(error)}
          className="h-[var(--tap)] min-w-0 flex-1 rounded-box border border-hairline-strong bg-surface px-3 text-body1 text-ink focus:border-ink focus:outline-none"
        />
        <Button type="submit" disabled={pending || !dirty}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : saved ? <Check className="size-4" aria-hidden /> : null}
          {hi ? 'सेव' : 'Save'}
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-body4 text-error">
          {error}
        </p>
      )}
    </form>
  );
}
