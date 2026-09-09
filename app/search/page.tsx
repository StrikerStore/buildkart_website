import type { Metadata } from 'next';
import { api } from '@/lib/api/server';
import { currentLocale } from '@/lib/locale';
import { readQuery, type SearchParams } from '@/lib/list-query';
import { Listing } from '@/components/catalog/listing';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata: Metadata = {
  title: 'Search',
  // Never indexed. A search results page is generated content with no
  // canonical form, and letting a crawler in creates one URL per query.
  robots: { index: false, follow: true },
};

type Props = { searchParams: Promise<SearchParams> };

/**
 * Search results.
 *
 * The term arrives in the URL because the header's search box is a plain GET
 * form — so a result set is shareable over WhatsApp and survives the back
 * button, which an input filtering a client-side list would not be.
 *
 * Tolerance comes from the server: `searchKeywords` on the product carries the
 * hand-entered synonyms, which is why "saria" finds sariya. Nothing here has to
 * know about that.
 */
export default async function SearchPage({ searchParams }: Props) {
  const [search, locale] = await Promise.all([searchParams, currentLocale()]);
  const query = readQuery(search);

  if (!query.q) {
    return (
      <div className="page-w page-x py-8">
        <EmptyState
          title={locale === 'hi' ? 'क्या ढूँढ रहे हैं?' : 'What are you looking for?'}
          body={
            locale === 'hi'
              ? 'ऊपर सर्च बार में सीमेंट, सरिया या कोई भी सामान लिखें।'
              : 'Search for cement, sariya, plywood or anything else in the bar above.'
          }
          actionHref="/"
          actionLabel={locale === 'hi' ? 'सब श्रेणियाँ' : 'Browse categories'}
        />
      </div>
    );
  }

  const result = await (await api()).storefront.search.query(query);

  return (
    <Listing
      pathname="/search"
      params={search}
      result={result}
      locale={locale}
      heading={
        <h1 className="text-heading3 text-ink">
          {locale === 'hi' ? 'नतीजे' : 'Results for'}{' '}
          <span className="text-brand-text">{query.q}</span>
        </h1>
      }
    />
  );
}
