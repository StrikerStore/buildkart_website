import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Clock, Gift, ShoppingBag, Wallet } from 'lucide-react';
import {
  WALLET_ENTRY_LABELS,
  formatINR,
  type WalletEntryDto,
  type WalletSummaryDto,
} from '@StrikerStore/contract';
import { api, myWallet, storeSettings } from '@/lib/api/server';
import { currentLocale } from '@/lib/locale';
import { currentCustomer } from '@/lib/session';
import { cn } from '@/lib/cn';
import type { Locale } from '@/lib/i18n';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata: Metadata = {
  title: 'Wallet',
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ before?: string }> };

/**
 * The customer's wallet: the balance, what is about to expire, cashback still
 * on its way, how the rules work, and every movement.
 *
 * Signed out, it sends you to sign in and back — a wallet has nothing to show
 * without an account. Paging is by `?before=<entry id>`, a plain link rather
 * than a client-side "load more", so the statement works without JavaScript
 * and a page of it can be shared with support.
 */
export default async function WalletPage({ searchParams }: Props) {
  const [locale, customer, { before }] = await Promise.all([
    currentLocale(),
    currentCustomer(),
    searchParams,
  ]);
  if (!customer) redirect('/login?next=%2Fwallet');

  const [wallet, page, settings] = await Promise.all([
    myWallet(),
    (await api()).storefront.walletEntries.query(before ? { cursor: before } : {}),
    storeSettings(),
  ]);
  const hi = locale === 'hi';

  if (!wallet || !wallet.enabled) {
    const phone = settings.store.supportPhone;
    return (
      <div className="page-w page-x py-8">
        <div className="mx-auto max-w-lg">
          <Heading locale={locale} />
          <div className="mt-5">
            <EmptyState
              title={hi ? 'वॉलेट अभी उपलब्ध नहीं है' : 'Wallet is not available right now'}
              body={
                hi
                  ? `किसी भी रिफ़ंड या हिसाब के लिए ${phone || 'हमें'} कॉल करें।`
                  : `For a refund or anything owed to you, call us${phone ? ` on ${phone}` : ''}.`
              }
              actionHref="/"
              actionLabel={hi ? 'सामान देखें' : 'Back to shopping'}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-w page-x py-6">
      <div className="mx-auto max-w-lg">
        <Heading locale={locale} />

        <BalanceCard wallet={wallet} locale={locale} />

        <HowItWorks wallet={wallet} locale={locale} />

        <section className="mt-6">
          <h2 className="text-heading5 text-ink">{hi ? 'लेन-देन' : 'Transactions'}</h2>
          {page.entries.length === 0 ? (
            <p className="mt-3 rounded-card border border-hairline bg-surface p-4 text-body3 text-ink-muted">
              {hi ? 'अभी कोई लेन-देन नहीं।' : 'Nothing here yet.'}
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-hairline rounded-card border border-hairline bg-surface">
              {page.entries.map((entry) => (
                <EntryRow key={entry.id} entry={entry} locale={locale} />
              ))}
            </ul>
          )}
          <div className="mt-3 flex justify-between text-body3">
            {before ? (
              <Link href="/wallet" className="text-info underline">
                {hi ? 'नए लेन-देन' : 'Latest'}
              </Link>
            ) : (
              <span />
            )}
            {page.nextCursor && (
              <Link href={`/wallet?before=${page.nextCursor}`} className="text-info underline">
                {hi ? 'पुराने लेन-देन' : 'Older'}
              </Link>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Heading({ locale }: { locale: Locale }) {
  return (
    <h1 className="flex items-center gap-2 text-heading2 text-ink">
      <Wallet className="size-6 text-ink-muted" aria-hidden />
      {locale === 'hi' ? 'वॉलेट' : 'Wallet'}
    </h1>
  );
}

function dateLabel(iso: string, locale: Locale) {
  return new Date(iso).toLocaleDateString(locale === 'hi' ? 'hi-IN' : 'en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function BalanceCard({ wallet, locale }: { wallet: WalletSummaryDto; locale: Locale }) {
  const hi = locale === 'hi';
  return (
    <div className="mt-4 rounded-card bg-buy p-5 text-buy-foreground">
      <p className="text-body3 opacity-90">{hi ? 'उपलब्ध बैलेंस' : 'Available balance'}</p>
      <p className="mt-1 text-heading1">{formatINR(wallet.balance)}</p>

      {(wallet.expiringSoon || wallet.pendingCashback !== '0.00') && (
        <div className="mt-4 space-y-1.5 border-t border-white/25 pt-3 text-body4">
          {wallet.pendingCashback !== '0.00' && (
            <p className="flex items-center gap-1.5">
              <Gift className="size-4 shrink-0" aria-hidden />
              {hi
                ? `${formatINR(wallet.pendingCashback)} कैशबैक आने वाला है — डिलीवरी के बाद`
                : `${formatINR(wallet.pendingCashback)} cashback on the way — lands after delivery`}
            </p>
          )}
          {wallet.expiringSoon && (
            <p className="flex items-center gap-1.5">
              <Clock className="size-4 shrink-0" aria-hidden />
              {hi
                ? `${formatINR(wallet.expiringSoon.amount)} ${dateLabel(wallet.expiringSoon.expiresAt, locale)} को समाप्त होगा`
                : `${formatINR(wallet.expiringSoon.amount)} expires on ${dateLabel(wallet.expiringSoon.expiresAt, locale)}`}
            </p>
          )}
        </div>
      )}

      <Link
        href="/"
        className="mt-4 inline-flex items-center gap-1.5 rounded-box bg-white/15 px-3 py-2 text-cta3 hover:bg-white/25"
      >
        <ShoppingBag className="size-4" aria-hidden />
        {hi ? 'खरीदारी करें' : 'Shop now'}
      </Link>
    </div>
  );
}

/** The rules in the owner's own numbers, so nothing here is a hard-coded claim. */
function HowItWorks({ wallet, locale }: { wallet: WalletSummaryDto; locale: Locale }) {
  const hi = locale === 'hi';
  const { rules } = wallet;
  const slabs = rules.cashback.slabs.filter((slab) => slab.percent > 0);
  const points: string[] = [];

  if (rules.cashback.enabled && slabs.length > 0) {
    points.push(
      hi
        ? `कैशबैक: ${slabs.map((s) => `${formatINR(s.minOrderValue)} से ऊपर ${s.percent}%`).join(', ')}। डिलीवरी के ${rules.cashback.holdHours} घंटे बाद वॉलेट में।`
        : `Cashback: ${slabs.map((s) => `${s.percent}% on orders above ${formatINR(s.minOrderValue)}`).join(', ')}. Added ${rules.cashback.holdHours} hours after delivery.`,
    );
  }
  if (rules.redemption.enabled) {
    points.push(
      hi
        ? `${formatINR(rules.redemption.minOrderValue)} से ऊपर के ऑर्डर पर, ऑर्डर का ${rules.redemption.maxPercentOfOrder}% तक वॉलेट से दें${rules.redemption.maxAmountPerOrder ? ` (अधिकतम ${formatINR(rules.redemption.maxAmountPerOrder)})` : ''}।`
        : `On orders above ${formatINR(rules.redemption.minOrderValue)}, pay up to ${rules.redemption.maxPercentOfOrder}% of the order from your wallet${rules.redemption.maxAmountPerOrder ? ` (up to ${formatINR(rules.redemption.maxAmountPerOrder)})` : ''}.`,
    );
  }
  if (rules.cashback.validityDays) {
    points.push(
      hi
        ? `कैशबैक ${rules.cashback.validityDays} दिन तक इस्तेमाल करें।`
        : `Cashback can be used for ${rules.cashback.validityDays} days.`,
    );
  }
  if (points.length === 0) return null;

  return (
    <section className="mt-4 rounded-card border border-hairline bg-surface p-4">
      <h2 className="text-heading6 text-ink">{hi ? 'कैसे काम करता है' : 'How it works'}</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-body3 text-ink-muted">
        {points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </section>
  );
}

function EntryRow({ entry, locale }: { entry: WalletEntryDto; locale: Locale }) {
  const hi = locale === 'hi';
  const label = WALLET_ENTRY_LABELS[entry.type][hi ? 'hi' : 'en'];
  const credit = entry.direction === 'CREDIT';
  // A manual adjustment carries the reason the admin gave, which the customer
  // is owed; everything else is described by its type and order already.
  const showNote = entry.note && (entry.type === 'ADMIN_CREDIT' || entry.type === 'ADMIN_DEBIT');

  return (
    <li className="flex items-start justify-between gap-3 p-4">
      <div className="min-w-0">
        <p className="text-heading7 text-ink">{label}</p>
        <p className="mt-0.5 text-body5 text-ink-faint">
          {dateLabel(entry.createdAt, locale)}
          {entry.orderId && entry.orderNumber && (
            <>
              {' · '}
              <Link href={`/account/orders/${entry.orderId}`} className="underline">
                {entry.orderNumber}
              </Link>
            </>
          )}
        </p>
        {showNote && <p className="mt-0.5 text-body5 text-ink-muted">{entry.note}</p>}
        {entry.expiresAt && (
          <p className="mt-0.5 text-body6 text-ink-faint">
            {hi
              ? `${dateLabel(entry.expiresAt, locale)} तक मान्य`
              : `Valid till ${dateLabel(entry.expiresAt, locale)}`}
          </p>
        )}
      </div>
      <p className={cn('shrink-0 text-heading6', credit ? 'text-success-fg' : 'text-ink')}>
        {credit ? '+ ' : '− '}
        {formatINR(entry.amount)}
      </p>
    </li>
  );
}
