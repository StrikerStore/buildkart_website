import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api/server';
import { currentLocale } from '@/lib/locale';
import { readQuery, type SearchParams } from '@/lib/list-query';
import { Breadcrumb } from '@/components/catalog/breadcrumb';
import { Listing } from '@/components/catalog/listing';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ slug }, search, locale] = await Promise.all([params, searchParams, currentLocale()]);

  const page = await (await api()).storefront.collection.query({ slug, ...readQuery(search) });
  if (!page) return {};

  const name = (locale === 'hi' && page.collection.nameHi) || page.collection.nameEn;

  return {
    title: name,
    description: page.collection.description ?? undefined,
    alternates: { canonical: `/collections/${slug}` },
    robots: Object.keys(search).length > 0 ? { index: false, follow: true } : undefined,
  };
}

/**
 * A collection page.
 *
 * The collection is a PUBLIC `Tag` — there is no Collection table. From the
 * shopper's side that is invisible and should stay so: this renders exactly
 * like a category, because "Bestsellers" and "Cement" are the same kind of
 * thing to someone shopping. The difference is only in where the membership
 * comes from, and that is the server's business.
 */
export default async function CollectionPage({ params, searchParams }: Props) {
  const [{ slug }, search, locale] = await Promise.all([params, searchParams, currentLocale()]);

  const page = await (await api()).storefront.collection.query({ slug, ...readQuery(search) });
  if (!page) notFound();

  const name = (locale === 'hi' && page.collection.nameHi) || page.collection.nameEn;

  return (
    <Listing
      pathname={`/collections/${slug}`}
      params={search}
      result={page}
      locale={locale}
      description={page.collection.description}
      emptyAction={{
        href: '/collections',
        label: locale === 'hi' ? 'सभी कलेक्शन' : 'All collections',
      }}
      heading={
        <>
          <Breadcrumb
            trail={[
              { href: '/collections', label: locale === 'hi' ? 'कलेक्शन' : 'Collections' },
            ]}
            current={name}
            locale={locale}
          />
          <h1 className="text-heading2 text-ink">{name}</h1>
        </>
      }
    />
  );
}
