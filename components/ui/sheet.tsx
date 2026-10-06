'use client';

import { useEffect } from 'react';
import { ChevronLeft, X } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * A bottom sheet on a phone and a centred dialog on a desktop.
 *
 * The shape the location sheet, quick options and coupon list each built by
 * hand; this is that pattern once, with the two behaviours a native `<dialog>`
 * would have given — Escape closes, the page behind does not scroll.
 *
 * `size="half"` rises to about half the screen on a phone, for a short list
 * the customer picks from and leaves. `size="full"` takes nearly all of it, for
 * a map or a form that needs the room.
 */
export function Sheet({
  title,
  onClose,
  onBack,
  size = 'half',
  closeLabel = 'Close',
  backLabel = 'Back',
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  /** Shows a back chevron in place of the title's left edge, for staged sheets. */
  onBack?: () => void;
  size?: 'half' | 'full';
  closeLabel?: string;
  backLabel?: string;
  children: React.ReactNode;
  /** Pinned under the scrolling body — a primary action that must stay in reach. */
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 z-50 bg-ink/50" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'fixed z-50 flex flex-col overflow-hidden bg-surface-muted shadow-sheet',
          'inset-x-0 bottom-0 rounded-t-card',
          size === 'half' ? 'max-h-[62dvh]' : 'h-[94dvh]',
          'sm:inset-0 sm:m-auto sm:w-[540px] sm:rounded-card',
          size === 'half' ? 'sm:h-fit sm:max-h-[80vh]' : 'sm:h-[86vh]',
        )}
      >
        {/* The grab handle says "this slides" on a phone; a desktop dialog needs none. */}
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-pill bg-hairline-strong sm:hidden" aria-hidden />

        <div className="flex shrink-0 items-center gap-2 border-b border-hairline bg-surface px-3 py-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label={backLabel}
              className="grid size-9 shrink-0 place-items-center rounded-box text-ink hover:bg-surface-muted"
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>
          )}
          <h2 className={cn('min-w-0 flex-1 truncate text-heading4 text-ink', !onBack && 'pl-1')}>
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="grid size-9 shrink-0 place-items-center rounded-box text-ink-muted hover:bg-surface-muted"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>

        {footer && <div className="shrink-0 border-t border-hairline bg-surface p-3">{footer}</div>}
      </div>
    </>
  );
}
