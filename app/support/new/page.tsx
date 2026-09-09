import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api/server';
import { currentLocale } from '@/lib/locale';
import { currentCustomer } from '@/lib/session';
import { tr } from '@/lib/i18n';
import { NewChatForm } from '@/components/support/new-chat-form';

export const metadata: Metadata = {
  title: 'Help',
  robots: { index: false, follow: false },
};

/**
 * Starting a conversation.
 *
 * `?orderId=` arrives from the order tracking page. It is resolved here purely
 * so the form can *show* which order this is about — the write re-checks
 * ownership itself and quietly drops an id that is not this customer's, so a
 * hand-edited link cannot attach a stranger's order to the thread.
 */
export default async function NewSupportChatPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [locale, customer, raw] = await Promise.all([
    currentLocale(),
    currentCustomer(),
    searchParams,
  ]);

  const orderId = typeof raw.orderId === 'string' ? raw.orderId : undefined;
  if (!customer) {
    const next = orderId ? `/support/new?orderId=${encodeURIComponent(orderId)}` : '/support/new';
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  // Null when the order is not theirs, which is also how the form learns not to
  // claim the chat is about anything.
  const order = orderId ? await (await api()).storefront.myOrder.query({ id: orderId }) : null;

  return (
    <div className="page-w page-x py-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-heading2 text-ink">{tr(locale, 'support.newChat')}</h1>
        <p className="mt-1 text-body3 text-ink-muted">{tr(locale, 'support.subtitle')}</p>

        <NewChatForm
          locale={locale}
          orderId={order?.id}
          orderNumber={order?.orderNumber}
        />
      </div>
    </div>
  );
}
