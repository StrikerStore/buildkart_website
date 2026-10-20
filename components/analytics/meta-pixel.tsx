'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
import type { ConsentChoices } from '@StrikerStore/contract';
import { CONSENT_CHANGED, marketingAllowed } from '@/lib/consent-state';
import { grantConsent, initPixel, revokeConsent } from '@/lib/meta-pixel';

/**
 * Loads the Meta Pixel — but only for a shopper who said yes to marketing on
 * the cookie banner. Before that not a byte goes to Meta: the library is not
 * even requested, so nothing is fetched from Meta's servers either.
 *
 * Mounted by the root layout only when a pixel id is set, so a local or
 * preview build never sends anything to Meta.
 *
 * A yes given on this page loads the pixel there and then; a yes taken back
 * revokes it for the rest of the page, and on the next page it is not loaded
 * at all. There is deliberately no `<noscript>` image: it would send a page
 * view to Meta whatever the shopper had answered.
 *
 * Page views are not fired from here: `<PageViews>` reports them on every soft
 * navigation, through `track()`, which itself checks the answer.
 */
export function MetaPixel({
  pixelId,
  externalId,
  initialGranted,
}: {
  pixelId: string;
  /** SHA-256 of the signed-in customer's id; see `initPixel`. */
  externalId?: string | null;
  /** The answer as the server read it from the cookie, for the first paint. */
  initialGranted: boolean;
}) {
  const [granted, setGranted] = useState(initialGranted);

  useEffect(() => {
    // The page may have come from a cache that predates the answer.
    setGranted(marketingAllowed());

    const onChange = (event: Event) => {
      const next = (event as CustomEvent<ConsentChoices>).detail?.marketing === true;
      setGranted(next);
      if (next) grantConsent();
      else revokeConsent();
    };
    window.addEventListener(CONSENT_CHANGED, onChange);
    return () => window.removeEventListener(CONSENT_CHANGED, onChange);
  }, []);

  useEffect(() => {
    if (granted) initPixel(pixelId, externalId);
  }, [granted, pixelId, externalId]);

  if (!granted) return null;

  return (
    <Script
      id="meta-pixel"
      src="https://connect.facebook.net/en_US/fbevents.js"
      strategy="afterInteractive"
    />
  );
}
