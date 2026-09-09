import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { Locale } from '@/lib/i18n';

/**
 * A band's title, with an optional "See all".
 *
 * The link is on the right and repeats on the row's own scroll end, because on
 * a phone the title has scrolled away by the time a shopper reaches the end of
 * a rail and decides they want the rest.
 */
export function SectionHeader({
  titleEn,
  titleHi,
  href,
  locale,
}: {
  titleEn: string | null;
  titleHi: string | null;
  href?: string | null;
  locale: Locale;
}) {
  const title = (locale === 'hi' && titleHi) || titleEn;
  if (!title) return null;

  return (
    <div className="mb-3 flex items-baseline justify-between gap-4">
      <h2 className="text-heading3 text-ink">{title}</h2>
      {href && (
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-0.5 text-cta3 text-brand-text hover:underline"
        >
          {locale === 'hi' ? 'सब देखें' : 'See all'}
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}
