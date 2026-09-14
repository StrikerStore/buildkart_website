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
     * The BuildKart mark, from the logo pack. 192 and 512 are the two sizes
     * Android's install prompt requires — with either missing it fails
     * silently rather than saying why. `any`, not `maskable`: the mark sits on
     * a transparent square with no safe-zone padding, so a launcher cropping it
     * to a circle would clip the cart's wheels.
     */
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
