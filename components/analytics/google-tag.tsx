'use client';

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import type { ConsentChoices } from '@StrikerStore/contract';
import { analyticsAllowed, CONSENT_CHANGED, currentChoices } from '@/lib/consent-state';
import { googleAllowed, googlePageView, initGoogleTag, updateGoogleConsent } from '@/lib/google-tag';

/**
 * Loads the Google tag (Google Ads), the same way `<MetaPixel>` loads Meta's:
 * only for a shopper whose marketing yes covers Google. Before that the library
 * is not even requested.
 *
 * Mounted by the root layout only when `GOOGLE_TAG_ID` is set, so a local or
 * preview build never sends anything to Google.
 *
 * A yes given on this page loads it there and then; a yes taken back stops it
 * for the rest of the page, and on the next page it is not loaded at all.
 */
export function GoogleTag({ tagId, initialGranted }: { tagId: string; initialGranted: boolean }) {
  const [granted, setGranted] = useState(initialGranted);

  useEffect(() => {
    // The page may have come from a cache that predates the answer.
    setGranted(googleAllowed(currentChoices()));

    const onChange = (event: Event) => {
      const next = googleAllowed((event as CustomEvent<ConsentChoices>).detail ?? null);
      setGranted(next);
      updateGoogleConsent(next);
    };
    window.addEventListener(CONSENT_CHANGED, onChange);
    return () => window.removeEventListener(CONSENT_CHANGED, onChange);
  }, []);

  useEffect(() => {
    if (granted) initGoogleTag(tagId, analyticsAllowed());
  }, [granted, tagId]);

  if (!granted) return null;

  return (
    <>
      <Script
        id="google-tag"
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(tagId)}`}
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
