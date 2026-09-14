'use client';

import { useEffect } from 'react';
import { recordViewed } from '@/app/products/[handle]/actions';

/**
 * Records this product as viewed, once, after the page has painted.
 *
 * Renders nothing. It exists because setting a cookie is not something a Server
 * Component may do while rendering, and this site has no middleware to do it on
 * the way past — so the smallest possible client component fires the action
 * instead.
 *
 * Deliberately unawaited and unguarded by any pending state: nothing on screen
 * depends on it, and a shopper on a weak connection should never wait on a
 * write that only affects what they see *next* time.
 */
export function RecordView({ handle }: { handle: string }) {
  useEffect(() => {
    void recordViewed(handle);
  }, [handle]);

  return null;
}
