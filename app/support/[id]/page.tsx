import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { supportTopicLabel } from '@buildkart/contract';
import { api } from '@/lib/api/server';
import { currentLocale } from '@/lib/locale';
import { currentCustomer } from '@/lib/session';
import { tr } from '@/lib/i18n';
import { SupportThreadView } from '@/components/support/support-thread';

export const metadata: Metadata = {
  title: 'Help',
  robots: { index: false, follow: false },
};

/**
 * One conversation.
 *
 * The whole thread is rendered on the server first, then handed to the client
 * component that keeps it current — so the answer is readable immediately and
 * only the changes travel afterwards.
 *
 * `myThread` returns null both for a ticket that does not exist and for one
 * belonging to somebody else. Rendering the same 404 for both is the point: a
 * distinguishable response would confirm which ids are real.
 */
export default async function SupportThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const [locale, customer, { id }] = await Promise.all([
    currentLocale(),
    currentCustomer(),
    params,
  ]);
  if (!customer) redirect(`/login?next=${encodeURIComponent(`/support/${id}`)}`);

  const ticket = await (await api()).support.myThread.query({ ticketId: id });
  if (!ticket) notFound();

  return (
    <div className="page-w page-x py-6">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/support"
          className="inline-flex items-center gap-1 text-body3 text-ink-muted hover:text-ink"
        >
          <ChevronLeft className="size-4" aria-hidden />
          {tr(locale, 'support.title')}
        </Link>

        <h1 className="mt-2 text-heading3 text-ink">{supportTopicLabel(ticket.topic, locale)}</h1>
        <p className="mt-1 text-body4 text-ink-faint">
          {ticket.ticketNumber}
          {ticket.orderNumber && ` · ${ticket.orderNumber}`}
        </p>

        <SupportThreadView ticket={ticket} locale={locale} />
      </div>
    </div>
  );
}
