'use client';

import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { skipLocation } from '@/app/location/actions';
import { LocationSheet } from './location-sheet';
import type { Locale } from '@/lib/i18n';
import type { OutsideSpot } from '@/lib/location-shared';

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
type OpenOptions = {
  /**
   * Straight to the picker, past the out-of-area notice — for "Change" and the
   * header pill, where the visitor has already said what they want.
   */
  change?: boolean;
};

type LocationContextValue = {
  /** Opens the sheet. Safe to call from any client component under the layout. */
  open: (options?: OpenOptions) => void;
  /**
   * Whether anything can be added to the cart: only with a serviced delivery
   * area. Without one, ADD opens the sheet instead — the "not available"
   * notice for an out-of-area visitor, the location prompt for everyone else.
   */
  canOrder: boolean;
  /** Where an out-of-area visitor is looking around from, or null. */
  outside: OutsideSpot | null;
};

const LocationContext = createContext<LocationContextValue>({
  open: () => {},
  canOrder: true,
  outside: null,
});

export function useLocationSheet(): LocationContextValue {
  return useContext(LocationContext);
}

export function LocationProvider({
  locale,
  hasLocation,
  outside,
  skipped,
  children,
}: {
  locale: Locale;
  /** Whether a serviced delivery area is set, read from the cookie on the server. */
  hasLocation: boolean;
  /** Outside the delivery area, and where; see `BROWSE_COOKIE`. */
  outside: OutsideSpot | null;
  /** Closed or skipped the popup without saying where they are. */
  skipped: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  /*
   * Never a gate. Anyone, from anywhere, can look around the whole shop: the
   * catalogue, the prices, the calculators. What needs a delivery area is the
   * *cart*, so that is where the question is asked — ADD opens this sheet
   * rather than adding — and the order itself is refused again by the API for
   * an address we do not serve.
   *
   * A first visit is still asked once, up front, because most visitors are in
   * the area and the answer is what makes the prices theirs. It closes like
   * any other dialog, and closing it is remembered (`skipLocation`) so it is
   * not pushed at them again on every page.
   */
  const firstVisit = !hasLocation && outside === null && !skipped;

  /*
   * `/location` asks the same question on its own page, so the popup would sit
   * on top of a screen that already does its job. Suppressed there, and only
   * there.
   */
  const suppressed = pathname === '/location';

  /** Null while shut; otherwise how it was opened. */
  const [sheet, setSheet] = useState<OpenOptions | null>(null);

  /*
   * Auto-opened once per visit, not once per page. The layout stays mounted
   * across client navigations, and without this a visitor who closed the popup
   * would see it again on the next page until the server's answer caught up.
   */
  const asked = useRef(false);

  const openSheet = useCallback(
    (options?: OpenOptions) => setSheet({ change: options?.change === true }),
    [],
  );

  /*
   * Note what this does *not* do: request geolocation permission. The sheet
   * appears, and the customer's tap on "Use my location" is what asks the
   * browser. A permission dialog that fires on page load, before anyone has
   * said what they want, is the one people reflexively deny — and a denial is
   * sticky, so getting it wrong once costs the shop that customer's location
   * for good.
   */
  useEffect(() => {
    if (firstVisit && !suppressed && !asked.current) {
      asked.current = true;
      setSheet({});
    }
  }, [firstVisit, suppressed]);

  /**
   * Closed without choosing. On a first visit that is a skip, and it is
   * remembered; otherwise it is only a dialog closing.
   */
  const close = useCallback(() => {
    setSheet(null);
    if (firstVisit) void skipLocation().catch(() => {});
  }, [firstVisit]);

  /*
   * A place was just committed — a serviced area, or an out-of-area spot to
   * look around from — so the sheet closes without the skip `close` records.
   * The `router.refresh()` that brings the new prices is already in flight.
   */
  const settled = useCallback(() => setSheet(null), []);

  return (
    <LocationContext.Provider value={{ open: openSheet, canOrder: hasLocation, outside }}>
      {children}
      {sheet && (
        <LocationSheet
          locale={locale}
          startChanging={sheet.change === true}
          onClose={close}
          onSettled={settled}
        />
      )}
    </LocationContext.Provider>
  );
}
