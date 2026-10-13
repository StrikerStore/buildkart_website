'use client';

import Script from 'next/script';
import { useEffect } from 'react';
import { initPixel } from '@/lib/meta-pixel';

/**
 * Loads the Meta Pixel.
 *
 * Mounted by the root layout only when `META_PIXEL_ID` is set, so a local or
 * preview build never sends a byte to Meta.
 *
 * Page views are not fired from here: `<PageViews>` reports them on every soft
 * navigation, to the shop's own session beacon and — through `track()` — to
 * this pixel once it is initialised. The bootstrap snippet's single PageView
 * would count a whole App Router visit as one page.
 *
 * `afterInteractive`: the library is ~70 KB that nothing on screen needs, so
 * it waits for hydration instead of competing with the page's own JavaScript
 * on a site-connection phone. Events fired before it lands are queued by the
 * stub `initPixel` installs and replayed when it does.
 */
export function MetaPixel({
  pixelId,
  externalId,
}: {
  pixelId: string;
  /** SHA-256 of the signed-in customer's id; see `initPixel`. */
  externalId?: string | null;
}) {
  useEffect(() => {
    initPixel(pixelId, externalId);
  }, [pixelId, externalId]);

  return (
    <>
      <Script
        id="meta-pixel"
        src="https://connect.facebook.net/en_US/fbevents.js"
        strategy="afterInteractive"
      />
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          alt=""
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${encodeURIComponent(pixelId)}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}
