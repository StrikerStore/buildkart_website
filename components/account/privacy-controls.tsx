'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { ChevronRight, Loader2 } from 'lucide-react';
import { PRIVACY_NOTICE_PATH, type MyPrivacyDto } from '@StrikerStore/contract';
import { savePrivacy } from '@/app/account/actions';
import { openChoices } from '@/lib/consent-client';
import type { Locale } from '@/lib/i18n';

type Key = 'whatsappUpdates' | 'whatsappOffers';

/**
 * The customer's own switches: WhatsApp updates, WhatsApp offers, and the
 * cookie banner's answers.
 *
 * Each switch saves on its own the moment it changes — no Save button to
 * forget — and says when it could not. The cookie answers reopen the banner
 * itself rather than duplicating it here, so there is one place they are
 * changed and one wording for what they mean.
 */
export function PrivacyControls({ initial, locale }: { initial: MyPrivacyDto; locale: Locale }) {
  const hi = locale === 'hi';
  const [state, setState] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [saving, setSaving] = useState<Key | null>(null);

  function toggle(key: Key, value: boolean) {
    setError(null);
    setSaving(key);
    setState((current) => ({ ...current, [key]: value }));
    startTransition(async () => {
      const result = await savePrivacy({ [key]: value });
      setSaving(null);
      if (!result.ok) {
        setState((current) => ({ ...current, [key]: !value }));
        setError(result.formErrors[0] ?? (hi ? 'सेव नहीं हो सका।' : 'Could not save that.'));
        return;
      }
      setState(result.data);
    });
  }

  const row = (key: Key, title: string, detail: string) => (
    <label className="flex items-start gap-3 px-4 py-3">
      <input
        type="checkbox"
        checked={state[key]}
        disabled={pending && saving === key}
        onChange={(event) => toggle(key, event.target.checked)}
        className="mt-1 size-4 shrink-0 accent-current"
      />
      <span className="flex-1">
        <span className="block text-body1 text-ink">{title}</span>
        <span className="block text-body4 text-ink-muted">{detail}</span>
      </span>
      {pending && saving === key && (
        <Loader2 className="mt-1 size-4 animate-spin text-ink-faint" aria-hidden />
      )}
    </label>
  );

  return (
    <div>
      <div className="divide-y divide-hairline rounded-card border border-hairline bg-surface">
        {row(
          'whatsappUpdates',
          hi ? 'ऑर्डर की जानकारी WhatsApp पर' : 'Order updates on WhatsApp',
          hi
            ? 'ऑर्डर, भुगतान और डिलीवरी के मैसेज। लॉगिन कोड हमेशा आता है।'
            : 'Order, payment and delivery messages. Sign-in codes always come.',
        )}
        {row(
          'whatsappOffers',
          hi ? 'ऑफ़र WhatsApp पर' : 'Offers on WhatsApp',
          hi ? 'ऑफ़र और नए सामान की जानकारी।' : 'Offers and new products.',
        )}
        <button
          type="button"
          onClick={openChoices}
          className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-muted"
        >
          <span className="flex-1">
            <span className="block text-body1 text-ink">
              {hi ? 'कुकीज़ और विज्ञापन माप' : 'Cookies and ad measurement'}
            </span>
            <span className="block text-body4 text-ink-muted">
              {hi
                ? 'साइट का इस्तेमाल और Meta विज्ञापन माप की अनुमति बदलें।'
                : 'Change whether we measure site use and Meta ads.'}
            </span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-ink-faint" aria-hidden />
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-body3 text-error">
          {error}
        </p>
      )}

      <p className="mt-1.5 text-body4 text-ink-faint">
        {hi ? 'हम आपके डेटा का क्या करते हैं: ' : 'What we do with your data: '}
        <Link href={PRIVACY_NOTICE_PATH} className="underline">
          {hi ? 'गोपनीयता सूचना' : 'Privacy Notice'}
        </Link>
      </p>
    </div>
  );
}
