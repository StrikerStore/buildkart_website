'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PRIVACY_NOTICE_PATH } from '@StrikerStore/contract';
import { rememberConsent } from '@/app/consent-actions';
import { saveChoices } from '@/lib/consent-client';
import { CONSENT_OPEN, currentChoices } from '@/lib/consent-state';
import type { Locale } from '@/lib/i18n';

/**
 * The cookie banner, always.
 *
 * Asks once for two separate permissions — the shop's own visit analytics, and
 * Meta ad measurement — and nothing optional runs until it is answered (no
 * answer is a no). The DPDP Act's conditions, as this screen meets them:
 *
 *   - **informed and itemised**: what each one is for, in plain words, with
 *     the Privacy Notice one tap away;
 *   - **free**: refusing is a button the same size as accepting, and the shop
 *     works the same either way;
 *   - **specific**: "Choose" takes each purpose on its own;
 *   - **as easy to withdraw as to give**: the footer's "Privacy choices"
 *     reopens this, answers filled in.
 *
 * Read from the cookie after mount rather than on the server, so a cached page
 * never shows the banner to someone who already answered, or hides it from
 * someone who has not.
 */
export function ConsentBanner({ locale }: { locale: Locale }) {
  const hi = locale === 'hi';
  const [open, setOpen] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (!currentChoices()) setOpen(true);

    const reopen = () => {
      const current = currentChoices();
      setAnalytics(current?.analytics ?? false);
      setMarketing(current?.marketing ?? false);
      setChoosing(true);
      setOpen(true);
    };
    window.addEventListener(CONSENT_OPEN, reopen);
    return () => window.removeEventListener(CONSENT_OPEN, reopen);
  }, []);

  if (!open) return null;

  const answer = (choice: { analytics: boolean; marketing: boolean }) => {
    const saved = saveChoices(choice);
    void rememberConsent(saved);
    setOpen(false);
    setChoosing(false);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-labelledby="consent-title"
      className="fixed inset-x-3 bottom-24 z-50 mx-auto max-w-xl rounded-card border border-hairline bg-surface p-4 shadow-raised md:bottom-6"
    >
      <h2 id="consent-title" className="text-heading6 text-ink">
        {hi ? 'आपकी पसंद, आपका डेटा' : 'Your choice, your data'}
      </h2>
      <p className="mt-1 text-body3 text-ink-muted">
        {hi
          ? 'आपका कार्ट, भाषा और लॉगिन याद रखने के लिए ज़रूरी कुकीज़ हमेशा चलती हैं। आपकी अनुमति हो तो हम यह भी देखेंगे कि लोग साइट कैसे इस्तेमाल करते हैं, और Meta (Facebook, Instagram) से यह मापेंगे कि हमारे विज्ञापन काम करते हैं या नहीं।'
          : 'Cookies that keep your cart, language and sign-in always run. With your permission we also measure how the site is used, and use Meta (Facebook, Instagram) to see whether our ads work.'}{' '}
        <Link href={PRIVACY_NOTICE_PATH} className="underline">
          {hi ? 'गोपनीयता सूचना' : 'Privacy Notice'}
        </Link>
      </p>

      {choosing && (
        <fieldset className="mt-3 space-y-2">
          <legend className="sr-only">{hi ? 'अनुमतियाँ चुनें' : 'Choose permissions'}</legend>
          <label className="flex items-start gap-2 text-body3 text-ink">
            <input
              type="checkbox"
              checked={analytics}
              onChange={(event) => setAnalytics(event.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-current"
            />
            <span>
              <span className="block text-heading6">{hi ? 'साइट का इस्तेमाल' : 'Site analytics'}</span>
              <span className="block text-ink-muted">
                {hi
                  ? 'हमारी अपनी गिनती: कितने लोग आए, कहाँ से आए, और क्या खरीदा। किसी और को नहीं भेजी जाती।'
                  : 'Our own count of visits, where they came from and what was bought. Not shared with anyone.'}
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-body3 text-ink">
            <input
              type="checkbox"
              checked={marketing}
              onChange={(event) => setMarketing(event.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-current"
            />
            <span>
              <span className="block text-heading6">{hi ? 'विज्ञापन माप (Meta)' : 'Ad measurement (Meta)'}</span>
              <span className="block text-ink-muted">
                {hi
                  ? 'Meta को बताया जाता है कि हमारे विज्ञापन से कोई आया या खरीदा, ताकि विज्ञापन सही लोगों तक पहुँचें।'
                  : 'Tells Meta when someone came or bought from one of our ads, so the ads reach the right people.'}
              </span>
            </span>
          </label>
        </fieldset>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {choosing ? (
          <button
            type="button"
            onClick={() => answer({ analytics, marketing })}
            className="h-10 flex-1 rounded-box bg-ink px-4 text-cta2 text-ink-inverted"
          >
            {hi ? 'पसंद सेव करें' : 'Save choices'}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => answer({ analytics: true, marketing: true })}
              className="h-10 flex-1 rounded-box bg-ink px-4 text-cta2 text-ink-inverted"
            >
              {hi ? 'सब की अनुमति दें' : 'Allow all'}
            </button>
            <button
              type="button"
              onClick={() => answer({ analytics: false, marketing: false })}
              className="h-10 flex-1 rounded-box bg-ink px-4 text-cta2 text-ink-inverted"
            >
              {hi ? 'सिर्फ़ ज़रूरी' : 'Only necessary'}
            </button>
            <button
              type="button"
              onClick={() => setChoosing(true)}
              className="h-10 w-full rounded-box border border-hairline-strong px-4 text-cta2 text-ink sm:w-auto"
            >
              {hi ? 'चुनें' : 'Choose'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
