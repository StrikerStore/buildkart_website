'use client';

import Link from 'next/link';
import { useRef, useState, useTransition } from 'react';
import { Loader2, Minus, Plus, Printer, Share2, Trash2, Undo2 } from 'lucide-react';
import {
  describeMaterialQuantity,
  describeQuoteJob,
  formatINR,
  QUOTE_MATERIAL_LABELS,
  type QuoteEstimateDto,
  type QuoteJob,
  type QuoteLineDto,
  type QuoteMaterial,
  type QuoteOptionDto,
  type QuoteSelection,
} from '@StrikerStore/contract';
import { addQuoteToCart } from '@/app/cart/actions';
import { repriceQuote } from '@/app/quote/actions';
import { Button } from '@/components/ui/button';
import type { Locale } from '@/lib/i18n';
import { RateRequest } from './rate-request';

const QTY_MAX = 99_999;

function optionName(option: QuoteOptionDto, locale: Locale): string {
  const name = locale === 'hi' ? (option.nameHi ?? option.nameEn) : option.nameEn;
  return option.variantLabel ? `${name} (${option.variantLabel})` : name;
}

function lineUnit(line: QuoteLineDto, locale: Locale): string {
  return (locale === 'hi' ? line.unitLabelHi : line.unitLabelEn) ?? line.unitLabelEn ?? '';
}

/** Why a line is not in the total, said on the line. */
function statusNote(line: QuoteLineDto, hi: boolean): string | null {
  if (line.status === 'NO_PRODUCT') {
    return hi
      ? 'यह अभी ऑनलाइन नहीं है। नीचे से भाव पूछें।'
      : 'Not listed online yet. Ask for a rate below.';
  }
  if (line.status === 'OVER_LIMIT') {
    return hi
      ? 'इतनी मात्रा कार्ट में नहीं जा सकती। नीचे से भाव पूछें।'
      : 'Too large a quantity for the cart. Ask for a rate below.';
  }
  if (line.status === 'OUT_OF_STOCK') {
    return hi
      ? 'अभी स्टॉक में नहीं है। दूसरा चुनें या भाव पूछें।'
      : 'Out of stock right now. Choose another, or ask for a rate.';
  }
  return null;
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={strong ? 'text-heading5 text-ink' : 'text-body2 text-ink-muted'}>{label}</dt>
      <dd className={strong ? 'tabular text-heading4 text-ink' : 'tabular text-body2 text-ink'}>
        {value}
      </dd>
    </div>
  );
}

/**
 * The material list, with live prices.
 *
 * Everything comes back from the API with each change, because a quantity moves
 * bulk rates, delivery and GST together, and only the server can say what they
 * are. The customer's edits stay on this device: a shared link holds the
 * measurements, and opens with the shop's defaults.
 */
export function QuoteResults({
  jobs,
  initial,
  locale,
  customer,
}: {
  jobs: QuoteJob[];
  initial: QuoteEstimateDto;
  locale: Locale;
  customer: { name: string | null; phone: string } | null;
}) {
  const hi = locale === 'hi';
  const [estimate, setEstimate] = useState(initial);
  const [selections, setSelections] = useState<QuoteSelection[]>([]);
  const [repricing, startRepricing] = useTransition();
  const [adding, startAdding] = useTransition();
  const [added, setAdded] = useState<{ count: number; skipped: number } | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [priceError, setPriceError] = useState(false);
  const [asking, setAsking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Only the latest answer counts, whichever order they land in.
  const latest = useRef(0);

  function reprice(next: QuoteSelection[]) {
    setSelections(next);
    setAdded(null);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const request = ++latest.current;
      startRepricing(async () => {
        try {
          const fresh = await repriceQuote(jobs, next);
          if (request === latest.current) {
            setEstimate(fresh);
            setPriceError(false);
          }
        } catch {
          if (request === latest.current) setPriceError(true);
        }
      });
    }, 350);
  }

  function select(selection: QuoteSelection) {
    reprice([...selections.filter((row) => row.material !== selection.material), selection]);
  }

  /** Shown straight away: the stepper must not wait for a round trip. */
  function setQuantity(line: QuoteLineDto, quantity: number) {
    const clamped = Math.max(1, Math.min(QTY_MAX, Math.trunc(quantity) || 1));
    setEstimate((current) => ({
      ...current,
      lines: current.lines.map((row) =>
        row.material === line.material ? { ...row, quantity: clamped } : row,
      ),
    }));
    select({ material: line.material, variantId: line.variantId, quantity: clamped });
  }

  const priced = estimate.lines.filter((line) => line.status === 'PRICED');
  const unpriced = estimate.lines.some(
    (line) => line.status !== 'PRICED' && line.status !== 'REMOVED',
  );

  function addToCart() {
    setAddError(null);
    startAdding(async () => {
      try {
        const result = await addQuoteToCart(
          priced.map((line) => ({ variantId: line.variantId!, qty: line.quantity })),
        );
        setAdded({ count: priced.length - result.skipped.length, skipped: result.skipped.length });
      } catch {
        setAddError(hi ? 'कार्ट में नहीं जुड़ा। दोबारा कोशिश करें।' : 'Could not add that. Try again.');
      }
    });
  }

  function shareOnWhatsapp() {
    const summary = jobs.map((job) => describeQuoteJob(job, locale)).join('\n');
    const text = `${hi ? 'मेरे काम का सामान' : 'Materials for my job'}:\n${summary}\n${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  }

  const delivery = estimate.delivery;
  const deliveryValue = !delivery
    ? priced.length > 0
      ? hi
        ? 'इलाका चुनें'
        : 'Set your area'
      : '—'
    : !delivery.serviced
      ? hi
        ? 'इस इलाके में नहीं'
        : 'Not in this area'
      : !delivery.hasFlatLines
        ? hi
          ? 'भाव में शामिल'
          : 'In the prices'
        : estimate.deliveryCharge === '0.00'
          ? hi
            ? 'फ़्री'
            : 'Free'
          : formatINR(estimate.deliveryCharge);

  return (
    <section aria-label={hi ? 'सामान की सूची' : 'Material list'}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-heading4 text-ink">{hi ? 'आपके लिए सामान' : 'Materials you need'}</h2>
        {repricing && <Loader2 className="size-4 animate-spin text-ink-muted print:hidden" aria-hidden />}
      </div>

      {/* A printed list has to say which job it is for. On screen the jobs are
          beside it, or above it on a phone. */}
      <ul className="mt-1 hidden text-body3 text-ink-muted print:block">
        {jobs.map((job, index) => (
          <li key={index}>{describeQuoteJob(job, locale)}</li>
        ))}
      </ul>

      <ul className="mt-3 space-y-3">
        {estimate.lines.map((line) => {
          const name = QUOTE_MATERIAL_LABELS[line.material as QuoteMaterial][locale];
          const needed = describeMaterialQuantity(line.material, line.needed, locale);
          const note = statusNote(line, hi);

          if (line.status === 'REMOVED') {
            return (
              <li
                key={line.material}
                className="flex items-center justify-between gap-3 rounded-card border border-dashed border-hairline-strong p-3 print:hidden"
              >
                <span className="text-body2 text-ink-muted">
                  {name} {hi ? 'हटाया गया' : 'left out'}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    select({ material: line.material, variantId: line.variantId, quantity: null })
                  }
                  className="inline-flex min-h-[var(--tap)] items-center gap-1.5 text-cta2 text-ink underline-offset-2 hover:underline"
                >
                  <Undo2 className="size-4" aria-hidden />
                  {hi ? 'वापस जोड़ें' : 'Put back'}
                </button>
              </li>
            );
          }

          return (
            <li
              key={line.material}
              className="rounded-card border border-hairline bg-surface p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-heading5 text-ink">{name}</h3>
                  <p className="text-body3 text-ink-muted">
                    {hi ? 'ज़रूरत' : 'Needed'}: {needed}
                  </p>
                </div>
                {line.variantId && (
                  <button
                    type="button"
                    onClick={() =>
                      select({ material: line.material, variantId: line.variantId, quantity: 0 })
                    }
                    aria-label={`${hi ? 'हटाएं' : 'Leave out'} ${name}`}
                    className="grid size-9 shrink-0 place-items-center rounded-box text-ink-muted hover:bg-surface-muted print:hidden"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                )}
              </div>

              {line.options.length > 1 && (
                <>
                  <label className="mt-2 block print:hidden">
                    <span className="sr-only">
                      {hi ? 'उत्पाद चुनें' : 'Choose a product'}: {name}
                    </span>
                    <select
                      value={line.variantId ?? ''}
                      // A different pack covers a different amount, so the
                      // quantity is worked out again rather than carried over.
                      onChange={(event) =>
                        select({
                          material: line.material,
                          variantId: event.target.value,
                          quantity: null,
                        })
                      }
                      className="h-[var(--tap)] w-full rounded-box border border-hairline-strong bg-surface px-3 text-body2 text-ink focus:border-ink focus:outline-none"
                    >
                      {line.variantId === null && <option value="">—</option>}
                      {line.options.map((option) => (
                        <option key={option.variantId} value={option.variantId}>
                          {optionName(option, locale)}
                          {option.inStock ? '' : hi ? ' (स्टॉक में नहीं)' : ' (out of stock)'}
                        </option>
                      ))}
                    </select>
                  </label>
                  {line.nameEn && (
                    <p className="mt-1 hidden text-body3 text-ink print:block">
                      {hi ? (line.nameHi ?? line.nameEn) : line.nameEn}
                      {line.variantLabel ? ` (${line.variantLabel})` : ''}
                    </p>
                  )}
                </>
              )}
              {line.options.length === 1 && line.nameEn && (
                <p className="mt-1 text-body3 text-ink">
                  {hi ? (line.nameHi ?? line.nameEn) : line.nameEn}
                  {line.variantLabel ? ` (${line.variantLabel})` : ''}
                </p>
              )}

              {line.variantId && (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 print:hidden">
                    <button
                      type="button"
                      onClick={() => setQuantity(line, line.quantity - 1)}
                      disabled={line.quantity <= 1}
                      aria-label={`${hi ? 'कम करें' : 'Less'} ${name}`}
                      className="grid size-11 place-items-center rounded-box border border-hairline-strong text-ink disabled:opacity-40"
                    >
                      <Minus className="size-4" aria-hidden />
                    </button>
                    <input
                      value={line.quantity}
                      onChange={(event) => setQuantity(line, Number(event.target.value.replace(/\D/g, '')))}
                      inputMode="numeric"
                      aria-label={`${hi ? 'मात्रा' : 'Quantity'} ${name}`}
                      className="tabular h-11 w-20 rounded-box border border-hairline-strong bg-surface text-center text-body1 text-ink focus:border-ink focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity(line, line.quantity + 1)}
                      aria-label={`${hi ? 'बढ़ाएं' : 'More'} ${name}`}
                      className="grid size-11 place-items-center rounded-box border border-hairline-strong text-ink"
                    >
                      <Plus className="size-4" aria-hidden />
                    </button>
                    <span className="text-body3 text-ink-muted">{lineUnit(line, locale)}</span>
                  </div>

                  <p className="hidden text-body2 text-ink print:block">
                    {hi ? 'मात्रा' : 'Quantity'}: {line.quantity}
                    {lineUnit(line, locale) ? ` (${lineUnit(line, locale)})` : ''}
                  </p>

                  {line.lineTotal && (
                    <div className="text-right">
                      <p className="tabular text-heading5 text-ink">{formatINR(line.lineTotal)}</p>
                      {line.unitPrice && (
                        <p className="tabular text-body4 text-ink-muted">
                          {formatINR(line.unitPrice)} {lineUnit(line, locale)}
                          {line.wasBulkPrice ? (hi ? ', थोक भाव' : ', bulk rate') : ''}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {line.availableQty !== null && (
                <p className="mt-2 text-body3 text-warning-fg">
                  {hi
                    ? `अभी केवल ${line.availableQty} उपलब्ध हैं।`
                    : `Only ${line.availableQty} available right now.`}
                </p>
              )}

              {note && <p className="mt-2 text-body3 text-warning-fg">{note}</p>}
            </li>
          );
        })}
      </ul>

      <div className="mt-3 rounded-card border border-hairline bg-surface p-4">
        <dl className="space-y-1.5">
          <Row label={hi ? 'सामान' : 'Materials'} value={formatINR(estimate.subtotal)} />
          {estimate.taxAddedTotal !== '0.00' && (
            <Row label={hi ? 'जीएसटी' : 'GST'} value={formatINR(estimate.taxAddedTotal)} />
          )}
          <Row label={hi ? 'इस सूची की डिलीवरी' : 'Delivery for this list'} value={deliveryValue} />
          <div className="border-t border-hairline pt-1.5">
            <Row label={hi ? 'कुल' : 'Total'} value={formatINR(estimate.grandTotal)} strong />
          </div>
        </dl>

        {!delivery && priced.length > 0 && (
          <p className="mt-2 text-body3 text-ink-muted print:hidden">
            <Link href="/location" className="underline">
              {hi ? 'अपना इलाका चुनें' : 'Set your area'}
            </Link>{' '}
            {hi ? 'ताकि डिलीवरी का पता चले।' : 'to see delivery.'}
          </p>
        )}
        {unpriced && (
          <p className="mt-2 text-body3 text-warning-fg">
            {hi
              ? 'कुल में वे चीज़ें शामिल नहीं हैं जिनका भाव पूछना है।'
              : 'The total leaves out anything you need to ask a rate for.'}
          </p>
        )}
        {priceError && (
          <p role="alert" className="mt-2 text-body3 text-error print:hidden">
            {hi ? 'भाव नहीं आ सका। दोबारा कोशिश करें।' : 'We could not update the prices. Try again.'}
          </p>
        )}

        <div className="mt-4 hidden lg:block print:hidden">
          <Button
            type="button"
            variant="buy"
            block
            onClick={addToCart}
            disabled={adding || repricing || priced.length === 0}
          >
            {adding && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {hi ? 'कार्ट में जोड़ें' : 'Add to cart'}
          </Button>
        </div>

        {added && (
          <p role="status" className="mt-3 text-body2 text-success print:hidden">
            {added.count > 0 && (
              <>
                {hi ? `${added.count} चीज़ें कार्ट में जोड़ दी गईं।` : `Added ${added.count} to your cart.`}{' '}
                <Link href="/cart" className="underline">
                  {hi ? 'कार्ट देखें' : 'View cart'}
                </Link>
              </>
            )}
            {added.skipped > 0 && (
              <span className="mt-1 block text-warning-fg">
                {hi
                  ? `${added.skipped} चीज़ें कार्ट में नहीं आ सकीं। उनका भाव पूछें।`
                  : `${added.skipped} could not fit in your cart. Ask for a rate on those.`}
              </span>
            )}
          </p>
        )}
        {addError && (
          <p role="alert" className="mt-3 text-body3 text-error print:hidden">
            {addError}
          </p>
        )}

        <div className="mt-3 grid gap-2 sm:grid-cols-3 print:hidden">
          <Button type="button" variant="outline" onClick={() => setAsking(true)}>
            {hi ? 'बेहतर भाव पूछें' : 'Ask for a better rate'}
          </Button>
          <Button type="button" variant="quiet" onClick={() => window.print()}>
            <Printer className="size-4" aria-hidden />
            {hi ? 'प्रिंट करें' : 'Print'}
          </Button>
          <Button type="button" variant="quiet" onClick={shareOnWhatsapp}>
            <Share2 className="size-4" aria-hidden />
            {hi ? 'व्हाट्सएप पर भेजें' : 'Share on WhatsApp'}
          </Button>
        </div>
      </div>

      <details className="mt-3 text-body3 text-ink-muted">
        <summary className="cursor-pointer select-none underline underline-offset-2 print:hidden">
          {hi ? 'यह हिसाब कैसे लगा' : 'How this is worked out'}
        </summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            {hi
              ? 'इसमें 5% बर्बादी जोड़ी गई है, और टाइल पर 10%।'
              : 'It includes 5% for wastage, and 10% for tiles.'}
          </li>
          <li>
            {hi
              ? 'सरिया का अंदाज़ा आम तौर पर लगने वाली मात्रा से है। असली मात्रा आपकी ड्रॉइंग से तय होगी।'
              : 'Steel is a typical figure. Your drawings decide the real amount.'}
          </li>
          <li>{hi ? 'भाव आज के हैं और बदल सकते हैं।' : 'Prices are today’s and can change.'}</li>
        </ul>
      </details>

      <p className="mt-3 text-body3 text-ink-muted">
        {hi
          ? 'यह सिर्फ़ अंदाज़ा है। ऑर्डर करने से पहले अपने इंजीनियर या ठेकेदार से जांच लें।'
          : 'Estimate only. Check with your engineer or contractor before ordering.'}
      </p>

      {/* A phone's reach: the total and the action, always under the thumb. */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex h-[var(--buy-bar-h)] items-center gap-3 border-t border-hairline bg-surface px-3 shadow-sheet lg:hidden print:hidden">
        <div className="min-w-0 flex-1">
          <p className="text-body4 text-ink-muted">{hi ? 'कुल' : 'Total'}</p>
          <p className="tabular truncate text-heading4 text-ink">{formatINR(estimate.grandTotal)}</p>
        </div>
        <Button
          type="button"
          variant="buy"
          onClick={addToCart}
          disabled={adding || repricing || priced.length === 0}
        >
          {adding && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {hi ? 'कार्ट में जोड़ें' : 'Add to cart'}
        </Button>
      </div>

      {asking && (
        <RateRequest
          locale={locale}
          jobs={jobs}
          selections={selections}
          customer={customer}
          onClose={() => setAsking(false)}
        />
      )}
    </section>
  );
}
