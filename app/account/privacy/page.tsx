import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronRight, Download } from 'lucide-react';
import { PRIVACY_NOTICE_PATH } from '@StrikerStore/contract';
import { api, storeSettings } from '@/lib/api/server';
import { currentLocale } from '@/lib/locale';
import { currentCustomer } from '@/lib/session';
import { DeleteAccount } from '@/components/account/delete-account';
import { EmailField } from '@/components/account/email-field';
import { NomineeForm } from '@/components/account/nominee-form';
import { PrivacyControls } from '@/components/account/privacy-controls';
import { PrivacyRequests } from '@/components/account/privacy-requests';

export const metadata: Metadata = {
  title: 'Privacy and data',
  robots: { index: false, follow: false },
};

/**
 * Privacy and data: the customer's rights under the DPDP Act, in one place.
 *
 *   - see what the shop holds (§11) — the download;
 *   - correct it (§12) — email here, the rest where it already lives;
 *   - withdraw a consent (§6) — the same switches as Settings;
 *   - name a nominee (§14);
 *   - ask for a correction, or complain (§§12-13) — answered by the
 *     grievance officer, with the date it is due;
 *   - delete the account (§12) — confirmed by code, a week to change their
 *     mind, then done.
 */
export default async function PrivacyPage() {
  const [locale, customer] = await Promise.all([currentLocale(), currentCustomer()]);
  if (!customer) redirect('/login?next=%2Faccount%2Fprivacy');

  const [privacy, requests, erasure, settings] = await Promise.all([
    api().then((client) => client.storefront.myPrivacy.query()),
    api().then((client) => client.storefront.myPrivacyRequests.query().catch(() => [])),
    api().then((client) => client.storefront.myErasure.query().catch(() => null)),
    storeSettings().catch(() => null),
  ]);
  const hi = locale === 'hi';
  const officer = settings?.privacy;
  const responseDays = officer?.responseDays ?? 30;

  const section = 'mt-6';
  const heading = 'mb-2 text-heading6 text-ink-muted';

  return (
    <div className="page-w page-x py-6">
      <div className="mx-auto max-w-lg">
        <h1 className="text-heading2 text-ink">{hi ? 'गोपनीयता और डेटा' : 'Privacy and data'}</h1>
        <p className="mt-1 text-body3 text-ink-muted">
          {hi ? 'हम आपके बारे में क्या रखते हैं, और उस पर आपका नियंत्रण। ' : 'What we hold about you, and your control over it. '}
          <Link href={PRIVACY_NOTICE_PATH} className="underline">
            {hi ? 'गोपनीयता सूचना' : 'Privacy Notice'}
          </Link>
        </p>

        <section className={section}>
          <h2 className={heading}>{hi ? 'आपकी पसंद' : 'Your choices'}</h2>
          <PrivacyControls initial={privacy} locale={locale} />
        </section>

        <section className={section}>
          <h2 className={heading}>{hi ? 'आपका डेटा' : 'Your data'}</h2>
          <a
            href="/account/privacy/export"
            className="flex min-h-[var(--tap)] items-center gap-3 rounded-card border border-hairline bg-surface px-4 py-3 hover:bg-surface-muted"
          >
            <Download className="size-5 shrink-0 text-ink-muted" aria-hidden />
            <span className="flex-1">
              <span className="block text-body1 text-ink">{hi ? 'मेरा डेटा डाउनलोड करें' : 'Download my data'}</span>
              <span className="block text-body4 text-ink-muted">
                {hi
                  ? 'आपकी प्रोफ़ाइल, पते, ऑर्डर, वॉलेट, मैसेज, सहमतियाँ, और जिन कंपनियों को डेटा मिलता है।'
                  : 'Your profile, addresses, orders, wallet, messages, consents, and the companies that receive data.'}
              </span>
            </span>
          </a>
        </section>

        <section className={section}>
          <h2 className={heading}>{hi ? 'अपनी जानकारी सुधारें' : 'Correct your details'}</h2>
          <div className="space-y-3 rounded-card border border-hairline bg-surface p-4">
            <EmailField initial={privacy.email} locale={locale} />
            <ul className="space-y-1 border-t border-hairline pt-3 text-body3">
              {[
                { href: '/account', en: 'Name', hi: 'नाम' },
                { href: '/account/settings', en: 'GST number', hi: 'GST नंबर' },
                { href: '/account/addresses', en: 'Addresses', hi: 'पते' },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="flex items-center justify-between text-ink hover:underline">
                    {hi ? link.hi : link.en}
                    <ChevronRight className="size-4 text-ink-faint" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
            <p className="text-body4 text-ink-faint">
              {hi
                ? 'मोबाइल नंबर आपका अकाउंट है — बदलने के लिए नीचे अनुरोध भेजें।'
                : 'Your mobile number is your account — to change it, send a request below.'}
            </p>
          </div>
        </section>

        <section className={section}>
          <h2 className={heading}>{hi ? 'नॉमिनी' : 'Nominee'}</h2>
          <div className="rounded-card border border-hairline bg-surface p-4">
            <NomineeForm initial={privacy.nominee} locale={locale} />
          </div>
        </section>

        <section className={section}>
          <h2 className={heading}>{hi ? 'हमसे कहें' : 'Ask us'}</h2>
          <p className="mb-2 text-body3 text-ink-muted">
            {hi
              ? `कुछ सुधारना हो या कोई शिकायत। हमारे शिकायत अधिकारी ${responseDays} दिनों में जवाब देते हैं।`
              : `Something to correct, or a complaint. Our grievance officer replies within ${responseDays} days.`}
          </p>
          <PrivacyRequests initial={requests} responseDays={responseDays} locale={locale} />
        </section>

        {erasure && (
          <section className={section}>
            <h2 className={heading}>{hi ? 'अकाउंट मिटाएँ' : 'Delete your account'}</h2>
            <DeleteAccount initial={erasure} locale={locale} />
          </section>
        )}

        {officer && (officer.name || officer.email) && (
          <p className="mt-6 text-body4 text-ink-faint">
            {hi ? 'शिकायत अधिकारी: ' : 'Grievance officer: '}
            {[officer.name, officer.email, officer.phone].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
    </div>
  );
}
