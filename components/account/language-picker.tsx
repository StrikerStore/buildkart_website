'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { LOCALE_LABELS, LOCALES } from '@/lib/locale-shared';
import { cn } from '@/lib/cn';
import type { Locale } from '@/lib/i18n';
import { saveProfile } from '@/app/account/actions';

/**
 * Choosing a language, on the settings screen.
 *
 * The header's `अ/A` toggle changes what *this browser* shows. This one also
 * saves the choice **against the account** — the two are different questions,
 * and the second is what an SMS or an invoice would be written in. Saving one
 * without the other leaves the shop reading Hindi on screen and writing English
 * to the phone, which is the sort of thing nobody notices until a customer
 * complains.
 *
 * The name is passed through unchanged because the profile write takes both;
 * sending an empty string here would quietly clear a name somebody had set.
 */
export function LanguagePicker({
  locale,
  name,
}: {
  locale: Locale;
  name: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(next: Locale) {
    if (next === locale) return;
    startTransition(async () => {
      await saveProfile(name ?? '', next);
      router.refresh();
    });
  }

  return (
    <ul className={cn('divide-y divide-hairline', pending && 'opacity-60')}>
      {LOCALES.map((value) => {
        const active = value === locale;
        return (
          <li key={value}>
            <button
              type="button"
              onClick={() => choose(value)}
              disabled={pending}
              aria-pressed={active}
              className="flex min-h-[var(--tap)] w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-muted"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-box bg-surface-muted text-heading5 text-ink">
                {LOCALE_LABELS[value].native}
              </span>
              <span className="flex-1 text-body1 text-ink">{LOCALE_LABELS[value].label}</span>
              {pending && active ? (
                <Loader2 className="size-4 animate-spin text-ink-faint" aria-hidden />
              ) : (
                active && <Check className="size-5 text-success" aria-hidden />
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
