import Link from 'next/link';
import { buildHref, type SearchParams } from '@/lib/list-query';
import { cn } from '@/lib/cn';
import type { Locale } from '@/lib/i18n';

const LABELS: Record<string, { en: string; hi: string }> = {
  relevance: { en: 'Popular', hi: 'लोकप्रिय' },
  priceLow: { en: 'Price: low to high', hi: 'भाव: कम से ज़्यादा' },
  priceHigh: { en: 'Price: high to low', hi: 'भाव: ज़्यादा से कम' },
  newest: { en: 'Newest', hi: 'नया' },
  name: { en: 'Name', hi: 'नाम' },
};

/**
 * Sort, as a row of links.
 *
 * Links rather than a `<select>` with an onChange, so this stays a Server
 * Component and needs no JavaScript at all. "Popular" rather than "Relevance"
 * as the default's label: there is no scoring engine behind it — the server
 * orders by recently-updated — and calling it relevance would claim a
 * precision the query does not have.
 */
export function SortMenu({
  pathname,
  params,
  current,
  locale,
}: {
  pathname: string;
  params: SearchParams;
  current: string;
  locale: Locale;
}) {
  /*
   * Inset to the page gutter, not bled to the screen edge: these are controls,
   * and a control half under the edge of the screen is one a thumb cannot
   * reliably hit. A product rail can bleed — the peeking card is what says
   * "there is more" — but a row of buttons that sets the sort order should line
   * up with the heading above it.
   */
  return (
    <div className="rail flex gap-2">
      {Object.entries(LABELS).map(([value, label]) => (
        <Link
          key={value}
          href={buildHref(pathname, params, { sort: value })}
          aria-current={value === current ? 'true' : undefined}
          className={cn(
            'inline-flex h-10 items-center rounded-pill border px-3.5 text-cta3',
            value === current
              ? 'border-ink bg-ink text-ink-inverted'
              : 'border-hairline-strong bg-surface text-ink hover:bg-surface-muted',
          )}
        >
          {locale === 'hi' ? label.hi : label.en}
        </Link>
      ))}
    </div>
  );
}
