'use client';

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import type { ConsentChoices } from '@StrikerStore/contract';
import { CONSENT_CHANGED, currentChoices } from '@/lib/consent-state';
import {
  googleAllowed,
  googlePageView,
  initGoogleTag,
  updateGoogleConsent,
  type GoogleAllowed,
  type GoogleIds,
} from '@/lib/google-tag';

/**
 * Loads the Google tag, the same way `<MetaPixel>` loads Meta's: one
 * `gtag.js` for Google Ads and GA4, requested only once a shopper's yes
 * covers at least one of them. Before that the library is not even requested.
 *
 * Mounted by the root layout only when an id is set, so a local or preview
 * build never sends anything to Google.
 *
 * A yes given on this page configures that destination there and then; a yes
 * taken back stops it for the rest of the page, and on the next page it is not
 * configured at all.
 */
export function GoogleTag({ ids, initialAllowed }: { ids: GoogleIds; initialAllowed: GoogleAllowed }) {
  const [allowed, setAllowed] = useState(initialAllowed);
  const { ads, analytics } = ids;

  useEffect(() => {
    const running = { ads, analytics };
    // The page may have come from a cache that predates the answer.
    setAllowed(googleAllowed(currentChoices(), running));

    const onChange = (event: Event) => {
      const next = googleAllowed((event as CustomEvent<ConsentChoices>).detail ?? null, running);
      setAllowed(next);
      updateGoogleConsent(next);
    };
    window.addEventListener(CONSENT_CHANGED, onChange);
    return () => window.removeEventListener(CONSENT_CHANGED, onChange);
  }, [ads, analytics]);

  const any = allowed.ads || allowed.analytics;
  useEffect(() => {
    if (any) initGoogleTag({ ads, analytics }, allowed);
  }, [any, ads, analytics, allowed]);

  if (!any) return null;

  /*
   * Whichever id is allowed (an allowed one is never null); gtag.js fetches the
   * other destination's code when that is configured. `id` keeps next/script
   * from loading it again when the answer, and so this src, changes.
   */
  const loader = (allowed.ads ? ads : analytics) ?? '';

  return (
    <>
      <Script
        id="google-tag"
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(loader)}`}
        strategy="afterInteractive"
      />
      {/* useSearchParams needs a Suspense boundary, or the whole route opts out
          of static rendering. */}
      <Suspense fallback={null}>
        <GooglePageViews />
      </Suspense>
    </>
  );
}

/**
 * Client-side navigations; the first page view is sent by `config`.
 *
 * Keyed on the address rather than on "not the first run", so an effect that
 * runs twice for the same page (React's development mode does) sends nothing
 * twice.
 */
function GooglePageViews() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const address = search ? `${pathname}?${search}` : pathname;
  const sent = useRef(address);

  useEffect(() => {
    if (sent.current === address) return;
    sent.current = address;
    googlePageView();
  }, [address]);

  return null;
}
