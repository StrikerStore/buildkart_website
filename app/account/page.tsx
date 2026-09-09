import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronRight, LogOut, MapPin, MessageSquare, Package, Settings, Wallet } from 'lucide-react';
import { currentLocale } from '@/lib/locale';
import { currentCustomer } from '@/lib/session';
import { signOut } from '@/app/(auth)/login/actions';
import { NameEditor } from '@/components/account/name-editor';

export const metadata: Metadata = {
  title: 'Account',
  robots: { index: false, follow: false },
};

/**
 * The account home.
 *
 * Guarded by a redirect rather than a "please sign in" panel: an account page
 * has nothing to show without an account, and bouncing to sign-in with `?next=`
 * gets the customer back here in one step instead of two.
 */
export default async function AccountPage() {
  const [locale, customer] = await Promise.all([currentLocale(), currentCustomer()]);

  if (!customer) redirect('/login?next=%2Faccount');

  const hi = locale === 'hi';

  const rows = [
    { href: '/account/orders', icon: Package, label: hi ? 'मेरे ऑर्डर' : 'My orders' },
    { href: '/account/addresses', icon: MapPin, label: hi ? 'पते' : 'Addresses' },
    { href: '/account/settings', icon: Settings, label: hi ? 'सेटिंग्स' : 'Settings' },
    { href: '/wallet', icon: Wallet, label: hi ? 'वॉलेट' : 'Wallet' },
    /*
     * Signed in, "Help" means the conversations they already have with us —
     * not the public FAQ page, which they have already read past by getting an
     * account. `/help` stays reachable from the footer for everyone else.
     */
    { href: '/support', icon: MessageSquare, label: hi ? 'मदद' : 'Help' },
  ];

  return (
    <div className="page-w page-x py-6">
      <div className="mx-auto max-w-lg">
        <h1 className="text-heading2 text-ink">{hi ? 'अकाउंट' : 'Account'}</h1>

        <div className="mt-4 rounded-card border border-hairline bg-surface p-4">
          {/* The one editable field. The phone below it is the account
              identity and is deliberately not editable here — changing it is a
              re-verification flow, not a text box. */}
          <NameEditor name={customer.name} locale={locale} />

          <p className="mt-3 border-t border-hairline pt-3 text-body2 text-ink-muted">
            +91 {customer.phone}
          </p>
        </div>

        <ul className="mt-4 divide-y divide-hairline rounded-card border border-hairline bg-surface">
          {rows.map(({ href, icon: Icon, label }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex min-h-[var(--tap)] items-center gap-3 px-4 py-3 hover:bg-surface-muted"
              >
                <Icon className="size-5 shrink-0 text-ink-muted" aria-hidden />
                <span className="flex-1 text-body1 text-ink">{label}</span>
                <ChevronRight className="size-4 shrink-0 text-ink-faint" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>

        <form action={signOut} className="mt-4">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-card border border-hairline bg-surface px-4 py-3 text-cta2 text-error hover:bg-error-bg"
          >
            <LogOut className="size-4" aria-hidden />
            {hi ? 'लॉगआउट' : 'Sign out'}
          </button>
        </form>
      </div>
    </div>
  );
}
