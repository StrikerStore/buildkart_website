import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronRight, Plus } from 'lucide-react';
import { supportTopicLabel } from '@StrikerStore/contract';
import { api } from '@/lib/api/server';
import { currentLocale } from '@/lib/locale';
import { currentCustomer } from '@/lib/session';
import { tr } from '@/lib/i18n';
import { buttonClass } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata: Metadata = {
  title: 'Help',
  robots: { index: false, follow: false },
};

/**
 * Every conversation this customer has with the shop.
 *
 * Signed-in only, like the orders list and for the same reason: the list is
 * filtered by the session on the server, so there is no id in the URL to change
 * and another person's messages are unreachable rather than merely unlinked.
 */
export default async function SupportPage() {
  const [locale, customer] = await Promise.all([currentLocale(), currentCustomer()]);
  if (!customer) redirect('/login?next=%2Fsupport');

  const tickets = await (await api()).support.myTickets.query();
  const hi = locale === 'hi';

  return (
    <div className="page-w page-x py-6">
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-heading2 text-ink">{tr(locale, 'support.title')}</h1>
            <p className="mt-1 text-body3 text-ink-muted">{tr(locale, 'support.subtitle')}</p>
          </div>

          {tickets.length > 0 && (
            <Link href="/support/new" className={buttonClass({ variant: 'quiet', size: 'sm' })}>
              <Plus className="size-4" aria-hidden />
              {tr(locale, 'support.newChat')}
            </Link>
          )}
        </div>

        {tickets.length === 0 ? (
          <div className="mt-5">
            <EmptyState
              title={tr(locale, 'support.noneTitle')}
              body={tr(locale, 'support.noneBody')}
              actionHref="/support/new"
              actionLabel={tr(locale, 'support.start')}
            />
          </div>
        ) : (
          <ul className="mt-5 space-y-3">
            {tickets.map((ticket) => (
              <li key={ticket.id}>
                <Link
                  href={`/support/${ticket.id}`}
                  className="flex items-center gap-3 rounded-card border border-hairline bg-surface p-4 hover:shadow-raised"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-heading6 text-ink">
                        {supportTopicLabel(ticket.topic, locale)}
                      </span>

                      {/* An unread dot rather than a count: there is one shop,
                          and "how many" is not a question anyone asks of it. */}
                      {ticket.unread && (
                        <span className="inline-flex items-center gap-1.5 rounded-pill bg-success-bg px-2 py-0.5 text-body4 text-success">
                          <span className="size-1.5 rounded-full bg-success" aria-hidden />
                          {tr(locale, 'support.replied')}
                        </span>
                      )}

                      {ticket.status === 'RESOLVED' && !ticket.unread && (
                        <span className="rounded-pill bg-surface-muted px-2 py-0.5 text-body4 text-ink-muted">
                          {tr(locale, 'support.resolved')}
                        </span>
                      )}

                      {ticket.orderNumber && (
                        <span className="text-body4 text-ink-faint">{ticket.orderNumber}</span>
                      )}
                    </div>

                    <p className="mt-1 clamp-1 text-body3 text-ink-muted">
                      {ticket.lastMessageFrom === 'CUSTOMER' && `${tr(locale, 'support.you')}: `}
                      {ticket.preview}
                    </p>

                    <p className="mt-1 text-body4 text-ink-faint">
                      {new Date(ticket.lastMessageAt).toLocaleDateString(hi ? 'hi-IN' : 'en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>

                  <ChevronRight className="size-5 shrink-0 text-ink-faint" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
