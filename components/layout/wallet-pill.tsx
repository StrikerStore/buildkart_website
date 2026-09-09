import Link from 'next/link';
import { Wallet } from 'lucide-react';
import type { Locale } from '@/lib/i18n';

/**
 * The wallet slot in the header.
 *
 * A **placeholder**, and deliberately one that shows no balance.
 *
 * There is no wallet in the database — `WALLET` in the schema is a Razorpay
 * payment instrument, not store credit — so the reference app's "₹0" pill would
 * be inventing a number. Zero is a claim: it says an account exists and is
 * empty, and a shopper who later gets a refund would reasonably expect it to
 * land there. Showing the word without a figure reserves the space and the
 * route without promising a feature that has not been built.
 *
 * When store credit is real, this becomes a balance and nothing else here has
 * to move.
 */
export function WalletPill({ locale }: { locale: Locale }) {
  return (
    <Link
      href="/wallet"
      className="hidden h-[var(--tap)] items-center gap-1.5 rounded-box px-3 text-cta2 text-ink hover:bg-surface-muted sm:inline-flex"
    >
      <Wallet className="size-5 text-ink-muted" aria-hidden />
      <span className="hidden lg:inline">{locale === 'hi' ? 'वॉलेट' : 'Wallet'}</span>
    </Link>
  );
}
