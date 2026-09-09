import type { Metadata } from 'next';
import Link from 'next/link';
import { api } from '@/lib/api/server';
import { currentLocale } from '@/lib/locale';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata: Metadata = {
  title: 'Collections',
  description: 'Curated groups of construction materials — bestsellers, new arrivals and offers.',
  alternates: { canonical: '/collections' },
};

/**
 * Every collection the shop has.
 *
 * The server already drops collections with no products in them, so a tile here
 * always leads somewhere with something in it. That filtering belongs on the
 * server rather than in this component: an empty collection is a filing
 * decision the shopper should never have to discover by tapping into it.
 */
export default async function CollectionsPage() {
  const [locale, collections] = await Promise.all([
    currentLocale(),
    api().then((client) => client.storefront.collections.query()),
  ]);

  return (
    <div className="page-w page-x py-6">
      <h1 className="text-heading2 text-ink">{locale === 'hi' ? 'कलेक्शन' : 'Collections'}</h1>

      {collections.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={locale === 'hi' ? 'अभी कोई कलेक्शन नहीं' : 'No collections yet'}
            body={
              locale === 'hi'
                ? 'जल्द ही यहाँ चुनिंदा सामान दिखेगा।'
                : 'Curated groups of materials will appear here.'
            }
            actionHref="/"
            actionLabel={locale === 'hi' ? 'होम' : 'Back to home'}
          />
        </div>
      ) : (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => (
            <li key={collection.slug}>
              <Link
                href={`/collections/${collection.slug}`}
                className="flex h-full flex-col rounded-card border border-hairline bg-surface p-4 hover:shadow-raised"
              >
                <span className="flex items-center gap-2">
                  <span className="text-heading4 text-ink">
                    {(locale === 'hi' && collection.nameHi) || collection.nameEn}
                  </span>
                  {/* The tag's own tone, so a collection looks the same here as
                      its badge does on a product card. */}
                  <Badge tone={collection.tone}>{collection.productCount}</Badge>
                </span>

                {collection.description && (
                  <span className="mt-1 text-body3 text-ink-muted">{collection.description}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
