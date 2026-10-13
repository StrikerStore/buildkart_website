'use client';

import { useEffect } from 'react';
import {
  eventId as freshEventId,
  track,
  type PixelEvent,
  type PixelParams,
} from '@/lib/meta-pixel';

/**
 * Fires one Meta Pixel event when it mounts. Renders nothing.
 *
 * Exists so a Server Component — the product page, search results, the order
 * confirmation — can report an event with data it already has, without turning
 * the page into a Client Component. Props must be serialisable.
 *
 * `onceKey` makes the event fire once per browser, not once per render: the
 * order page keeps `?placed=1` in its URL, so a refresh would otherwise report
 * the same purchase twice. Storage can be unavailable (private mode, blocked
 * site data); then it falls back to firing, and the `eventId` is what lets Meta
 * collapse the duplicate.
 */
export function TrackEvent({
  name,
  params,
  eventId,
  onceKey,
}: {
  name: PixelEvent;
  params?: PixelParams;
  eventId?: string;
  onceKey?: string;
}) {
  // Serialised so a parent re-render with an equal-but-new object does not
  // re-fire the event.
  const signature = JSON.stringify([name, params, eventId, onceKey]);

  useEffect(() => {
    if (onceKey && seen(onceKey)) return;
    track(name, params, eventId ?? freshEventId(name.toLowerCase()));
    if (onceKey) remember(onceKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return null;
}

function seen(key: string) {
  try {
    return window.localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

function remember(key: string) {
  try {
    window.localStorage.setItem(key, String(Date.now()));
  } catch {
    // Nothing to do: the eventId still deduplicates on Meta's side.
  }
}
