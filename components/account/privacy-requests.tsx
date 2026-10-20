'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import {
  isPrivacyRequestOpen,
  PRIVACY_REQUEST_STATUS_LABELS,
  type MyPrivacyRequestDto,
} from '@StrikerStore/contract';
import { cancelPrivacyRequest, createPrivacyRequest } from '@/app/account/actions';
import { Button } from '@/components/ui/button';
import type { Locale } from '@/lib/i18n';

type RequestType = 'CORRECTION' | 'GRIEVANCE';

const TYPES: Array<{ value: RequestType; en: string; hi: string; hintEn: string; hintHi: string }> = [
  {
    value: 'CORRECTION',
    en: 'Correct something',
    hi: 'कुछ सुधारना है',
    hintEn: 'What is wrong, and what it should be.',
    hintHi: 'क्या गलत है और सही क्या होना चाहिए।',
  },
  {
    value: 'GRIEVANCE',
    en: 'A complaint or question',
    hi: 'शिकायत या सवाल',
    hintEn: 'Anything about how we handle your data.',
    hintHi: 'हम आपका डेटा कैसे संभालते हैं, उससे जुड़ी कोई भी बात।',
  },
];

const TYPE_WORDS: Record<string, { en: string; hi: string }> = {
  CORRECTION: { en: 'Correction', hi: 'सुधार' },
  ERASURE: { en: 'Delete my account', hi: 'अकाउंट मिटाना' },
  GRIEVANCE: { en: 'Complaint or question', hi: 'शिकायत या सवाल' },
  NOMINATION: { en: 'Nominee', hi: 'नॉमिनी' },
  ACCESS: { en: 'My data', hi: 'मेरा डेटा' },
  CONSENT_WITHDRAWAL: { en: 'Withdraw a consent', hi: 'सहमति वापस' },
};

const STATUS_HI: Record<string, string> = {
  OPEN: 'मिल गया',
  IN_PROGRESS: 'काम चल रहा है',
  SCHEDULED: 'तय है',
  DONE: 'हो गया',
  REJECTED: 'अस्वीकार',
  CANCELLED: 'वापस लिया',
};

/**
 * Asking the grievance officer for something — a correction or a complaint
 * — and seeing where each request stands, deletions included. Deleting the
 * account itself has its own confirmed flow below this on the page.
 */
export function PrivacyRequests({
  initial,
  responseDays,
  locale,
}: {
  initial: MyPrivacyRequestDto[];
  responseDays: number;
  locale: Locale;
}) {
  const hi = locale === 'hi';
  const [requests, setRequests] = useState(initial);
  const [type, setType] = useState<RequestType>('CORRECTION');
  const [details, setDetails] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();
  const chosen = TYPES.find((option) => option.value === type)!;

  const date = (iso: string) =>
    new Date(iso).toLocaleDateString(hi ? 'hi-IN' : 'en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    });

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSent(false);
    startTransition(async () => {
      const result = await createPrivacyRequest({ type, details: details.trim() });
      if (!result.ok) {
        setError(result.fieldErrors.details ?? result.formErrors[0] ?? (hi ? 'भेजा नहीं जा सका।' : 'Could not send that.'));
        return;
      }
      setRequests((current) => [result.data, ...current]);
      setDetails('');
      setSent(true);
    });
  }

  function withdraw(id: string) {
    startTransition(async () => {
      const result = await cancelPrivacyRequest(id);
      if (!result.ok) {
        setError(result.formErrors[0] ?? null);
        return;
      }
      setRequests((current) =>
        current.map((row) => (row.id === id ? { ...row, status: 'CANCELLED' as const } : row)),
      );
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="space-y-3 rounded-card border border-hairline bg-surface p-4">
        <fieldset>
          <legend className="text-body3 text-ink-muted">{hi ? 'आप क्या चाहते हैं?' : 'What do you need?'}</legend>
          <div className="mt-2 space-y-2">
            {TYPES.map((option) => (
              <label key={option.value} className="flex items-center gap-2 text-body2 text-ink">
                <input
                  type="radio"
                  name="request-type"
                  value={option.value}
                  checked={type === option.value}
                  onChange={() => setType(option.value)}
                  className="size-4 accent-current"
                />
                {hi ? option.hi : option.en}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="block">
          <span className="block text-body4 text-ink-muted">{hi ? chosen.hintHi : chosen.hintEn}</span>
          <textarea
            value={details}
            onChange={(event) => {
              setDetails(event.target.value);
              setSent(false);
            }}
            rows={3}
            maxLength={2000}
            className="mt-1 w-full rounded-box border border-hairline-strong bg-surface px-3 py-2 text-body1 text-ink focus:border-ink focus:outline-none"
          />
        </label>

        {error && (
          <p role="alert" className="text-body4 text-error">
            {error}
          </p>
        )}
        {sent && (
          <p role="status" className="text-body4 text-success">
            {hi
              ? `मिल गया। हम ${responseDays} दिनों में WhatsApp पर जवाब देंगे।`
              : `Received. We will reply on WhatsApp within ${responseDays} days.`}
          </p>
        )}

        <Button type="submit" disabled={pending || details.trim().length < 5}>
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {hi ? 'भेजें' : 'Send'}
        </Button>
      </form>

      {requests.length > 0 && (
        <ul className="divide-y divide-hairline rounded-card border border-hairline bg-surface">
          {requests.map((row) => (
            <li key={row.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <span className="text-body2 text-ink">{hi ? TYPE_WORDS[row.type]?.hi : TYPE_WORDS[row.type]?.en}</span>
                <span className="shrink-0 text-body4 text-ink-muted">
                  {hi ? STATUS_HI[row.status] : PRIVACY_REQUEST_STATUS_LABELS[row.status]}
                </span>
              </div>
              <p className="mt-0.5 line-clamp-2 text-body4 text-ink-muted">{row.details}</p>
              <p className="mt-1 text-body4 text-ink-faint">
                {hi ? 'भेजा' : 'Sent'} {date(row.createdAt)}
                {isPrivacyRequestOpen(row.status)
                  ? ` · ${hi ? 'जवाब की आख़िरी तारीख़' : 'Answer due by'} ${date(row.dueAt)}`
                  : row.resolvedAt
                    ? ` · ${hi ? 'बंद' : 'Closed'} ${date(row.resolvedAt)}`
                    : ''}
              </p>
              {row.resolution && !isPrivacyRequestOpen(row.status) && (
                <p className="mt-1 text-body3 text-ink">{row.resolution}</p>
              )}
              {row.status === 'OPEN' && (
                <button
                  type="button"
                  onClick={() => withdraw(row.id)}
                  disabled={pending}
                  className="mt-1 text-body4 text-ink-muted underline hover:text-ink"
                >
                  {hi ? 'वापस लें' : 'Withdraw'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
