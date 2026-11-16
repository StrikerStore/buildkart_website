'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { loadLocationSheet } from '@/app/location/actions';
import { AddressSheet } from '@/components/cart/address-sheet';
import type { Locale } from '@/lib/i18n';
import { LocationPrompt } from './location-prompt';
import { OutsideNotice } from './outside-notice';

/**
 * The header's location picker, the question a first visit opens with, and
 * what ADD opens for anyone without a delivery area.
 *
 * - Out of the delivery area: `OutsideNotice` first — where we do not deliver,
 *   where we do, and "tell me when you start" — with the picker one tap away.
 * - A signed-in customer with saved addresses: them, as a one-tap list.
 * - Everyone else: `LocationPrompt`, which sets a delivery area without a map;
 *   the exact pin is taken at checkout.
 *
 * Its contents load **on open**, not with the page. The sheet is mounted in the
 * root layout so the header can reach it, and fetching a customer's address
 * book plus the checkout config on every page view to fill a panel most visits
 * never open is the cost the mini cart avoids the same way.
 */
export function LocationSheet({
  locale,
  startChanging = false,
  onClose,
  onSettled,
}: {
  locale: Locale;
  /** Skip the out-of-area notice and open on the picker. */
  startChanging?: boolean;
  onClose: () => void;
  /** Fired when a place is committed: a serviced area, or a spot to look around from. */
  onSettled: () => void;
}) {
  const [data, setData] = useState<Awaited<ReturnType<typeof loadLocationSheet>> | null>(null);
  // "Change location" on the notice swaps to the picker in the same sheet.
  const [changing, setChanging] = useState(startChanging);

  useEffect(() => {
    let live = true;
    void loadLocationSheet().then((loaded) => live && setData(loaded));
    return () => {
      live = false;
    };
  }, []);

  if (!data) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50" aria-busy="true">
        <Loader2 className="size-7 animate-spin text-ink-inverted" aria-hidden />
      </div>
    );
  }

  if (data.outside && !changing) {
    return (
      <OutsideNotice
        locale={locale}
        spot={data.outside}
        servedAreas={data.servedAreas}
        signedInPhone={data.signedInPhone}
        onChange={() => setChanging(true)}
        onClose={onClose}
      />
    );
  }

  if (data.signedInPhone === null || data.addresses.length === 0) {
    return (
      <LocationPrompt
        locale={locale}
        signedInPhone={data.signedInPhone}
        provider={data.mapDefault.provider}
        onClose={onClose}
        onSettled={onSettled}
      />
    );
  }

  const pin =
    data.current?.latitude && data.current.longitude
      ? { lat: Number(data.current.latitude), lng: Number(data.current.longitude) }
      : null;

  return (
    <AddressSheet
      locale={locale}
      signedIn={data.signedInPhone !== null}
      addresses={data.addresses}
      selectedId={data.selectedAddressId}
      mapDefault={data.mapDefault}
      currentPin={pin}
      receiver={{ name: data.signedInName ?? '', phone: data.signedInPhone ?? '' }}
      onClose={onClose}
      onSettled={onSettled}
      rememberOutside
    />
  );
}
