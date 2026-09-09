import type { MetadataRoute } from 'next';
import { storeSettings } from '@/lib/api/server';

/**
 * The web app manifest.
 *
 * PLAN.md §12 wants this installable from day one: "the web app will be
 * installable as a PWA — near-app experience for free". For an audience on
 * budget Android phones that is not a nicety. Installing puts the shop on the
 * home screen beside WhatsApp, which is where this trade actually lives, and
 * costs them no Play Store download over a site connection.
 *
 * `standalone` display, portrait, and the charcoal theme colour so the status
 * bar matches the header rather than flashing white on launch.
 */
export const revalidate = 3600;

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { store, commerce } = await storeSettings();
  const name = store.nameEn || 'BuildKart';

  return {
    name,
    short_name: name.split(' ')[0] ?? name,
    description: `Cement, sariya, plywood and more — delivered to your site in ${commerce.promiseHours} hours.`,
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#faf9f6',
    theme_color: '#2d333a',
    categories: ['shopping', 'business'],
    /*
     * The logo is not in the media library yet, so there is nothing to point a
     * real icon at. Rather than reference files that would 404 — which makes
     * the install prompt fail silently on Android — the icons list stays empty
     * until `public/icon-192.png` and `icon-512.png` exist.
     */
    icons: [],
  };
}
