'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { loadLocationSheet } from '@/app/location/actions';
import { AddressSheet } from '@/components/cart/address-sheet';
import type { Locale } from '@/lib/i18n';

/**
 * The header's location picker — the same sheet, stages and look as the cart's
 * "Add address to proceed", so choosing where to deliver works one way
 * everywhere: saved addresses first, then a map, then the house details.
 *
 * Its contents load **on open**, not with the page. The sheet is mounted in the
 * root layout so the header can reach it, and fetching a customer's address
 * book plus the checkout config on every page view to fill a panel most visits
 * never open is the cost the mini cart avoids the same way.
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
   * close button, no backdrop dismiss, no Escape. Without an area nothing on
   * this site is true — prices move with the delivery charge, and whether an
   * item can be bought at all depends on it.
   */
  dismissible: boolean;
}) {
  const [data, setData] = useState<Awaited<ReturnType<typeof loadLocationSheet>> | null>(null);

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
      dismissible={dismissible}
    />
  );
}
