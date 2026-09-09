import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LogOut, MapPin } from 'lucide-react';
import { currentLocale } from '@/lib/locale';
import { currentLocation, locationLabel } from '@/lib/location';
import { currentCustomer } from '@/lib/session';
import { signOut } from '@/app/(auth)/login/actions';
import { LanguagePicker } from '@/components/account/language-picker';
import { GstinField } from '@/components/account/gstin-field';
import { api } from '@/lib/api/server';

export const metadata: Metadata = {
  title: 'Settings',
  robots: { index: false, follow: false },
};

/**
 * Settings.
 *
 * Deliberately short. The only preferences this shop has are the language it
 * speaks to you in and the area it delivers to — everything else a settings
 * page usually holds (notifications, marketing consent, saved cards) either
 * does not exist yet or would be a checkbox with nothing behind it.
 */
export default async function SettingsPage() {
  const [locale, customer, location, profile] = await Promise.all([
    currentLocale(),
    currentCustomer(),
    currentLocation(),
    api().then((client) => client.storefront.myProfile.query()),
  ]);

  if (!customer) redirect('/login?next=%2Faccount%2Fsettings');
  const hi = locale === 'hi';

  return (
    <div className="page-w page-x py-6">
      <div className="mx-auto max-w-lg">
        <h1 className="text-heading2 text-ink">{hi ? 'सेटिंग्स' : 'Settings'}</h1>

        <section className="mt-5">
          <h2 className="mb-2 text-heading6 text-ink-muted">{hi ? 'भाषा' : 'Language'}</h2>
          <div className="overflow-hidden rounded-card border border-hairline bg-surface">
            <LanguagePicker locale={locale} name={customer.name} />
          </div>
          <p className="mt-1.5 text-body4 text-ink-faint">
            {hi
              ? 'यह साइट और आपके मैसेज दोनों की भाषा बदलेगा।'
              : 'Changes both what you see here and the language we message you in.'}
          </p>
        </section>

        {/*
          * The GST number lives here as well as at checkout.
          *
          * Checkout asks per order; this is the standing answer, so a
          * contractor sets it once and every later invoice carries it.
          */}
        <section className="mt-6">
          <h2 className="mb-2 text-heading6 text-ink-muted">
            {hi ? 'GST बिल' : 'GST invoices'}
          </h2>
          <GstinField initial={profile?.gstin ?? null} name={customer.name} locale={locale} />
        </section>

        <section className="mt-6">
          <h2 className="mb-2 text-heading6 text-ink-muted">{hi ? 'डिलीवरी इलाक़ा' : 'Delivery area'}</h2>
          <Link
            href="/location"
            className="flex min-h-[var(--tap)] items-center gap-3 rounded-card border border-hairline bg-surface px-4 py-3 hover:bg-surface-muted"
          >
            <MapPin className="size-5 shrink-0 text-ink-muted" aria-hidden />
            <span className="flex-1 text-body1 text-ink">
              {location ? locationLabel(location) : hi ? 'चुना नहीं गया' : 'Not set'}
            </span>
            <span className="text-cta3 text-brand-text">{hi ? 'बदलें' : 'Change'}</span>
          </Link>
        </section>

        <section className="mt-6">
          <h2 className="mb-2 text-heading6 text-ink-muted">{hi ? 'अकाउंट' : 'Account'}</h2>
          <div className="rounded-card border border-hairline bg-surface px-4 py-3">
            <p className="text-body2 text-ink">+91 {customer.phone}</p>
            <p className="mt-0.5 text-body4 text-ink-faint">
              {hi
                ? 'नंबर बदलने के लिए हमें कॉल करें।'
                : 'Your number is your account. Call us if it needs to change.'}
            </p>
          </div>
        </section>

        <form action={signOut} className="mt-6">
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
