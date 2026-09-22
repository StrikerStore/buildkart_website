import Link from 'next/link';
import { Wallet } from 'lucide-react';
import { formatINR } from '@StrikerStore/contract';
import type { Locale } from '@/lib/i18n';

/**
 * The wallet slot in the header.
 *
 * Signed in, it shows the spendable balance — the one number a customer with
 * cashback on the way wants to see without opening a page. Signed out it is
 * the word alone: a "₹0" for somebody we do not know would be inventing an
 * account.
 *
 * Hidden entirely while the owner has the wallet switched off (the header
 * decides that, from the public wallet rules).
 */
export function WalletPill({ locale, balance }: { locale: Locale; balance: string | null }) {
  return (
    <Link
      href="/wallet"
      aria-label={
        balance !== null
          ? `${locale === 'hi' ? 'वॉलेट' : 'Wallet'} ${formatINR(balance)}`
          : locale === 'hi'
            ? 'वॉलेट'
            : 'Wallet'
      }
      className="hidden h-[var(--tap)] items-center gap-1.5 rounded-box px-3 text-cta2 text-ink hover:bg-surface-muted sm:inline-flex"
    >
      <Wallet className="size-5 text-ink-muted" aria-hidden />
      {balance !== null ? (
        <span className="tabular">{formatINR(balance)}</span>
      ) : (
        <span className="hidden lg:inline">{locale === 'hi' ? 'वॉलेट' : 'Wallet'}</span>
      )}
    </Link>
  );
}
