'use client';

import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { LocationSheet } from './location-sheet';
import type { Locale } from '@/lib/i18n';

/**
 * The delivery location, asked for once and reachable from anywhere.
 *
 * Mounted in the root layout so the header's pill, the cart and checkout can
 * all open the same sheet rather than navigating away mid-task — losing a cart
 * page to a full navigation just to answer "where are you" is the friction this
 * removes.
 *
 * `/location` still exists as a real URL. A delivery area is something people
 * send each other, and a link has to land somewhere; it renders the same picker
 * on its own page.
 */
type LocationContextValue = {
  /** Opens the sheet. Safe to call from any client component under the layout. */
  open: () => void;
};

const LocationContext = createContext<LocationContextValue>({ open: () => {} });

export function useLocationSheet(): LocationContextValue {
  return useContext(LocationContext);
}

export function LocationProvider({
  locale,
  hasLocation,
  children,
}: {
  locale: Locale;
  /** Whether a delivery area is already set, read from the cookie on the server. */
  hasLocation: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  /*
   * Without an area, the sheet is a **gate**: no close button, no backdrop
   * dismiss, no Escape. With one, it is an ordinary dialog they opened to
   * change something, and it closes normally.
   *
   * Blocking is the right call for this shop rather than a dark pattern.
   * Nothing on the site is true without a delivery area — not the price, which
   * moves with the delivery charge; not the promise, which is per-area; not
   * whether an item can be bought at all. A catalogue browsed without one is a
   * catalogue of numbers the shop would not honour, and the disappointment
   * lands at checkout instead of in the first five seconds.
   */
  const blocking = !hasLocation;

  /*
   * `/location` asks the same question on its own page, so the gate would sit
   * on top of a screen that already does its job. Suppressed there, and only
   * there.
   */
  const suppressed = pathname === '/location';

  const [open, setOpen] = useState(false);

  const openSheet = useCallback(() => setOpen(true), []);

  /*
   * Auto-open when there is no area, on every page until one is set.
   *
   * Note what this does *not* do: request geolocation permission. The sheet
   * appears, and the customer's tap on "Use my current location" is what asks
   * the browser. A permission dialog that fires on page load, before anyone has
   * said what they want, is the one people reflexively deny — and a denial is
   * sticky, so getting it wrong once costs the shop that customer's location
   * for good.
   */
  useEffect(() => {
    if (blocking && !suppressed) setOpen(true);
  }, [blocking, suppressed]);

  /** Closing by hand is only possible once an area exists. */
  const close = useCallback(() => {
    if (blocking) return;
    setOpen(false);
  }, [blocking]);

  /*
   * A serviced area was just committed, so the gate lifts — **without**
   * consulting `blocking`.
   *
   * That check would still be true here: it is derived from a server prop, and
   * the `router.refresh()` that flips it is in flight. Routing success through
   * `close` would leave the sheet shut behind its own gate whenever the refresh
   * was slower than the confirmation, which on a site connection is most of the
   * time.
   */
  const settled = useCallback(() => setOpen(false), []);

  return (
    <LocationContext.Provider value={{ open: openSheet }}>
      {children}
      {open && (
        <LocationSheet
          locale={locale}
          onClose={close}
          onSettled={settled}
          dismissible={!blocking}
        />
      )}
    </LocationContext.Provider>
  );
}
