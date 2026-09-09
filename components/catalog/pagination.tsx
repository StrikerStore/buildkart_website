import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { buildHref, type SearchParams } from '@/lib/list-query';
import { cn } from '@/lib/cn';
import type { Locale } from '@/lib/i18n';

/**
 * Numbered pages, as links.
 *
 * Real `<a href>`s rather than a "Load more" button, and that is a deliberate
 * trade against the infinite scroll a quick-commerce app would normally use.
 * Three reasons, all of which matter more here than the extra polish: a
 * crawler can follow links and cannot press buttons, page 3 of a category is a
 * URL a contractor can send someone, and on a weak site connection a failed
 * "load more" leaves the shopper stranded mid-list with no way back.
 */
export function Pagination({
  pathname,
  params,
  page,
  totalPages,
  locale,
}: {
  pathname: string;
  params: SearchParams;
  page: number;
  totalPages: number;
  locale: Locale;
}) {
  if (totalPages <= 1) return null;

  // A window around the current page, always ending at the last one, so the
  // control stays the same width whether there are 3 pages or 300.
  const window = 2;
  const numbers: Array<number | 'gap'> = [];
  for (let n = 1; n <= totalPages; n += 1) {
    if (n === 1 || n === totalPages || Math.abs(n - page) <= window) {
      numbers.push(n);
    } else if (numbers[numbers.length - 1] !== 'gap') {
      numbers.push('gap');
    }
  }

  const step = (n: number) => buildHref(pathname, params, { page: n });

  return (
    <nav
      aria-label={locale === 'hi' ? 'पेज' : 'Pagination'}
      className="mt-8 flex items-center justify-center gap-1"
    >
      {page > 1 && (
        <Link
          href={step(page - 1)}
          rel="prev"
          aria-label={locale === 'hi' ? 'पिछला' : 'Previous page'}
          className="grid size-[var(--tap)] place-items-center rounded-box border border-hairline-strong text-ink hover:bg-surface-muted"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </Link>
      )}

      {numbers.map((n, index) =>
        n === 'gap' ? (
          <span key={`gap-${index}`} className="px-1 text-body3 text-ink-faint">
            …
          </span>
        ) : (
          <Link
            key={n}
            href={step(n)}
            aria-current={n === page ? 'page' : undefined}
            className={cn(
              'grid size-[var(--tap)] place-items-center rounded-box text-cta2 tabular-nums',
              n === page
                ? 'bg-ink text-ink-inverted'
                : 'border border-hairline-strong text-ink hover:bg-surface-muted',
            )}
          >
            {n}
          </Link>
        ),
      )}

      {page < totalPages && (
        <Link
          href={step(page + 1)}
          rel="next"
          aria-label={locale === 'hi' ? 'अगला' : 'Next page'}
          className="grid size-[var(--tap)] place-items-center rounded-box border border-hairline-strong text-ink hover:bg-surface-muted"
        >
          <ChevronRight className="size-5" aria-hidden />
        </Link>
      )}
    </nav>
  );
}
