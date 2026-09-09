'use client';

import { useMemo, useRef, useState } from 'react';
import { ChevronRight, TrendingDown } from 'lucide-react';
import { formatINR, type StorefrontVariantDto } from '@StrikerStore/contract';
import { cn } from '@/lib/cn';
import type { Locale } from '@/lib/i18n';
import { Stepper } from '@/components/catalog/stepper';
import { BulkPriceSheet } from './bulk-price-sheet';
import { SpecsTable } from './specs-table';

type Axis = { name: string; position: number; values: string[] };

/**
 * Choosing a size, grade or colour — and everything that changes with it.
 *
 * The one genuinely stateful screen on the storefront, and it is stateful for a
 * real reason: price, unit, stock and the add control all belong to the
 * *variant*, so they cannot be rendered until the shopper has picked one.
 *
 * Three decisions worth stating:
 *
 *   - **Big buttons per axis**, not a dropdown. PLAN.md §6.4 asks for it and the
 *     audience justifies it: a 48px target with "12mm" written on it beats a
 *     select whose options are hidden until tapped, especially with gloves on.
 *   - **Unsellable combinations are shown and disabled**, never hidden. A
 *     shopper looking for 20mm needs to learn the shop stocks it and is out,
 *     not that it does not exist — those are different facts and only one of
 *     them brings them back tomorrow.
 *   - **The initial selection is the cheapest sellable variant**, which is the
 *     one the card advertised. Landing on a page whose price differs from the
 *     tile that was tapped is the fastest way to lose this audience's trust.
 */
export function VariantPicker({
  options,
  variants,
  quantities,
  locale,
  productName,
  bulkUnlockCutoff,
  specs,
  hsnCode,
  description,
  suggestions,
}: {
  options: Axis[];
  variants: StorefrontVariantDto[];
  /** variantId → quantity already in the cart, resolved on the server. */
  quantities: Record<string, number>;
  locale: Locale;
  /** For the bulk sheet's subtitle — it opens over the page, not beside it. */
  productName: string;
  /** Cart subtotal at which bulk rates unlock, from the shop's settings. */
  bulkUnlockCutoff: string;
  /**
   * The specifications table, rendered here rather than by the page.
   *
   * It carries the selected variant's SKU, and only this component knows which
   * variant that is.
   */
  specs: Array<{ key: string; label: string; value: string }>;
  hsnCode: string | null;
  /**
   * The description block, rendered between the price card and the specs.
   *
   * Passed through rather than left on the page because the specs table had to
   * move in here — it carries the selected variant's SKU — and leaving the
   * description outside would have silently swapped the two on the page. The
   * order is the design: price, then what it is, then the numbers.
   */
  description?: React.ReactNode;
  /**
   * "You may also like", revealed after the first add.
   *
   * Rendered by the page and passed in as a node rather than fetched here: the
   * related products are already on the server's DTO, and a client component
   * that refetched them would spend a round trip on data it was handed.
   */
  suggestions?: React.ReactNode;
}) {
  const axisValueOf = (variant: StorefrontVariantDto, index: number) =>
    [variant.option1Value, variant.option2Value, variant.option3Value][index] ?? null;

  const initial = useMemo(() => {
    const sellable = variants.filter((variant) => variant.inStock);
    const pool = sellable.length > 0 ? sellable : variants;
    return pool.reduce<StorefrontVariantDto | undefined>(
      (cheapest, variant) =>
        !cheapest || Number(variant.price) < Number(cheapest.price) ? variant : cheapest,
      undefined,
    );
  }, [variants]);

  const [chosen, setChosen] = useState<(string | null)[]>(() =>
    options.map((_, index) => (initial ? axisValueOf(initial, index) : null)),
  );

  const [bulkOpen, setBulkOpen] = useState(false);
  const [added, setAdded] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  /**
   * Fired after a cart write lands, from either the inline stepper or the
   * sticky bar.
   *
   * Reveals the suggestions once and scrolls them into view. Once, because a
   * shopper adjusting the quantity from four to five has not asked to be shown
   * the shelf again — and a page that scrolls itself on every tap of `+` is a
   * page that fights the person using it.
   */
  function reveal() {
    if (added) return;
    setAdded(true);
    // After paint: the block does not exist to scroll to until React has
    // rendered it.
    requestAnimationFrame(() =>
      suggestionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    );
  }

  const selected = useMemo(
    () =>
      variants.find((variant) =>
        options.every((_, index) => axisValueOf(variant, index) === chosen[index]),
      ) ?? null,
    [variants, options, chosen],
  );

  /**
   * Whether any variant exists and is sellable for a value on one axis, given
   * what is chosen on the *other* axes.
   *
   * Scoped that way so a two-axis product behaves: with Size 4L picked, the
   * colour list greys out only the colours unavailable in 4L, rather than every
   * colour that is out in some other size.
   */
  function stateOf(axisIndex: number, value: string): 'sellable' | 'out' | 'missing' {
    const matches = variants.filter(
      (variant) =>
        axisValueOf(variant, axisIndex) === value &&
        options.every(
          (_, index) =>
            index === axisIndex ||
            chosen[index] === null ||
            axisValueOf(variant, index) === chosen[index],
        ),
    );
    if (matches.length === 0) return 'missing';
    return matches.some((variant) => variant.inStock) ? 'sellable' : 'out';
  }

  const unit = selected
    ? (locale === 'hi' && selected.unitLabelHi) || selected.unitLabelEn
    : null;
  const showCompare =
    selected?.compareAtPrice && Number(selected.compareAtPrice) > Number(selected.price);

  const lowStock =
    selected?.inStock === true && selected.stockQty !== null && selected.stockQty <= 10;
  /**
   * What the card still carries on a phone once price, ADD and the SKU have all
   * moved out — the bulk offer and the low-stock nudge, and nothing else.
   */
  const hasMobileDetail = Boolean(selected?.bulkPrice) || lowStock;

  return (
    <div className="space-y-5">
      {options.map((axis, axisIndex) => (
        <fieldset key={axis.name}>
          <legend className="mb-2 text-heading6 text-ink">
            {axis.name}
            {chosen[axisIndex] && (
              <span className="ml-1 text-body3 text-ink-muted">{chosen[axisIndex]}</span>
            )}
          </legend>

          <div className="flex flex-wrap gap-2">
            {axis.values.map((value) => {
              const state = stateOf(axisIndex, value);
              const active = chosen[axisIndex] === value;

              return (
                <button
                  key={value}
                  type="button"
                  // `missing` means no such combination exists at all; `out`
                  // means it exists and has no stock. Only the first is
                  // unclickable — the second is worth landing on to read.
                  disabled={state === 'missing'}
                  aria-pressed={active}
                  onClick={() =>
                    setChosen((current) =>
                      current.map((entry, index) => (index === axisIndex ? value : entry)),
                    )
                  }
                  className={cn(
                    'min-h-[var(--tap)] rounded-box border px-4 text-cta2 transition-colors',
                    active
                      ? 'border-ink bg-ink text-ink-inverted'
                      : 'border-hairline-strong bg-surface text-ink hover:border-ink',
                    state === 'out' && !active && 'text-ink-faint line-through',
                    state === 'missing' && 'cursor-not-allowed opacity-40',
                  )}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      {selected ? (
        <div
          className={cn(
            /*
             * The card's chrome is desktop-only.
             *
             * On a desktop it wraps the price, the bulk band and the add
             * button, and the border is what groups the three. On a phone the
             * price and the button have gone to the sticky bar, so the border
             * was drawing a box around a single green box — chrome with nothing
             * left to contain.
             */
            'md:rounded-card md:border md:border-hairline md:bg-surface md:p-4',
            /*
             * With the price and the add control gone to the sticky bar, this
             * card can have nothing left to say on a phone. An empty bordered
             * box reads as content that failed to load, so it is hidden unless
             * one of the extras below is actually there.
             */
            !hasMobileDetail && 'hidden md:block',
          )}
        >
          {/*
            * Desktop only. On a phone the price and the add control live in the
            * sticky bar at the bottom of the screen and nowhere else — showing
            * them twice on one short screen is the same decision offered twice,
            * and the copy that scrolls away is the one that gets tapped least.
            */}
          <div className="hidden flex-wrap items-baseline gap-x-2 md:flex">
            <span className="text-heading2 text-ink">{formatINR(selected.price)}</span>
            {unit && <span className="text-body2 text-ink-muted">{unit}</span>}
            {showCompare && selected.compareAtPrice && (
              <span className="text-body2 text-ink-faint line-through">
                {formatINR(selected.compareAtPrice)}
              </span>
            )}
          </div>

          {/*
            * The bulk offer, as a banded row rather than a text link.
            *
            * It is the strongest commercial argument on the page for this
            * shop's actual customer — a contractor buying forty bags, not a
            * homeowner buying one — and as an underlined sentence it read as a
            * footnote. The tint and the full-width band give it the weight of
            * an offer while staying clearly secondary to the price above it.
            *
            * Still tappable, because "bulk price ₹415" raises a question the
            * row itself cannot answer: how many, and by when.
            */}
          {selected.bulkPrice && (
            <button
              type="button"
              onClick={() => setBulkOpen(true)}
              className="mt-3 flex w-full items-center gap-2 rounded-box border border-success/25 bg-success-bg px-3 py-2.5 text-left"
            >
              <TrendingDown className="size-5 shrink-0 text-success-fg" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-heading6 text-success-fg">
                  {locale === 'hi'
                    ? `बल्क भाव ${formatINR(selected.bulkPrice)}`
                    : `Bulk price ${formatINR(selected.bulkPrice)}`}
                </span>
                <span className="block text-body5 text-success-fg/80">
                  {locale === 'hi' ? 'बड़े ऑर्डर पर — कैसे?' : 'On large orders — see how'}
                </span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-success-fg" aria-hidden />
            </button>
          )}

          {/* Only when it is genuinely low. A count on every variant trains
              people to ignore it, and then it cannot do its one job. */}
          {lowStock && (
            <p className="mt-1 text-body3 text-warning">
              {locale === 'hi'
                ? `सिर्फ़ ${selected.stockQty} बचे`
                : `Only ${selected.stockQty} left`}
            </p>
          )}

          <div className="mt-4 hidden md:block">
            {selected.inStock ? (
              <Stepper
                variantId={selected.id}
                quantity={quantities[selected.id] ?? 0}
                locale={locale}
                size="lg"
                label={locale === 'hi' ? 'कार्ट में डालें' : 'Add to cart'}
                onChanged={reveal}
              />
            ) : (
              <p className="rounded-box bg-surface-muted py-3 text-center text-cta2 text-ink-muted">
                {locale === 'hi' ? 'यह साइज़ अभी नहीं है' : 'This option is out of stock'}
              </p>
            )}
          </div>
        </div>
      ) : (
        <p className="rounded-card border border-hairline bg-surface p-4 text-body2 text-ink-muted">
          {locale === 'hi'
            ? 'ऊपर से एक विकल्प चुनें।'
            : 'Choose an option above to see the price.'}
        </p>
      )}

      {description}

      <SpecsTable specs={specs} hsnCode={hsnCode} sku={selected?.sku ?? null} locale={locale} />

      {selected?.bulkPrice && (
        <BulkPriceSheet
          open={bulkOpen}
          onClose={() => setBulkOpen(false)}
          productName={productName}
          listPrice={selected.price}
          bulkPrice={selected.bulkPrice}
          unlockCutoff={bulkUnlockCutoff}
          unit={unit}
          locale={locale}
        />
      )}

      {/*
        * "You may also like", after the first add.
        *
        * Hidden until then on purpose. Before the add, the shopper is deciding
        * about *this* product and a shelf of alternatives is an argument
        * against the decision they are making; after it, the same shelf is the
        * next thing they need. It is also where the eye already is, because the
        * add they just made was at the bottom of the screen.
        */}
      {added && suggestions && (
        <div ref={suggestionsRef} className="scroll-mt-20 pt-2">
          {suggestions}
        </div>
      )}

      {/*
        * The sticky buy bar — phones only.
        *
        * The price and the add control follow the shopper down a long product
        * page, which is the quick-commerce pattern and the reason this screen
        * converts on a phone at all: the description, the specs and the FAQs
        * are all worth reading, and every one of them pushes the ADD button off
        * the screen.
        *
        * It duplicates the price shown in the card above rather than replacing
        * it. That is the reference behaviour and it is right — the card's price
        * belongs beside the variant buttons that change it.
        *
        * `CartBar` is suppressed on product routes so the two fixed bars cannot
        * stack; the header keeps a cart icon, so the way to the cart is not
        * lost.
        */}
      {selected && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-surface p-3 shadow-sheet md:hidden">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              {unit && <p className="truncate text-body3 text-ink-muted">{unit}</p>}
              <p className="flex items-baseline gap-1.5">
                <span className="text-heading3 text-ink">{formatINR(selected.price)}</span>
                {showCompare && selected.compareAtPrice && (
                  <span className="text-body3 text-ink-faint line-through">
                    {formatINR(selected.compareAtPrice)}
                  </span>
                )}
              </p>
              <p className="text-body5 text-ink-faint">
                {locale === 'hi' ? 'सभी टैक्स सहित' : 'Inclusive of all taxes'}
              </p>
            </div>

            {/*
              * A fixed width, not `shrink-0` around a `w-full` button.
              *
              * `size="lg"` makes the stepper fill its parent, and a
              * shrink-to-fit parent collapsed it to a stub — which is why the
              * button read as a small faded box rather than the primary action
              * on the screen.
              */}
            <div className="w-[150px] shrink-0">
              {selected.inStock ? (
                <Stepper
                  variantId={selected.id}
                  quantity={quantities[selected.id] ?? 0}
                  locale={locale}
                  size="lg"
                  label={locale === 'hi' ? 'कार्ट में डालें' : 'Add to cart'}
                  onChanged={reveal}
                />
              ) : (
                <span className="inline-flex h-[52px] w-full items-center justify-center rounded-box bg-surface-muted text-cta2 text-ink-muted">
                  {locale === 'hi' ? 'स्टॉक ख़त्म' : 'Out of stock'}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
