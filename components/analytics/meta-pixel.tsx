'use client';

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { initPixel, track } from '@/lib/meta-pixel';

/**
 * Loads the Meta Pixel and reports a PageView for every page a shopper sees.
 *
 * Mounted by the root layout only when `META_PIXEL_ID` is set, so a local or
 * preview build never sends a byte to Meta.
 *
 * PageView is fired from here on every pathname/query change rather than once
 * in the bootstrap snippet. Navigation on this site is App Router soft
 * navigation — the document loads once and `<Link>` swaps the page — so the
 * snippet's single PageView would count a whole visit as one page.
 *
 * `afterInteractive`: the library is ~70 KB that nothing on screen needs, so
 * it waits for hydration instead of competing with the page's own JavaScript
 * on a site-connection phone. Events fired before it lands are queued by the
 * stub `initPixel` installs and replayed when it does.
 */
export function MetaPixel({ pixelId }: { pixelId: string }) {
  useEffect(() => {
    initPixel(pixelId);
  }, [pixelId]);

  return (
    <>
      <Script
        id="meta-pixel"
        src="https://connect.facebook.net/en_US/fbevents.js"
        strategy="afterInteractive"
      />
      {/* useSearchParams needs a Suspense boundary or it opts the whole
          route out of static rendering. */}
      <Suspense fallback={null}>
        <PageViews />
      </Suspense>
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

function PageViews() {
  const pathname = usePathname();
  const search = useSearchParams().toString();

  useEffect(() => {
    track('PageView');
  }, [pathname, search]);

  return null;
}
