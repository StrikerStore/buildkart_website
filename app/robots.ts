import type { MetadataRoute } from 'next';
import { api } from '@/lib/api/server';
import { absoluteUrl } from '@/lib/site';

export const revalidate = 3600;

/**
 * What crawlers may read.
 *
 * The disallow list is the set of URLs that are **per-visitor or per-customer**:
 * a crawler indexing `/cart` would index an empty cart, and `/account/orders`
 * is somebody's private history behind a redirect. `/search` is excluded
 * because it generates one URL per query, which is how a small catalogue buries
 * its own product pages.
 *
 * The whole site can be closed with one switch in the admin —
 * `seo.robotsIndexable` — which is what a shop needs while it is still entering
 * its catalogue.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const indexable = await api()
    .then((client) => client.content.seoDefaults.query())
    .then((seo) => seo.robotsIndexable)
    // Unreachable API means we cannot know the owner's wish. Staying open is
    // the status quo and is recoverable; closing the site by accident is a
    // traffic outage nobody would attribute to a failed health check.
    .catch(() => true);

  if (!indexable) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/cart', '/checkout', '/account', '/account/', '/login', '/search', '/location', '/wallet'],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
