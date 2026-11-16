'use client';

import { useLocationSheet } from './location-provider';

/**
 * A plain text button that opens the location sheet on its picker, for
 * server-rendered notices that need one action and none of the header pill's
 * layout.
 */
export function OpenLocationButton({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { open } = useLocationSheet();
  return (
    <button
      type="button"
      onClick={() => open({ change: true })}
      aria-haspopup="dialog"
      className={className}
    >
      {children}
    </button>
  );
}
