import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { Locale } from '@/lib/i18n';

/**
 * The trail back up.
 *
 * An ordered list rather than a row of divs: the order is the meaning, and a
 * screen reader announcing "list, 3 items" is what tells someone where they are
 * in the tree. The current page is the last item and is not a link — linking to
 * where you already are is a dead control.
 */
export function Breadcrumb({
  trail,
  current,
  locale,
}: {
  trail: Array<{ href: string; label: string }>;
  current: string;
  locale: Locale;
}) {
  return (
    <nav aria-label={locale === 'hi' ? 'पथ' : 'Breadcrumb'} className="mb-2">
      <ol className="flex flex-wrap items-center gap-1 text-body4 text-ink-muted">
        <li>
          <Link href="/" className="hover:text-ink">
            {locale === 'hi' ? 'होम' : 'Home'}
          </Link>
        </li>
        {trail.map((step) => (
          <li key={step.href} className="flex items-center gap-1">
            <ChevronRight className="size-3.5 shrink-0" aria-hidden />
            <Link href={step.href} className="hover:text-ink">
              {step.label}
            </Link>
          </li>
        ))}
        <li className="flex items-center gap-1">
          <ChevronRight className="size-3.5 shrink-0" aria-hidden />
          <span aria-current="page" className="text-ink">
            {current}
          </span>
        </li>
      </ol>
    </nav>
  );
}
