'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import type { ConsentChoices } from '@StrikerStore/contract';
import { CONSENT_CHANGED } from '@/lib/consent-state';
import { track } from '@/lib/meta-pixel';
import { onConsentChanged } from '@/lib/visit';

/**
 * A page view for every page a shopper sees — to the storefront's own session
 * beacon always, and to the Meta Pixel when it is on.
 *
 * On every pathname/query change rather than once per document: navigation on
 * this site is App Router soft navigation, so the document loads once and
 * `<Link>` swaps the page.
 *
 * Mounted by the root layout whether or not the pixel is configured, because
 * sessions are the shop's own analytics and do not depend on Meta.
 *
 * It also hears the banner: a yes to analytics part-way through a page turns
 * that page's anonymous count into the start of a session (`onConsentChanged`).
 */
function PageViewsInner() {
  const pathname = usePathname();
  const search = useSearchParams().toString();

  useEffect(() => {
    track('PageView');
  }, [pathname, search]);

  return null;
}

export function PageViews() {
  useEffect(() => {
    const onChange = (event: Event) => onConsentChanged((event as CustomEvent<ConsentChoices>).detail);
    window.addEventListener(CONSENT_CHANGED, onChange);
    return () => window.removeEventListener(CONSENT_CHANGED, onChange);
  }, []);

  // useSearchParams needs a Suspense boundary or it opts the whole route out
  // of static rendering.
  return (
    <Suspense fallback={null}>
      <PageViewsInner />
    </Suspense>
  );
}
