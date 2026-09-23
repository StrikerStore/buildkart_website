// `tsconfig` limits global types to `node`; this file alone needs `google.maps`.
/// <reference types="google.maps" />
'use client';

import { useEffect, useRef } from 'react';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import type { LeafletMapProps } from './leaflet-map';

/**
 * The map, drawn by Google.
 *
 * A drop-in for `leaflet-map.tsx` — same props, same centre-pin gesture, same
 * one report per settled gesture — chosen by `map-picker.tsx` when the shop's
 * `checkout.location` provider is Google and a browser key is set. Reached only
 * through `dynamic(..., { ssr: false })` there, like its sibling: the Maps
 * script is browser-only.
 *
 * No marker here either. The parent draws the pin over the map, so this needs
 * no Map ID and no marker library — only the base `maps` library.
 *
 * `onFailed` is the escape hatch. A key that is wrong, restricted to other
 * domains or missing an enabled API does not throw: Google greys the map out
 * and calls `window.gm_authFailure`. The parent swaps to Leaflet on either
 * signal, so a misconfigured key costs the shop its Google tiles, never its
 * location picker.
 */
export type GoogleMapProps = LeafletMapProps & {
  apiKey: string;
  language: 'en' | 'hi';
  onFailed: () => void;
};

/*
 * The Maps script loads once per page and its options cannot change after
 * that — a second `setOptions` is ignored with a console warning. Every map on
 * the page shares the first key and language, which is what the shop has.
 */
let configured = false;

function configure(apiKey: string, language: 'en' | 'hi') {
  if (configured) return;
  setOptions({ key: apiKey, v: 'weekly', region: 'IN', language });
  configured = true;
}

declare global {
  interface Window {
    /** Called by the Maps script when the key is refused. */
    gm_authFailure?: () => void;
  }
}

export default function GoogleMap({
  centre,
  zoom,
  onMoved,
  recentreToken,
  apiKey,
  language,
  onFailed,
}: GoogleMapProps) {
  const holder = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);

  // Callbacks in refs so the mount effect runs once; see `leaflet-map.tsx`.
  const moved = useRef(onMoved);
  moved.current = onMoved;
  const failed = useRef(onFailed);
  failed.current = onFailed;

  useEffect(() => {
    let cancelled = false;
    let idle: google.maps.MapsEventListener | null = null;

    window.gm_authFailure = () => failed.current();
    configure(apiKey, language);

    importLibrary('maps')
      .then(({ Map }) => {
        if (cancelled || !holder.current) return;

        const instance = new Map(holder.current, {
          center: centre,
          zoom,
          // The pin is the control; buttons and POI popups only get in its way.
          disableDefaultUI: true,
          clickableIcons: false,
          keyboardShortcuts: false,
          // One finger pans. The default ("cooperative") wants two on a phone,
          // which breaks the drag-the-map-under-the-pin gesture outright.
          gestureHandling: 'greedy',
        });

        /*
         * `idle` is Google's `moveend`: once per settled gesture, not per frame,
         * because the parent reverse-geocodes on every report. The first one
         * fires for the opening view, which the parent has already resolved —
         * Leaflet never reports that, so neither does this.
         */
        let opened = false;
        idle = instance.addListener('idle', () => {
          if (!opened) {
            opened = true;
            return;
          }
          const point = instance.getCenter();
          if (point) moved.current({ lat: point.lat(), lng: point.lng() });
        });

        map.current = instance;
      })
      .catch(() => {
        // Blocked script, no network, bad key format — Leaflet takes over.
        if (!cancelled) failed.current();
      });

    return () => {
      cancelled = true;
      idle?.remove();
      map.current = null;
      if (window.gm_authFailure) window.gm_authFailure = undefined;
    };
    // Mount once; later views arrive through the recentre effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Programmatic recentring — a GPS fix or a chosen search result.
  useEffect(() => {
    if (!map.current || recentreToken === 0) return;
    map.current.setZoom(zoom);
    map.current.panTo(centre);
    // Only when the token moves; see `recentreToken` in `leaflet-map.tsx`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentreToken]);

  return <div ref={holder} className="size-full" aria-hidden />;
}
