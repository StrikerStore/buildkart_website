'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
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
 *
 * `placement="corner"` is for something opened from the floating button: on a
 * desktop the panel sits above that button, instead of the middle of the screen,
 * with no dimming. A phone gets the same bottom sheet either way.
 *
 * Focus stays inside while it is open and goes back where it came from after,
 * which is what `aria-modal` promises a keyboard or screen reader user.
 */
export function Sheet({
  title,
  onClose,
  onBack,
  size = 'half',
  placement = 'center',
  closeLabel = 'Close',
  backLabel = 'Back',
  children,
  footer,
  dismissible = true,
}: {
  title: string;
  onClose: () => void;
  /** Shows a back chevron in place of the title's left edge, for staged sheets. */
  onBack?: () => void;
  size?: 'half' | 'full';
  /**
   * Where it sits from 640px up; a phone gets the bottom sheet. `popup` is the
   * exception: a small card in the middle of every screen, with the page still
   * visible around it, for a short question rather than a task.
   */
  placement?: 'center' | 'corner' | 'popup';
  closeLabel?: string;
  backLabel?: string;
  children: React.ReactNode;
  /** Pinned under the scrolling body — a primary action that must stay in reach. */
  footer?: React.ReactNode;
  /**
   * False makes the sheet a gate: no close button, no backdrop or Escape
   * dismiss. For a question the page cannot work without the answer to.
   */
  dismissible?: boolean;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  /*
   * Into the sheet on opening, back out on closing. A layout effect, so it runs
   * before any child's own effect: the opener is still the focused element, and
   * a child that then focuses its own field, such as the COD code's first box,
   * simply takes over from the sheet.
   */
  useLayoutEffect(() => {
    const opener = document.activeElement;
    const dialog = dialogRef.current;
    if (dialog && !dialog.contains(document.activeElement)) dialog.focus();
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);

  /** Tab goes round the sheet rather than out into the page behind it. */
  function keepFocusInside(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Tab') return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const stops = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => element.tabIndex !== -1 && !element.closest('[aria-hidden="true"]'));

    const first = stops[0];
    const last = stops[stops.length - 1];
    if (!first || !last) {
      event.preventDefault();
      return;
    }

    const active = document.activeElement;
    // After a stage change the focused button can be gone, leaving focus nowhere.
    if (!dialog.contains(active) || active === dialog) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    } else if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && dismissible) onClose();
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose, dismissible]);

  return (
    <>
      <div
        className={cn('fixed inset-0 z-50 bg-ink/50', placement === 'corner' && 'sm:bg-transparent')}
        onClick={dismissible ? onClose : undefined}
        aria-hidden
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onKeyDown={keepFocusInside}
        className={cn(
          'fixed z-50 flex flex-col overflow-hidden bg-surface-muted shadow-sheet outline-none',
          placement === 'popup'
            ? 'inset-4 m-auto h-fit max-h-[80dvh] max-w-[440px] rounded-card'
            : [
                'inset-x-0 bottom-0 rounded-t-card',
                size === 'half' ? 'max-h-[62dvh]' : 'h-[94dvh]',
                placement === 'center'
                  ? [
                      'sm:inset-0 sm:m-auto sm:w-[540px] sm:rounded-card',
                      size === 'half' ? 'sm:h-fit sm:max-h-[80vh]' : 'sm:h-[86vh]',
                    ]
                  : [
                      'sm:inset-x-auto sm:right-6 sm:bottom-24 sm:w-[380px] sm:rounded-card',
                      size === 'half' ? 'sm:h-fit sm:max-h-[70vh]' : 'sm:h-[min(560px,80vh)]',
                    ],
              ],
        )}
      >
        {/* The grab handle says "this slides" on a phone; a desktop dialog needs none. */}
        {placement !== 'popup' && (
          <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-pill bg-hairline-strong sm:hidden" aria-hidden />
        )}

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
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className="grid size-9 shrink-0 place-items-center rounded-box text-ink-muted hover:bg-surface-muted"
            >
              <X className="size-5" aria-hidden />
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>

        {footer && <div className="shrink-0 border-t border-hairline bg-surface p-3">{footer}</div>}
      </div>
    </>
  );
}
