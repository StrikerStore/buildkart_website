'use client';

import {
  Banknote,
  CalendarClock,
  Clock3,
  CreditCard,
  Landmark,
  ShieldCheck,
  Smartphone,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import {
  compareMoney,
  formatINR,
  type CheckoutOption,
  type CheckoutOptionDto,
  type SavedCardDto,
} from '@StrikerStore/contract';
import { cn } from '@/lib/cn';

/** What the customer picked: an online option, one of their saved cards, or cash. */
export type PaymentChoice =
  | { kind: 'ONLINE'; option: CheckoutOption }
  | { kind: 'SAVED'; card: SavedCardDto }
  | { kind: 'COD' };

/** A stable string per choice, for the radio group and for remembering it. */
export function choiceKey(choice: PaymentChoice): string {
  if (choice.kind === 'COD') return 'COD';
  if (choice.kind === 'SAVED') return `saved:${choice.card.gateway}:${choice.card.tokenId}`;
  return choice.option;
}

const ICONS: Record<CheckoutOption, LucideIcon> = {
  UPI: Smartphone,
  CREDIT_CARD: CreditCard,
  DEBIT_CARD: CreditCard,
  NETBANKING: Landmark,
  WALLET: Wallet,
  PAYLATER: Clock3,
  EMI: CalendarClock,
};

/** The apps a customer looks for before they read the word "UPI". */
const UPI_APPS = ['GPay', 'PhonePe', 'Paytm', 'BHIM'];

/**
 * How to pay, in the customer's words.
 *
 * Never a gateway's name: "Razorpay" means nothing to somebody buying cement,
 * and which gateway takes the money is the shop's routing decision anyway.
 */
export function PaymentOptions({
  options,
  savedCards,
  cod,
  toPay,
  value,
  onChange,
  hi,
}: {
  options: CheckoutOptionDto[];
  savedCards: SavedCardDto[];
  /** Null when cash on delivery is switched off. */
  cod: { label: string; maxOrderValue: string } | null;
  toPay: string;
  value: PaymentChoice | null;
  onChange: (choice: PaymentChoice) => void;
  hi: boolean;
}) {
  const selected = value ? choiceKey(value) : null;
  const codTooLarge =
    cod !== null &&
    compareMoney(cod.maxOrderValue, '0.00') > 0 &&
    compareMoney(toPay, cod.maxOrderValue) > 0;

  return (
    <div className="mt-3 space-y-4">
      {savedCards.length > 0 && (
        <Group title={hi ? 'सेव किए गए कार्ड' : 'Saved cards'}>
          {savedCards.map((card) => {
            const choice: PaymentChoice = { kind: 'SAVED', card };
            return (
              <Choice
                key={choiceKey(choice)}
                id={choiceKey(choice)}
                checked={selected === choiceKey(choice)}
                onSelect={() => onChange(choice)}
                icon={CreditCard}
                title={`${card.network ?? (hi ? 'कार्ड' : 'Card')} •••• ${card.last4}`}
                hint={[card.issuer, cardTypeLabel(card.cardType, hi)].filter(Boolean).join(' · ')}
              />
            );
          })}
        </Group>
      )}

      {options.length > 0 && (
        <Group title={hi ? 'ऑनलाइन भुगतान' : 'Pay online'}>
          {options.map((entry) => {
            const choice: PaymentChoice = { kind: 'ONLINE', option: entry.option };
            return (
              <Choice
                key={entry.option}
                id={entry.option}
                checked={selected === entry.option}
                onSelect={() => onChange(choice)}
                icon={ICONS[entry.option]}
                title={hi ? entry.labelHi : entry.label}
                hint={hi ? entry.hintHi : entry.hint}
                extra={
                  entry.option === 'UPI' ? (
                    <span className="mt-1.5 flex flex-wrap gap-1">
                      {UPI_APPS.map((app) => (
                        <span
                          key={app}
                          className="rounded-full border border-hairline bg-surface px-2 py-0.5 text-caption text-ink-muted"
                        >
                          {app}
                        </span>
                      ))}
                    </span>
                  ) : null
                }
              />
            );
          })}
        </Group>
      )}

      {cod && (
        <Group title={hi ? 'डिलीवरी पर भुगतान' : 'Pay on delivery'}>
          <Choice
            id="COD"
            checked={selected === 'COD'}
            onSelect={() => onChange({ kind: 'COD' })}
            icon={Banknote}
            title={cod.label}
            hint={
              codTooLarge
                ? hi
                  ? `${formatINR(cod.maxOrderValue)} से ऊपर के ऑर्डर पर उपलब्ध नहीं`
                  : `Not available on orders above ${formatINR(cod.maxOrderValue)}`
                : hi
                  ? 'नकद या QR से, सामान मिलने पर'
                  : 'Cash or UPI QR when your goods arrive'
            }
            disabled={codTooLarge}
          />
        </Group>
      )}

      {options.length > 0 && (
        <p className="flex items-center gap-1.5 text-body5 text-ink-faint">
          <ShieldCheck className="size-4 shrink-0" aria-hidden />
          {hi
            ? 'भुगतान सुरक्षित बैंक-ग्रेड गेटवे से होता है। हम आपके कार्ड की जानकारी नहीं रखते।'
            : 'Payments go through a secure, RBI-regulated gateway. We never see or store your card details.'}
        </p>
      )}
    </div>
  );
}

function cardTypeLabel(type: string | null, hi: boolean): string | null {
  if (type === 'credit') return hi ? 'क्रेडिट' : 'Credit';
  if (type === 'debit') return hi ? 'डेबिट' : 'Debit';
  return null;
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-heading6 text-ink-muted">{title}</legend>
      <div className="space-y-2">{children}</div>
    </fieldset>
  );
}

function Choice({
  id,
  checked,
  onSelect,
  icon: Icon,
  title,
  hint,
  extra,
  disabled,
}: {
  id: string;
  checked: boolean;
  onSelect: () => void;
  icon: LucideIcon;
  title: string;
  hint?: string;
  extra?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <label
      htmlFor={`pay-${id}`}
      className={cn(
        'flex min-h-[var(--tap)] items-start gap-3 rounded-box border px-4 py-3',
        disabled
          ? 'cursor-not-allowed border-hairline bg-surface-muted opacity-70'
          : checked
            ? 'cursor-pointer border-ink bg-surface-muted'
            : 'cursor-pointer border-hairline-strong hover:border-ink',
      )}
    >
      <input
        id={`pay-${id}`}
        type="radio"
        name="paymentChoice"
        value={id}
        checked={checked}
        disabled={disabled}
        onChange={onSelect}
        className="mt-1 size-4 shrink-0 accent-[var(--ink)]"
      />
      <Icon className="mt-0.5 size-5 shrink-0 text-ink-muted" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block text-body1 text-ink">{title}</span>
        {hint && <span className="mt-0.5 block text-body5 text-ink-muted">{hint}</span>}
        {extra}
      </span>
    </label>
  );
}
