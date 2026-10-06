'use client';

import { useState, useTransition } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import type { SavedCardDto } from '@StrikerStore/contract';
import { removeSavedCard } from '@/app/account/actions';
import type { Locale } from '@/lib/i18n';

/**
 * Cards the customer asked a gateway to remember, and a way to make it forget.
 *
 * Cards are saved inside the payment window, with the customer's consent, as
 * RBI's card-on-file rules require — so there is no "add a card" here. The shop
 * never holds the card; this only lists what the gateway does.
 */
export function SavedCards({ cards, locale }: { cards: SavedCardDto[]; locale: Locale }) {
  const hi = locale === 'hi';
  const [list, setList] = useState(cards);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (list.length === 0) {
    return (
      <div className="rounded-card border border-hairline bg-surface px-4 py-3">
        <p className="text-body2 text-ink">{hi ? 'कोई कार्ड सेव नहीं है' : 'No saved cards'}</p>
        <p className="mt-0.5 text-body4 text-ink-faint">
          {hi
            ? 'कार्ड से भुगतान करते समय "कार्ड सेव करें" चुनें — अगली बार यह यहाँ दिखेगा।'
            : 'Tick “save this card” when you next pay by card, and it will be offered at checkout after that.'}
        </p>
      </div>
    );
  }

  function remove(card: SavedCardDto) {
    const key = `${card.gateway}:${card.tokenId}`;
    setError(null);
    setRemoving(key);
    startTransition(async () => {
      const result = await removeSavedCard(card.gateway, card.tokenId);
      setRemoving(null);
      if (!result.ok) {
        setError(result.formErrors[0] ?? (hi ? 'कार्ड नहीं हटा।' : 'Could not remove that card.'));
        return;
      }
      setList((current) => current.filter((entry) => `${entry.gateway}:${entry.tokenId}` !== key));
    });
  }

  return (
    <div>
      <ul className="divide-y divide-hairline overflow-hidden rounded-card border border-hairline bg-surface">
        {list.map((card) => {
          const key = `${card.gateway}:${card.tokenId}`;
          return (
            <li key={key} className="flex min-h-[var(--tap)] items-center gap-3 px-4 py-3">
              <CreditCard className="size-5 shrink-0 text-ink-muted" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-body1 text-ink">
                  {card.network ?? (hi ? 'कार्ड' : 'Card')} •••• {card.last4}
                </span>
                {card.issuer && <span className="block text-body5 text-ink-muted">{card.issuer}</span>}
              </span>
              <button
                type="button"
                onClick={() => remove(card)}
                disabled={removing !== null}
                className="inline-flex items-center gap-1 text-cta3 text-error disabled:opacity-60"
              >
                {removing === key && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
                {hi ? 'हटाएँ' : 'Remove'}
              </button>
            </li>
          );
        })}
      </ul>
      {error && (
        <p role="alert" className="mt-2 text-body4 text-error">
          {error}
        </p>
      )}
    </div>
  );
}
