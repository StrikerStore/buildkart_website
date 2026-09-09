'use client';

import { useEffect } from 'react';
import { RotateCw } from 'lucide-react';

/**
 * The last resort.
 *
 * A Client Component by requirement — Next only accepts an error boundary as
 * one — which means it cannot read the locale cookie through `currentLocale()`.
 * So the copy is bilingual side by side rather than switched: this screen
 * appears when something has already gone wrong, and the one thing it must not
 * do is fail a second time reaching for a translation.
 *
 * The most likely cause in practice is `backend/api` being unreachable, since
 * every page on this site reads through it. That is what the wording points at
 * without saying anything a customer cannot act on.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The digest is what ties this screen to a line in the server log; the
    // message itself is not shown, because it may name internals.
    console.error('Storefront error', error.digest ?? error.message);
  }, [error]);

  return (
    <div className="page-w page-x py-16">
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-heading3 text-ink">Something went wrong</h1>
        <p className="mt-1 text-heading5 text-ink-muted">कुछ गड़बड़ हो गई</p>

        <p className="mt-4 text-body2 text-ink-muted">
          This is on us, not on you. Try again in a moment.
        </p>

        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex min-h-[var(--tap)] items-center gap-2 rounded-box bg-brand px-6 text-cta1 text-brand-foreground hover:bg-brand-dark"
        >
          <RotateCw className="size-4" aria-hidden />
          Try again
        </button>

        {error.digest && (
          <p className="mt-4 text-body5 text-ink-faint">Reference: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
