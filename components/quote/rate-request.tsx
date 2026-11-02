'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Check, Loader2 } from 'lucide-react';
import {
  ENQUIRY_MESSAGE_MAX,
  ENQUIRY_NAME_MAX,
  isValidIndianMobile,
  mobileInputValue,
  PRIVACY_NOTICE_PATH,
  type QuoteJob,
  type QuoteSelection,
} from '@StrikerStore/contract';
import { requestRate } from '@/app/quote/actions';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import type { Locale } from '@/lib/i18n';
import { track } from '@/lib/meta-pixel';

const FORM_ID = 'rate-request-form';
const INPUT =
  'mt-1 h-[var(--tap)] w-full rounded-box border border-hairline-strong bg-surface px-3 text-body1 text-ink focus:border-ink focus:outline-none';

/** Sends this material list to the shop, and asks for a better rate on it. */
export function RateRequest({
  locale,
  jobs,
  selections,
  customer,
  onClose,
}: {
  locale: Locale;
  jobs: QuoteJob[];
  selections: QuoteSelection[];
  customer: { name: string | null; phone: string } | null;
  onClose: () => void;
}) {
  const hi = locale === 'hi';
  const [name, setName] = useState(customer?.name ?? '');
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [message, setMessage] = useState('');
  const [company, setCompany] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ reference: string | null } | null>(null);
  const [pending, startTransition] = useTransition();

  const canSend = name.trim().length >= 2 && isValidIndianMobile(phone);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSend || pending) return;
    setFieldErrors({});
    setFormError(null);
    startTransition(async () => {
      try {
        const result = await requestRate({ name, phone, message, company, jobs, selections });
        if (result.ok) {
          track('Lead', { content_name: 'quote', content_category: 'quote' });
          setSent({ reference: result.data.reference });
          return;
        }
        setFieldErrors(result.fieldErrors);
        setFormError(result.formErrors[0] ?? null);
      } catch {
        setFormError(
          hi
            ? 'अनुरोध नहीं भेजा जा सका। दोबारा कोशिश करें या हमें कॉल करें।'
            : 'We could not send that. Try again, or call us.',
        );
      }
    });
  }

  return (
    <Sheet
      title={hi ? 'बेहतर भाव पूछें' : 'Ask for a better rate'}
      onClose={onClose}
      closeLabel={hi ? 'बंद करें' : 'Close'}
      size={sent ? 'half' : 'full'}
      footer={
        sent ? undefined : (
          <Button type="submit" form={FORM_ID} block disabled={!canSend || pending}>
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {hi ? 'भेजें' : 'Send my list'}
          </Button>
        )
      }
    >
      {sent ? (
        <div className="p-4">
          <p className="flex items-center gap-2 text-heading5 text-success">
            <Check className="size-5 shrink-0" aria-hidden />
            {hi ? 'धन्यवाद' : 'Thank you'}
          </p>
          <p className="mt-2 text-body2 text-ink">
            {hi
              ? `हम भाव के साथ +91 ${phone} पर आपसे संपर्क करेंगे।`
              : `We will get back to you with a rate on +91 ${phone}.`}
          </p>
          {sent.reference && (
            <p className="mt-1 text-body3 text-ink-muted">
              {hi ? 'आपका रेफ़रेंस नंबर' : 'Your reference is'} {sent.reference}
            </p>
          )}
          <Button type="button" variant="outline" block className="mt-4" onClick={onClose}>
            {hi ? 'बंद करें' : 'Close'}
          </Button>
        </div>
      ) : (
        <form id={FORM_ID} onSubmit={submit} className="relative space-y-3 p-4">
          <p className="text-body3 text-ink-muted">
            {hi
              ? 'हम आपकी सामान की सूची देखेंगे और इसी नंबर पर भाव बताएंगे।'
              : 'We will look at your material list and come back with a rate on this number.'}
          </p>

          <div>
            <label htmlFor="rate-name" className="block text-body3 text-ink-muted">
              {hi ? 'आपका नाम' : 'Your name'}
            </label>
            <input
              id="rate-name"
              value={name}
              onChange={(event) => setName(event.target.value.slice(0, ENQUIRY_NAME_MAX))}
              autoComplete="name"
              aria-invalid={Boolean(fieldErrors.name)}
              className={INPUT}
            />
            {fieldErrors.name && (
              <p role="alert" className="mt-1 text-body3 text-error">
                {fieldErrors.name}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="rate-phone" className="block text-body3 text-ink-muted">
              {hi ? 'मोबाइल नंबर' : 'Mobile number'}
            </label>
            <input
              id="rate-phone"
              value={phone}
              onChange={(event) => setPhone(mobileInputValue(event.target.value))}
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="9826000000"
              aria-invalid={Boolean(fieldErrors.phone)}
              className={INPUT}
            />
            {fieldErrors.phone && (
              <p role="alert" className="mt-1 text-body3 text-error">
                {fieldErrors.phone}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="rate-note" className="block text-body3 text-ink-muted">
              {hi ? 'कुछ और बताना है? (ज़रूरी नहीं)' : 'Anything else? (optional)'}
            </label>
            <textarea
              id="rate-note"
              rows={3}
              value={message}
              onChange={(event) => setMessage(event.target.value.slice(0, ENQUIRY_MESSAGE_MAX))}
              placeholder={hi ? 'जैसे साइट का पता, कब चाहिए' : 'For example the site address, or when you need it'}
              className="mt-1 w-full rounded-box border border-hairline-strong bg-surface px-3 py-2 text-body1 text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none"
            />
          </div>

          {/* The trap: see the Contact us form. */}
          <div aria-hidden className="absolute -left-[9999px] size-px overflow-hidden">
            <label>
              Company
              <input
                tabIndex={-1}
                autoComplete="off"
                value={company}
                onChange={(event) => setCompany(event.target.value)}
              />
            </label>
          </div>

          {/* What the number is for, before the button that sends it. */}
          <p className="text-body4 text-ink-muted">
            {hi
              ? 'यह नंबर सिर्फ़ इस सूची का भाव बताने के लिए इस्तेमाल होगा। '
              : 'We will use this number only to reply about this list. '}
            <Link href={PRIVACY_NOTICE_PATH} className="underline">
              {hi ? 'गोपनीयता सूचना' : 'Privacy Notice'}
            </Link>
          </p>

          {formError && (
            <p role="alert" className="text-body3 text-error">
              {formError}
            </p>
          )}
        </form>
      )}
    </Sheet>
  );
}
