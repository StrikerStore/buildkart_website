'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Loader2, X } from 'lucide-react';
import type { MyAddressDto } from '@buildkart/contract';
import type { StoredLocation } from '@/lib/location-shared';
import { LocationPicker } from '@/app/location/location-picker';
import { loadLocationSheet } from '@/app/location/actions';
import { cn } from '@/lib/cn';
import type { Locale } from '@/lib/i18n';

/**
 * The location picker, as a sheet over whatever the customer was doing.
 *
 * A bottom sheet on a phone and a centred dialog above it — the same shape the
 * mini cart uses, for the same reason: a full-height panel is right on a 360px
 * screen and overkill on a desktop.
 *
 * Its contents load **on open**, not with the page. The sheet is mounted in the
 * root layout so the header can reach it, and fetching a customer's address book
 * plus the checkout config on every page view to fill a panel most visits never
 * open is exactly the cost the mini cart avoids the same way.
 */
export function LocationSheet({
  locale,
  onClose,
  onSettled,
  dismissible,
}: {
  locale: Locale;
  onClose: () => void;
  /** Fired when a serviced area is committed. Lifts the gate; see the provider. */
  onSettled: () => void;
  /**
   * False until a delivery area exists, and then the sheet is a **gate**: no
   * close button, no backdrop dismiss, no Escape.
   *
   * Not obstruction for its own sake. Without an area nothing on this site is
   * true — the price moves with the delivery charge, the promise is per-area,
   * and whether an item can be bought at all depends on it. Letting somebody
   * browse first only moves the disappointment to checkout.
   */
  dismissible: boolean;
}) {
  const [data, setData] = useState<{
    addresses: MyAddressDto[];
    current: StoredLocation | null;
    signedInPhone: string | null;
    mapDefault: { lat: number; lng: number; zoom: number };
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const panel = useRef<HTMLDivElement>(null);
  const hi = locale === 'hi';

  useEffect(() => {
    startTransition(async () => setData(await loadLocationSheet()));
  }, []);

  /*
   * Escape closes, and the page behind does not scroll while the sheet is up.
   * Both are things a `<dialog>` would give for free — but this needs to fetch
   * on open and re-render as the picker walks through its stages, which the
   * native element has no hook for.
   */
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
        className="fixed inset-0 z-50 bg-ink/50"
        onClick={dismissible ? onClose : undefined}
        aria-hidden
      />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={hi ? 'डिलीवरी की जगह' : 'Delivery location'}
        className={cn(
          'fixed z-50 flex flex-col overflow-hidden bg-surface shadow-sheet',
          'inset-x-0 bottom-0 max-h-[92vh] rounded-t-card',
          'sm:inset-0 sm:m-auto sm:h-fit sm:max-h-[88vh] sm:w-[540px] sm:rounded-card',
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-hairline px-4 py-3">
          <div>
            <h2 className="text-heading4 text-ink">
              {hi ? 'हम कहाँ डिलीवर करें?' : 'Where should we deliver?'}
            </h2>
            <p className="mt-0.5 text-body4 text-ink-muted">
              {dismissible
                ? hi
                  ? 'सटीक जगह चाहिए ताकि माल सीधे आपके गेट पर पहुँचे।'
                  : 'We need your exact spot so the load reaches your gate.'
                : /* A locked dialog with no explanation reads as a broken site.
                     This says what is being asked and why, in one line. */
                  hi
                  ? 'भाव और डिलीवरी का समय इलाक़े पर निर्भर करता है — शुरू करने के लिए जगह चुनें।'
                  : 'Prices and delivery times depend on the area, so we need this before you start.'}
            </p>
          </div>

          {/* No way out until an area is set — see `dismissible`. */}
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              aria-label={hi ? 'बंद करें' : 'Close'}
              className="grid size-9 shrink-0 place-items-center rounded-box text-ink hover:bg-surface-muted"
            >
              <X className="size-5" aria-hidden />
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          {!data ? (
            <div className="grid place-items-center py-14">
              <Loader2 className="size-6 animate-spin text-ink-faint" aria-hidden />
            </div>
          ) : (
            <LocationPicker
              locale={locale}
              current={data.current}
              addresses={data.addresses}
              signedInPhone={data.signedInPhone}
              mapDefault={data.mapDefault}
              onSettled={onSettled}
            />
          )}

          {pending && data && (
            <p className="pb-2 text-center text-body5 text-ink-faint">
              {hi ? 'लोड हो रहा है…' : 'Loading…'}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
