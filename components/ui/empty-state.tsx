import Link from 'next/link';
import { buttonClass } from './button';

/**
 * Nothing to show, and what to do about it.
 *
 * An empty state always carries an action. "No products found" alone leaves the
 * shopper to work out that their filters caused it and to find the control that
 * undoes them — on a phone, where the filter sheet has already closed and the
 * chips have scrolled out of view.
 */
export function EmptyState({
  title,
  body,
  actionHref,
  actionLabel,
}: {
  title: string;
  body?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-card border border-hairline bg-surface px-6 py-12 text-center">
      <p className="text-heading4 text-ink">{title}</p>
      {body && <p className="mx-auto mt-2 max-w-sm text-body2 text-ink-muted">{body}</p>}
      {actionHref && actionLabel && (
        <Link href={actionHref} className={buttonClass({ variant: 'quiet', className: 'mt-5' })}>
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
