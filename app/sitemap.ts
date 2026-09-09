import type { MetadataRoute } from 'next';
import { api } from '@/lib/api/server';
import { absoluteUrl } from '@/lib/site';

/**
 * The sitemap.
 *
 * Built from the API's own list of published URLs, so a draft product or a
 * closed collection can never appear — the same visibility filters the pages
 * apply. Priorities are a hint rather than a promise, ordered by what actually
 * earns traffic for a materials shop: category pages first, then products.
 *
 * Regenerated hourly. A catalogue whose prices change daily does not need its
 * *URL list* rebuilt on every request, and an uncached sitemap is an easy way
 * to hand a crawler an expensive query on a loop.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const fixed: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: absoluteUrl('/collections'), lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: absoluteUrl('/help'), lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
  ];

  try {
    const map = await (await api()).storefront.sitemap.query();

    const section = (
      entries: Array<{ path: string; lastModified: string }>,
      changeFrequency: 'daily' | 'weekly' | 'monthly',
      priority: number,
    ): MetadataRoute.Sitemap =>
      entries.map((entry) => ({
        url: absoluteUrl(entry.path),
        lastModified: new Date(entry.lastModified),
        changeFrequency,
        priority,
      }));

    return [
      ...fixed,
      ...section(map.categories, 'daily', 0.9),
      ...section(map.collections, 'weekly', 0.7),
      // Daily, because the whole premise of this shop is that cement and
      // sariya are repriced every morning.
      ...section(map.products, 'daily', 0.8),
      ...section(map.pages, 'monthly', 0.3),
      ...section(map.posts, 'monthly', 0.4),
    ];
  } catch {
    /*
     * A sitemap that 500s tells a crawler the site is broken. Serving the fixed
     * routes when the API is unreachable is a smaller, more honest failure than
     * that — the home page really does exist.
     */
    return fixed;
  }
}
