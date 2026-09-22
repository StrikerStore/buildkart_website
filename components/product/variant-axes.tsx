'use client';

import { useMemo, useState } from 'react';
import type { StorefrontVariantDto } from '@StrikerStore/contract';
import { cn } from '@/lib/cn';

export type Axis = { name: string; position: number; values: string[] };

export type VariantSelection = {
  chosen: (string | null)[];
  choose: (axisIndex: number, value: string) => void;
  selected: StorefrontVariantDto | null;
  stateOf: (axisIndex: number, value: string) => 'sellable' | 'out' | 'missing';
};

const axisValueOf = (variant: StorefrontVariantDto, index: number) =>
  [variant.option1Value, variant.option2Value, variant.option3Value][index] ?? null;

/**
 * Which variant the shopper has picked, and what each remaining choice leads to.
 *
 * Shared by the product page and the card's quick-options sheet, so the two
 * cannot disagree about which size is sellable or which one opens selected.
 *
 * **The initial selection is the cheapest sellable variant**, which is the one
 * the card advertised. Landing on a price that differs from the tile that was
 * tapped is the fastest way to lose this audience's trust.
 */
export function useVariantSelection(
  options: Axis[],
  variants: StorefrontVariantDto[],
): VariantSelection {
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

  const selected = useMemo(
    () =>
      variants.find((variant) =>
        options.every((_, index) => axisValueOf(variant, index) === chosen[index]),
      ) ?? null,
    [variants, options, chosen],
  );

  function choose(axisIndex: number, value: string) {
    setChosen((current) => current.map((entry, index) => (index === axisIndex ? value : entry)));
  }

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

  return { chosen, choose, selected, stateOf };
}

/**
 * One row of big buttons per axis.
 *
 * Big buttons, not a dropdown: PLAN.md §6.4 asks for it and the audience
 * justifies it — a 48px target with "12mm" written on it beats a select whose
 * options are hidden until tapped, especially with gloves on.
 *
 * **Unsellable combinations are shown and disabled**, never hidden. A shopper
 * looking for 20mm needs to learn the shop stocks it and is out, not that it
 * does not exist — those are different facts and only one of them brings them
 * back tomorrow.
 */
export function VariantAxes({
  options,
  selection,
}: {
  options: Axis[];
  selection: VariantSelection;
}) {
  const { chosen, choose, stateOf } = selection;

  return (
    <>
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
                  onClick={() => choose(axisIndex, value)}
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
    </>
  );
}
