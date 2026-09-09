import type { Metadata } from 'next';
import { Wallet } from 'lucide-react';
import { storeSettings } from '@/lib/api/server';
import { currentLocale } from '@/lib/locale';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata: Metadata = {
  title: 'Wallet',
  robots: { index: false, follow: false },
};

/**
 * The wallet, reserved.
 *
 * Store credit does not exist yet: there is no wallet table, and `WALLET` in
 * the schema is a Razorpay payment instrument rather than a balance the shop
 * holds. This page says so plainly instead of showing an empty ledger, because
 * a zero balance is a claim — it tells a customer an account exists, and the
 * first refund that does not appear in it is a support call.
 *
 * It exists now so the header slot has somewhere to lead and the route is
 * settled before anything links to it.
 */
export default async function WalletPage() {
  const [locale, settings] = await Promise.all([currentLocale(), storeSettings()]);
  const phone = settings.store.supportPhone;

  return (
    <div className="page-w page-x py-8">
      <div className="mx-auto max-w-lg">
        <h1 className="flex items-center gap-2 text-heading2 text-ink">
          <Wallet className="size-6 text-ink-muted" aria-hidden />
          {locale === 'hi' ? 'वॉलेट' : 'Wallet'}
        </h1>

        <div className="mt-5">
          <EmptyState
            title={locale === 'hi' ? 'वॉलेट अभी उपलब्ध नहीं है' : 'Wallet is not available yet'}
            body={
              locale === 'hi'
                ? `स्टोर क्रेडिट अभी शुरू नहीं हुआ है। किसी भी रिफ़ंड या हिसाब के लिए ${phone || 'हमें'} कॉल करें।`
                : `Store credit is not live yet. For a refund or anything owed to you, call us${phone ? ` on ${phone}` : ''} and we will settle it directly.`
            }
            actionHref="/"
            actionLabel={locale === 'hi' ? 'सामान देखें' : 'Back to shopping'}
          />
        </div>
      </div>
    </div>
  );
}
