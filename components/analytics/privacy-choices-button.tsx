'use client';

import { openChoices } from '@/lib/consent-client';

/**
 * Reopens the cookie banner with the current answers filled in — the
 * permanent way back to a choice made once, which the DPDP Act asks to be as
 * easy to change as it was to give.
 */
export function PrivacyChoicesButton({ label, className }: { label: string; className?: string }) {
  return (
    <button type="button" onClick={openChoices} className={className}>
      {label}
    </button>
  );
}
