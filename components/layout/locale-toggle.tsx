'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { LOCALE_LABELS } from '@/lib/locale-shared';
import { tr, type Locale } from '@/lib/i18n';

/**
 * The `अ / A` switch PLAN.md §2 asks to keep prominent in the header.
 *
 * It writes the cookie from the browser and calls `router.refresh()`, which
 * re-runs every Server Component with the new locale — no full page load, and
 * no client-side dictionary to keep in sync with the server's.
 *
 * A button, not a `<select>`. With exactly two languages a dropdown costs a tap
 * and hides the alternative behind it; the label always shows the language you
 * would switch *to*.
 */
export function LocaleToggle({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const next: Locale = locale === 'en' ? 'hi' : 'en';
  const label = LOCALE_LABELS[next];

  function switchTo() {
    // A year, path-wide. Matches LOCALE_MAX_AGE on the server; the value is
    // repeated rather than imported because `lib/locale.ts` is server-only.
    document.cookie = `bk_locale=${next}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <button
      type="button"
      onClick={switchTo}
      disabled={pending}
      aria-label={`${tr(locale, 'header.language')}: ${label.label}`}
      title={label.label}
      className="inline-flex size-[var(--tap)] shrink-0 items-center justify-center rounded-box text-heading4 text-ink hover:bg-surface-muted disabled:opacity-50"
    >
      {label.native}
    </button>
  );
}
