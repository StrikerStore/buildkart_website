'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { Send } from 'lucide-react';
import {
  SUPPORT_MESSAGE_MAX,
  type SupportMessageDto,
  type SupportThreadDto,
} from '@StrikerStore/contract';
import { cn } from '@/lib/cn';
import { tr, type Locale } from '@/lib/i18n';
import { useThreadPoll } from '@/lib/use-thread-poll';
import { markRead, sendMessage } from '@/app/support/actions';
import { PhotoField } from './photo-field';
import { useAttachment } from './use-attachment';

/**
 * The customer's side of the conversation.
 *
 * Seeded with the messages the page already rendered on the server, so the
 * thread is complete and readable before any JavaScript runs — then kept
 * current by the poll. On a weak connection that ordering is the difference
 * between a page and a spinner.
 */
export function SupportThreadView({
  ticket,
  locale,
}: {
  ticket: SupportThreadDto;
  locale: Locale;
}) {
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startSending] = useTransition();
  const attachment = useAttachment(tr(locale, 'support.photoFailed'));

  const { messages, status, refresh } = useThreadPoll({
    url: `/api/support/${ticket.id}/messages`,
    initial: ticket.messages,
    initialStatus: ticket.status,
  });

  /*
   * Reading is what opening the thread means. Re-run when the newest message
   * changes so a reply that arrives while the page is open is also marked read
   * — the customer is looking straight at it.
   */
  const newest = messages.at(-1)?.id;
  useEffect(() => {
    void markRead({ ticketId: ticket.id });
  }, [ticket.id, newest]);

  const canSend = (body.trim() !== '' || attachment.value !== null) && !attachment.uploading;

  const send = useCallback(() => {
    if (!canSend || pending) return;
    setError(null);

    const text = body.trim();
    const photo = attachment.value;

    startSending(async () => {
      const result = await sendMessage({
        ticketId: ticket.id,
        body: text,
        attachment: photo ?? undefined,
      });

      if (!result.ok) {
        setError(result.formErrors[0] ?? tr(locale, 'support.sendFailed'));
        return;
      }

      setBody('');
      attachment.clear();
      // Ask straight away rather than waiting out the interval: the customer
      // pressed send, so the message appearing is the confirmation.
      refresh();
    });
  }, [attachment, body, canSend, locale, pending, refresh, ticket.id]);

  return (
    <div className="mt-5 flex flex-col gap-4">
      {status === 'RESOLVED' && (
        <p className="rounded-box bg-surface-muted px-4 py-3 text-body3 text-ink-muted">
          {tr(locale, 'support.resolvedNote')}
        </p>
      )}

      <MessageList messages={messages} locale={locale} />

      <div className="flex flex-col gap-3 border-t border-hairline pt-4">
        <textarea
          rows={3}
          value={body}
          onChange={(event) => setBody(event.target.value.slice(0, SUPPORT_MESSAGE_MAX))}
          placeholder={tr(locale, 'support.reply')}
          aria-label={tr(locale, 'support.messageLabel')}
          className="w-full rounded-box border border-hairline-strong bg-surface px-4 py-3 text-body2 text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <PhotoField attachment={attachment} locale={locale} disabled={pending} />

          <button
            type="button"
            onClick={send}
            disabled={!canSend || pending}
            className="inline-flex min-h-[var(--tap)] items-center gap-2 rounded-box bg-brand px-5 text-cta2 font-bold text-brand-foreground hover:bg-brand-dark disabled:pointer-events-none disabled:opacity-50"
          >
            <Send className="size-4" aria-hidden />
            {pending ? tr(locale, 'support.sending') : tr(locale, 'support.send')}
          </button>
        </div>

        {error && <p className="text-body3 text-error">{error}</p>}
      </div>
    </div>
  );
}

/**
 * The messages themselves.
 *
 * Not extracted to a shared component with the admin's: the two look different
 * on purpose — this one is a customer's chat on a phone, that one is a work
 * queue on a desktop — and they live in separate repositories.
 */
function MessageList({ messages, locale }: { messages: SupportMessageDto[]; locale: Locale }) {
  const scroller = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);

  useEffect(() => {
    const element = scroller.current;
    if (!element || !pinned.current) return;
    element.scrollTop = element.scrollHeight;
  }, [messages]);

  return (
    <div
      ref={scroller}
      onScroll={() => {
        const element = scroller.current;
        if (!element) return;
        // Auto-scroll only while they are already at the bottom. Yanking someone
        // back down while they are reading is the worst thing a chat can do.
        pinned.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
      }}
      className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto"
    >
      {messages.map((message) => {
        const mine = message.authorRole === 'CUSTOMER';

        return (
          <div key={message.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
            <div
              className={cn(
                'flex max-w-[85%] flex-col gap-2 rounded-card px-4 py-3',
                mine
                  ? 'bg-brand-tint text-ink'
                  : 'border border-hairline bg-surface-muted text-ink',
              )}
            >
              {message.attachmentUrl && (
                /* Plain <img>, not next/image: the host is R2 behind a
                   configurable public base, which the optimiser would need
                   allow-listed at build time for a photo shown once. */
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={message.attachmentUrl}
                  alt={tr(locale, 'support.photoAlt')}
                  width={message.attachmentWidth ?? undefined}
                  height={message.attachmentHeight ?? undefined}
                  loading="lazy"
                  className="max-h-64 w-auto rounded-box object-contain"
                />
              )}

              {message.body && (
                <p className="wrap-anywhere text-body2 whitespace-pre-wrap">{message.body}</p>
              )}

              <p className="text-body4 text-ink-faint">
                {mine ? tr(locale, 'support.you') : tr(locale, 'support.shop')}
                {' · '}
                {new Date(message.createdAt).toLocaleTimeString(
                  locale === 'hi' ? 'hi-IN' : 'en-IN',
                  { hour: 'numeric', minute: '2-digit' },
                )}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
