'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * The map itself.
 *
 * **Never imported directly.** Leaflet touches `window` at module scope, so this
 * file is only ever reached through `map-picker.tsx`, which pulls it in with
 * `dynamic(..., { ssr: false })`. Importing it from a Server Component — or even
 * statically from a Client one — breaks the build.
 *
 * There is no Leaflet marker here, and that is deliberate twice over. The pin is
 * a plain `<div>` drawn at the centre of the container by the parent, with the
 * tiles panning underneath it: that is the quick-commerce gesture (you move the
 * world, not the pin), it gives a large fixed tap target on a phone, and it
 * sidesteps Leaflet's well-known broken-marker-icon problem under bundlers,
 * which otherwise needs image paths patching by hand.
 */
export type LeafletMapProps = {
  centre: { lat: number; lng: number };
  zoom: number;
  /** Fired after the map settles, with the coordinate now under the pin. */
  onMoved: (centre: { lat: number; lng: number }) => void;
  /**
   * Bumped by the parent to re-centre the map — on a GPS fix, or a search hit.
   *
   * A counter rather than watching `centre`, because `centre` also changes as a
   * *result* of dragging. Recentring on that would fight the customer's finger.
   */
  recentreToken: number;
};

export default function LeafletMap({ centre, zoom, onMoved, recentreToken }: LeafletMapProps) {
  const holder = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);

  /*
   * The callback in a ref, so the effect below can stay mounted for the life of
   * the component. Listing `onMoved` as a dependency would tear down and rebuild
   * the whole map every time the parent re-rendered with a new closure.
   */
  const moved = useRef(onMoved);
  moved.current = onMoved;

  useEffect(() => {
    if (!holder.current || map.current) return;

    const instance = L.map(holder.current, {
      center: [centre.lat, centre.lng],
      zoom,
      // The pin is the control; a second way to move the map only confuses.
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      // Required by the OSM tile usage policy. Not optional, and not decoration.
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(instance);

    /*
     * `moveend` rather than `move`: the parent reverse-geocodes on every
     * report, and firing that on each frame of a drag would be dozens of
     * geocoding calls per gesture.
     */
    instance.on('moveend', () => {
      const point = instance.getCenter();
      moved.current({ lat: point.lat, lng: point.lng });
    });

    map.current = instance;

    return () => {
      instance.remove();
      map.current = null;
    };
    // Mount once. `centre` and `zoom` here are only the initial view; later
    // changes arrive through the recentre effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Programmatic recentring — a GPS fix or a chosen search result.
  useEffect(() => {
    if (!map.current || recentreToken === 0) return;
    map.current.setView([centre.lat, centre.lng], zoom, { animate: true });
    // Only when the token moves; see the note on `recentreToken`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentreToken]);

  return <div ref={holder} className="size-full" aria-hidden />;
}
