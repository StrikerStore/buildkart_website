'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { readCookie, writeCookie } from '@/lib/browser-cookies';
import { CONSENT_COOKIE, CONSENT_MAX_AGE, parseConsent, type AdConsent } from '@/lib/consent';
import { grantConsent, revokeConsent } from '@/lib/meta-pixel';
import type { Locale } from '@/lib/i18n';

/**
 * Asks once whether Meta may measure this visit for ads.
 *
 * Rendered only when the owner has switched it on. Read from the cookie after
 * mount rather than on the server, so a cached page never shows the banner to
 * someone who already answered, or hides it from someone who has not.
 *
 * Two equal buttons — declining is as easy as accepting, which is what makes
 * the answer a choice rather than a formality.
 */
export function ConsentBanner({ locale }: { locale: Locale }) {
  const [answered, setAnswered] = useState(true);

  useEffect(() => {
    try {
      setAnswered(parseConsent(readCookie(CONSENT_COOKIE)) !== null);
    } catch {
      setAnswered(false);
    }
  }, []);

  if (answered) return null;
  const hi = locale === 'hi';

  const answer = (value: AdConsent) => {
    try {
      writeCookie(CONSENT_COOKIE, value, CONSENT_MAX_AGE);
    } catch {
      // Blocked cookies: the choice still applies to this visit.
    }
    if (value === 'granted') grantConsent();
    else revokeConsent();
    setAnswered(true);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={hi ? 'विज्ञापन माप की अनुमति' : 'Ad measurement consent'}
      className="fixed inset-x-3 bottom-24 z-50 mx-auto max-w-xl rounded-card border border-hairline bg-surface p-4 shadow-raised md:bottom-6"
    >
      <p className="text-body2 text-ink">
        {hi
          ? 'हम Meta (Facebook, Instagram) के ज़रिए यह मापते हैं कि हमारे विज्ञापन काम कर रहे हैं या नहीं। क्या आप इसकी अनुमति देते हैं?'
          : 'We use Meta (Facebook, Instagram) to measure whether our ads work. Is that okay with you?'}{' '}
        <Link href="/help" className="underline">
          {hi ? 'और जानें' : 'Learn more'}
        </Link>
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => answer('granted')}
          className="h-10 flex-1 rounded-box bg-ink px-4 text-cta2 text-ink-inverted"
        >
          {hi ? 'ठीक है' : 'Allow'}
        </button>
        <button
          type="button"
          onClick={() => answer('denied')}
          className="h-10 flex-1 rounded-box border border-hairline-strong px-4 text-cta2 text-ink"
        >
          {hi ? 'नहीं' : "Don't allow"}
        </button>
      </div>
    </div>
  );
}
