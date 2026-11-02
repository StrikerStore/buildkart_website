'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import {
  ENQUIRY_MESSAGE_MAX,
  ENQUIRY_NAME_MAX,
  isValidIndianMobile,
  mobileInputValue,
  PRIVACY_NOTICE_PATH,
} from '@StrikerStore/contract';
import { track } from '@/lib/meta-pixel';
import type { Locale } from '@/lib/i18n';
import { sendContactMessage } from './actions';

export const CONTACT_FORM_ID = 'assist-contact-form';

const FIELD =
  'mt-1 h-[var(--tap)] w-full rounded-box border border-hairline-strong bg-surface px-3 text-body1 text-ink focus:border-ink focus:outline-none';

/**
 * The form's state, held by the panel rather than the form.
 *
 * The Send button sits in the sheet's pinned footer, outside the fields, and a
 * customer who goes back to the menu and returns should find what they typed.
 */
export function useContactForm({
  initialName,
  initialPhone,
  locale,
  onSent,
}: {
  initialName: string;
  initialPhone: string;
  locale: Locale;
  onSent: (sent: { reference: string | null; phone: string }) => void;
}) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [message, setMessage] = useState('');
  const [company, setCompany] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canSend =
    name.trim().length >= 2 && isValidIndianMobile(phone) && message.trim().length >= 3;

  function submit() {
    if (!canSend || pending) return;
    setFieldErrors({});
    setFormError(null);
    startTransition(async () => {
      try {
        const result = await sendContactMessage({ name, phone, message, company });
        if (result.ok) {
          track('Lead', { content_name: 'contact', content_category: 'support' });
          onSent({ reference: result.data.reference, phone });
          return;
        }
        setFieldErrors(result.fieldErrors);
        setFormError(result.formErrors[0] ?? null);
      } catch {
        setFormError(
          locale === 'hi'
            ? 'संदेश नहीं भेजा जा सका। दोबारा कोशिश करें या हमें कॉल करें।'
            : 'We could not send that. Try again, or call us.',
        );
      }
    });
  }

  return {
    name,
    setName,
    phone,
    setPhone,
    message,
    setMessage,
    company,
    setCompany,
    fieldErrors,
    formError,
    pending,
    canSend,
    submit,
  };
}

export type ContactFormState = ReturnType<typeof useContactForm>;

/** The fields. The Send button is the panel's, in the sheet's footer. */
export function ContactForm({ form, locale }: { form: ContactFormState; locale: Locale }) {
  const hi = locale === 'hi';

  return (
    <form
      id={CONTACT_FORM_ID}
      className="relative space-y-3 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        form.submit();
      }}
    >
      <p className="text-body3 text-ink-muted">
        {hi
          ? 'अपना सवाल लिखें। हम इसी नंबर पर आपसे संपर्क करेंगे।'
          : 'Tell us what you need, and we will get back to you on this number.'}
      </p>

      <div>
        <label htmlFor="assist-name" className="block text-body3 text-ink-muted">
          {hi ? 'आपका नाम' : 'Your name'}
        </label>
        <input
          id="assist-name"
          value={form.name}
          onChange={(event) => form.setName(event.target.value.slice(0, ENQUIRY_NAME_MAX))}
          autoComplete="name"
          aria-invalid={Boolean(form.fieldErrors.name)}
          className={FIELD}
        />
        {form.fieldErrors.name && (
          <p role="alert" className="mt-1 text-body3 text-error">
            {form.fieldErrors.name}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="assist-phone" className="block text-body3 text-ink-muted">
          {hi ? 'मोबाइल नंबर' : 'Mobile number'}
        </label>
        <input
          id="assist-phone"
          value={form.phone}
          // Cleaned, not truncated: see the login form.
          onChange={(event) => form.setPhone(mobileInputValue(event.target.value))}
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="9826000000"
          aria-invalid={Boolean(form.fieldErrors.phone)}
          className={FIELD}
        />
        {form.fieldErrors.phone && (
          <p role="alert" className="mt-1 text-body3 text-error">
            {form.fieldErrors.phone}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="assist-message" className="block text-body3 text-ink-muted">
          {hi ? 'आपका संदेश' : 'Your message'}
        </label>
        <textarea
          id="assist-message"
          rows={4}
          value={form.message}
          onChange={(event) => form.setMessage(event.target.value.slice(0, ENQUIRY_MESSAGE_MAX))}
          aria-invalid={Boolean(form.fieldErrors.message)}
          className="mt-1 w-full rounded-box border border-hairline-strong bg-surface px-3 py-2 text-body1 text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none"
        />
        {form.fieldErrors.message && (
          <p role="alert" className="mt-1 text-body3 text-error">
            {form.fieldErrors.message}
          </p>
        )}
      </div>

      {/*
       * The trap. Off-screen rather than display:none, which scripts learn to
       * skip, and out of the tab order so nobody reaches it by keyboard.
       */}
      <div aria-hidden className="absolute -left-[9999px] size-px overflow-hidden">
        <label>
          Company
          <input
            tabIndex={-1}
            autoComplete="off"
            value={form.company}
            onChange={(event) => form.setCompany(event.target.value)}
          />
        </label>
      </div>

      {/* What the number is for, said before the button that sends it. Pressing
          the button under this is the yes the API records (DPDP Act §6). */}
      <p className="text-body4 text-ink-muted">
        {hi
          ? 'यह नंबर सिर्फ़ इस संदेश का जवाब देने के लिए इस्तेमाल होगा। '
          : 'We will use this number only to reply to this message. '}
        <Link href={PRIVACY_NOTICE_PATH} className="underline">
          {hi ? 'गोपनीयता सूचना' : 'Privacy Notice'}
        </Link>
      </p>

      {form.formError && (
        <p role="alert" className="text-body3 text-error">
          {form.formError}
        </p>
      )}
    </form>
  );
}
