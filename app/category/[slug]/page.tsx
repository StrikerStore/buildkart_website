import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api/server';
import { currentLocale } from '@/lib/locale';
import { readQuery, type SearchParams } from '@/lib/list-query';
import { Breadcrumb } from '@/components/catalog/breadcrumb';
import { Listing } from '@/components/catalog/listing';

/*
 * `params` and `searchParams` are Promises in this version of Next — they are
 * awaited, not destructured. See `node_modules/next/dist/docs`, which the
 * generated AGENTS.md in this directory points at.
 */
type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
};

/**
 * Title and description from the owner's SEO fields, falling back to the
 * category's own name. `generateMetadata` runs its own query rather than
 * sharing the page's, which is one extra call — the alternative is hoisting the
 * fetch into a module-level cache keyed by slug, and a wrong cache key here
 * would serve one category's title on another's page.
 */
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ slug }, search, locale] = await Promise.all([
    params,
    searchParams,
    currentLocale(),
  ]);

  const page = await (await api()).storefront.category.query({
    slug,
    ...readQuery(search),
  });
  if (!page) return {};

  const name = (locale === 'hi' && page.category.nameHi) || page.category.nameEn;
  const description =
    page.category.seoDescription ??
    ((locale === 'hi' && page.category.descriptionHi) || page.category.descriptionEn);

  return {
    title: page.category.seoTitle ?? name,
    description: description ?? undefined,
    alternates: { canonical: `/category/${slug}` },
    /*
     * Page 2 and any filtered view are noindex. They are real, linkable URLs —
     * that is why pagination uses links — but they are also near-duplicates of
     * page 1, and letting a crawler index forty filter permutations of the same
     * twenty products is how a small catalogue buries itself.
     */
    robots:
      Object.keys(search).length > 0 ? { index: false, follow: true } : undefined,
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const [{ slug }, search, locale] = await Promise.all([
    params,
    searchParams,
    currentLocale(),
  ]);

  const page = await (await api()).storefront.category.query({
    slug,
    ...readQuery(search),
  });

  // The API answers a missing category with `null` rather than throwing, so
  // the route can render the real 404 rather than translate an exception.
  if (!page) notFound();

  const name = (locale === 'hi' && page.category.nameHi) || page.category.nameEn;
  const description =
    (locale === 'hi' && page.category.descriptionHi) || page.category.descriptionEn;

  return (
    <Listing
      pathname={`/category/${slug}`}
      params={search}
      result={page}
      locale={locale}
      description={description}
      emptyAction={{ href: '/', label: locale === 'hi' ? 'होम' : 'Back to home' }}
      heading={
        <>
          <Breadcrumb
            trail={page.ancestors.map((step) => ({
              href: `/category/${step.slug}`,
              label: (locale === 'hi' && step.nameHi) || step.nameEn,
            }))}
            current={name}
            locale={locale}
          />
          <h1 className="text-heading2 text-ink">{name}</h1>

          {/* Subcategories as chips. A shopper who landed on "Cement" is
              seeing its children's products already — these narrow, they do
              not reveal anything that was hidden. */}
          {page.children.length > 0 && (
            <div className="rail flex mt-3 gap-2">
              {page.children.map((child) => (
                <Link
                  key={child.slug}
                  href={`/category/${child.slug}`}
                  className="inline-flex h-10 items-center rounded-pill border border-hairline-strong bg-surface px-3.5 text-cta3 text-ink hover:bg-surface-muted"
                >
                  {(locale === 'hi' && child.nameHi) || child.nameEn}
                  <span className="ml-1.5 text-body5 text-ink-faint">{child.productCount}</span>
                </Link>
              ))}
            </div>
          )}
        </>
      }
    />
  );
}
