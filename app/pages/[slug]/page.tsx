import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api/server';
import { currentLocale } from '@/lib/locale';

type Props = { params: Promise<{ slug: string }> };

/**
 * A page the owner wrote: the privacy policy, terms, returns, about.
 *
 * Content the shop is legally obliged to publish, authored in the admin and
 * read here. The footer menu and the help page have been linking to
 * `/pages/{slug}` — and the sitemap has been advertising those URLs to Google —
 * since before this route existed, which is exactly why the link the owner
 * mapped to their published privacy policy returned a 404. The read and its
 * public procedure were both already in place; only the route was missing.
 *
 * Unpublished is a 404 rather than a "not published yet" notice. Draft policy
 * text is not a thing to show a customer, and a page whose existence is
 * confirmed but whose content is withheld tells a stranger more than nothing
 * does.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [locale, page] = await Promise.all([
    currentLocale(),
    api().then((client) => client.content.publishedPage.query({ slug })),
  ]);

  if (!page) return { title: 'Not found' };

  const title = (locale === 'hi' && page.titleHi) || page.titleEn;

  return {
    title: page.seoTitle || title,
    ...(page.seoDescription ? { description: page.seoDescription } : {}),
    alternates: { canonical: `/pages/${page.slug}` },
  };
}

export default async function ContentPage({ params }: Props) {
  const { slug } = await params;

  const [locale, page] = await Promise.all([
    currentLocale(),
    api().then((client) => client.content.publishedPage.query({ slug })),
  ]);

  if (!page) notFound();

  const hi = locale === 'hi';
  const title = (hi && page.titleHi) || page.titleEn;
  /*
   * Falls back to the English body when the Hindi one is blank, rather than
   * showing a Hindi reader an empty policy. A half-translated shop is the
   * normal state of one; an empty terms page is never the intended outcome.
   */
  const body = (hi && page.bodyHtmlHi) || page.bodyHtmlEn;

  return (
    <div className="page-w page-x py-6">
      <article className="mx-auto max-w-2xl">
        <h1 className="text-heading2 text-ink">{title}</h1>

        {page.publishedAt && (
          <p className="mt-1 text-body4 text-ink-faint">
            {hi ? 'अंतिम अपडेट' : 'Last updated'}{' '}
            {new Date(page.publishedAt).toLocaleDateString(hi ? 'hi-IN' : 'en-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        )}

        {body ? (
          /*
           * Sanitised on write, never on read — the same rule the product page
           * follows. `html-sanitize.ts` enforces it at the point of saving, and
           * re-sanitising here would be a second, divergent definition of safe.
           */
          <div
            className="prose-bk mt-4 text-body2 text-ink"
            dangerouslySetInnerHTML={{ __html: body }}
          />
        ) : (
          /*
           * A published page with nothing in it.
           *
           * Says so plainly rather than rendering a title over blank space,
           * which reads as a page that failed to load. The owner can publish
           * before writing — the admin allows it — and this is what that looks
           * like from outside.
           */
          <p className="mt-4 text-body2 text-ink-muted">
            {hi
              ? 'यह पेज अभी लिखा जा रहा है। कुछ पूछना हो तो हमें कॉल करें।'
              : 'This page has not been written yet. Call us if you need anything in the meantime.'}
          </p>
        )}
      </article>
    </div>
  );
}
