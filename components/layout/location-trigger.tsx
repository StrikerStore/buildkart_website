'use client';

import { useLocationSheet } from '@/components/location/location-provider';

/**
 * The thin client shell that opens the location sheet.
 *
 * Exists so `LocationButton` can stay a Server Component. Everything visible —
 * the area name, the delivery promise, whether one is set at all — is rendered
 * on the server from the cookie and passed in as `children`; this adds nothing
 * but the click. That keeps the header's first paint correct and keeps the
 * cookie read off the client, where it would flash the wrong label.
 */
export function LocationTrigger({
  label,
  children,
}: {
  /** Announced to a screen reader, since the visible content is a layout. */
  label: string;
  children: React.ReactNode;
}) {
  const { open } = useLocationSheet();

  return (
    <button
      type="button"
      onClick={open}
      aria-label={label}
      aria-haspopup="dialog"
      className="flex h-[var(--tap)] min-w-0 items-center gap-2 rounded-box px-2 text-left hover:bg-surface-muted"
    >
      {children}
    </button>
  );
}
