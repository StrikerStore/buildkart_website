'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Check, Loader2, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Locale } from '@/lib/i18n';
import { saveProfile } from '@/app/account/actions';

/**
 * The customer's name, edited in place.
 *
 * Inline rather than on a separate profile screen. There is exactly one
 * editable field on this account — the phone is the identity and cannot be
 * retyped here — and a whole page for one input is a page nobody would find.
 *
 * A blank name clears it, which the server allows deliberately: nothing on the
 * site needs a name to work, so somebody who would rather the shop did not hold
 * theirs can take it back.
 */
export function NameEditor({ name, locale }: { name: string | null; locale: Locale }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const hi = locale === 'hi';

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await saveProfile(value.trim());
      if (!result.ok) {
        setError(result.fieldErrors.name ?? result.formErrors[0] ?? null);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  if (!editing) {
    return (
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {name ? (
            <p className="text-heading5 text-ink">{name}</p>
          ) : (
            /*
              * Not a bare "No name yet". An empty state that names the action is
              * the difference between a label and a dead end — the button beside
              * it is what actually fixes this, so the copy points at it.
              */
            <p className="text-heading6 text-ink-muted">
              {hi ? 'नाम जोड़ें ताकि ऑर्डर पहचानना आसान हो' : 'Add your name so we can address you'}
            </p>
          )}
        </div>

        <Button
          type="button"
          size="sm"
          variant="quiet"
          onClick={() => {
            setValue(name ?? '');
            setEditing(true);
          }}
        >
          <Pencil className="size-3.5" aria-hidden />
          {name ? (hi ? 'बदलें' : 'Edit') : hi ? 'नाम जोड़ें' : 'Add name'}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <label htmlFor="account-name" className="block text-body3 text-ink-muted">
        {hi ? 'आपका नाम' : 'Your name'}
      </label>

      <div className="mt-1 flex gap-2">
        <input
          id="account-name"
          value={value}
          onChange={(event) => setValue(event.target.value.slice(0, 191))}
          autoFocus
          autoComplete="name"
          placeholder={hi ? 'जैसे: रमेश ठेकेदार' : 'e.g. Ramesh Thekedar'}
          aria-invalid={error !== null}
          className="h-[var(--tap)] min-w-0 flex-1 rounded-box border border-hairline-strong bg-surface px-3 text-body1 text-ink focus:border-ink focus:outline-none"
        />

        <Button type="submit" size="md" disabled={pending}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Check className="size-4" aria-hidden />
          )}
          <span className="sr-only">{hi ? 'सेव करें' : 'Save'}</span>
        </Button>

        <Button
          type="button"
          size="icon"
          variant="quiet"
          onClick={() => {
            setEditing(false);
            setError(null);
          }}
          aria-label={hi ? 'रद्द करें' : 'Cancel'}
        >
          <X className="size-4" aria-hidden />
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
