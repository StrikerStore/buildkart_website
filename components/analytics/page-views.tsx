'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { track } from '@/lib/meta-pixel';

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
  // useSearchParams needs a Suspense boundary or it opts the whole route out
  // of static rendering.
  return (
    <Suspense fallback={null}>
      <PageViewsInner />
    </Suspense>
  );
}
