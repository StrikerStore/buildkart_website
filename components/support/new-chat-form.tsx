'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  SUPPORT_MESSAGE_MAX,
  SUPPORT_TOPICS,
  supportTopicLabel,
  type SupportTopic,
} from '@buildkart/contract';
import { cn } from '@/lib/cn';
import { tr, type Locale } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { startTicket } from '@/app/support/actions';
import { PhotoField } from './photo-field';
import { useAttachment } from './use-attachment';

/**
 * Opening a conversation.
 *
 * The topic is a row of chips rather than a select, and it is pre-answered when
 * the chat came from an order — a customer who tapped "Get help with this
 * order" has already told us what it is about, and asking again is a form
 * making them repeat themselves.
 */
export function NewChatForm({
  locale,
  orderId,
  orderNumber,
}: {
  locale: Locale;
  orderId?: string;
  orderNumber?: string;
}) {
  const router = useRouter();
  const [topic, setTopic] = useState<SupportTopic>(orderId ? 'ORDER' : 'OTHER');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startSending] = useTransition();

  const attachment = useAttachment(tr(locale, 'support.photoFailed'));
  const canSend = (body.trim() !== '' || attachment.value !== null) && !attachment.uploading;

  function submit() {
    if (!canSend || pending) return;
    setError(null);

    startSending(async () => {
      const result = await startTicket({
        topic,
        orderId,
        body: body.trim(),
        attachment: attachment.value ?? undefined,
      });

      if (!result.ok) {
        setError(result.formErrors[0] ?? result.fieldErrors.body ?? tr(locale, 'support.sendFailed'));
        return;
      }

      // Straight into the thread, which is where the answer will arrive.
      router.replace(`/support/${result.data.ticketId}`);
    });
  }

  return (
    <div className="mt-5 flex flex-col gap-5">
      {orderNumber && (
        <p className="rounded-box bg-surface-muted px-4 py-3 text-body3 text-ink-muted">
          {tr(locale, 'support.aboutOrder', { order: orderNumber })}
        </p>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="text-body2 text-ink">{tr(locale, 'support.topicQuestion')}</legend>
        <div className="mt-1 flex flex-wrap gap-2">
          {SUPPORT_TOPICS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTopic(value)}
              aria-pressed={topic === value}
              className={cn(
                'inline-flex min-h-[var(--tap)] items-center rounded-pill border px-4 text-cta2 transition-colors',
                topic === value
                  ? 'border-brand bg-brand-tint text-brand-text'
                  : 'border-hairline-strong bg-surface text-ink hover:bg-surface-muted',
              )}
            >
              {supportTopicLabel(value, locale)}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor="support-body" className="text-body2 text-ink">
          {tr(locale, 'support.messageLabel')}
        </label>
        <textarea
          id="support-body"
          rows={5}
          value={body}
          onChange={(event) => setBody(event.target.value.slice(0, SUPPORT_MESSAGE_MAX))}
          placeholder={tr(locale, 'support.placeholder')}
          className="w-full rounded-box border border-hairline-strong bg-surface px-4 py-3 text-body2 text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
        />
      </div>

      <PhotoField attachment={attachment} locale={locale} disabled={pending} />

      {error && <p className="text-body3 text-error">{error}</p>}

      <Button type="button" onClick={submit} disabled={!canSend || pending} block>
        {pending ? tr(locale, 'support.sending') : tr(locale, 'support.send')}
      </Button>
    </div>
  );
}
