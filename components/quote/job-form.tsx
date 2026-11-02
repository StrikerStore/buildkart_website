'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import {
  encodeQuoteJobs,
  MASONRY_UNIT_KEYS,
  MASONRY_UNITS,
  PLASTER_MIXES,
  PLASTER_THICKNESSES_MM,
  QUOTE_JOB_LABELS,
  quoteJobSchema,
  RCC_ELEMENT_LABELS,
  RCC_ELEMENTS,
  RCC_GRADE_KEYS,
  TILE_BED_LABELS,
  TILE_BEDS,
  TILE_SIZES,
  WALL_MIXES,
  WALL_THICKNESS_LABELS,
  type MasonryUnit,
  type QuoteJob,
  type QuoteJobKind,
  type QuoteLengthUnit,
  type RccElement,
  type WallThicknessMm,
} from '@StrikerStore/contract';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import type { Locale } from '@/lib/i18n';

const INPUT =
  'mt-1 h-[var(--tap)] w-full rounded-box border border-hairline-strong bg-surface px-3 text-body1 text-ink focus:border-ink focus:outline-none';

/** Every value as typed, until it is validated on the way out. */
type Draft = Record<string, string>;

function defaultsFor(kind: QuoteJobKind): Draft {
  if (kind === 'WALL') {
    return {
      length: '',
      height: '',
      openings: '',
      masonry: 'BRICK_STANDARD',
      thicknessMm: '230',
      mix: '1:6',
    };
  }
  if (kind === 'PLASTER') return { area: '', thicknessMm: '12', mix: '1:4' };
  if (kind === 'RCC') {
    return { element: 'SLAB', span: '', width: '', depth: '', count: '1', grade: 'M20' };
  }
  return { area: '', tileSize: '24x24', bed: 'ADHESIVE' };
}

function draftOf(job: QuoteJob): Draft {
  const { kind: _kind, unit: _unit, ...rest } = job;
  return Object.fromEntries(Object.entries(rest).map(([key, value]) => [key, String(value)]));
}

function Field({
  name,
  label,
  hint,
  error,
  value,
  onChange,
}: {
  name: string;
  label: string;
  hint?: string;
  error?: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div>
      <label htmlFor={`job-${name}`} className="block text-body3 text-ink-muted">
        {label}
      </label>
      <input
        id={`job-${name}`}
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/[^0-9.]/g, ''))}
        inputMode="decimal"
        autoComplete="off"
        aria-invalid={Boolean(error)}
        className={INPUT}
      />
      {hint && !error && <p className="mt-0.5 text-body5 text-ink-faint">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1 text-body3 text-error">
          {error}
        </p>
      )}
    </div>
  );
}

function Choice({
  name,
  label,
  value,
  onChange,
  options,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div>
      <label htmlFor={`job-${name}`} className="block text-body3 text-ink-muted">
        {label}
      </label>
      <select
        id={`job-${name}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={INPUT}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Two or three choices, side by side: quicker than a dropdown with gloves on. */
function Segments({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <fieldset>
      <legend className="block text-body3 text-ink-muted">{label}</legend>
      <div className="mt-1 flex gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              'min-h-[var(--tap)] flex-1 rounded-box border px-3 text-cta2',
              value === option.value
                ? 'border-ink bg-ink text-ink-inverted'
                : 'border-hairline-strong bg-surface text-ink hover:border-ink',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * The measurements for one job.
 *
 * Validated with the same schema the API uses, so a size this accepts is one the
 * API accepts. Submitting pushes a new URL: the list is rendered from the link,
 * so what a customer sees is exactly what they can send to someone else.
 */
export function JobForm({
  kind,
  locale,
  jobs,
  editIndex,
}: {
  kind: QuoteJobKind;
  locale: Locale;
  jobs: QuoteJob[];
  editIndex: number | null;
}) {
  const hi = locale === 'hi';
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const existing = editIndex !== null ? jobs[editIndex] : undefined;

  const [unit, setUnit] = useState<QuoteLengthUnit>(existing?.unit ?? 'FT');
  const [draft, setDraft] = useState<Draft>(() => (existing ? draftOf(existing) : defaultsFor(kind)));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: string) => (value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const { [key]: _gone, ...rest } = current;
      return rest;
    });
  };

  const long = unit === 'FT' ? (hi ? 'फ़ुट' : 'ft') : hi ? 'मीटर' : 'm';
  const short = unit === 'FT' ? (hi ? 'इंच' : 'in') : hi ? 'मिमी' : 'mm';
  const area = unit === 'FT' ? (hi ? 'वर्ग फ़ुट' : 'sq ft') : hi ? 'वर्ग मीटर' : 'sq m';
  const backHref =
    jobs.length > 0 ? `/quote?jobs=${encodeQuoteJobs(jobs)}` : '/quote';

  function changeMasonry(next: string) {
    const allowed: readonly number[] = MASONRY_UNITS[next as MasonryUnit].thicknesses;
    setDraft((current) => ({
      ...current,
      masonry: next,
      // The old thickness may not exist for this brick or block.
      thicknessMm: allowed.includes(Number(current.thicknessMm))
        ? (current.thicknessMm ?? String(allowed[0]))
        : String(allowed[allowed.length - 1]),
    }));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();

    const parsed = quoteJobSchema.safeParse({
      kind,
      unit,
      ...draft,
      // Blank means none, on the two fields where that is the common answer.
      ...(draft.openings === '' ? { openings: 0 } : {}),
      ...(draft.count === '' ? { count: 1 } : {}),
    });

    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'form');
        next[key] ??= hi ? 'सही नाप डालें' : issue.message;
      }
      setErrors(next);
      return;
    }

    const nextJobs =
      editIndex !== null
        ? jobs.map((job, index) => (index === editIndex ? parsed.data : job))
        : [...jobs, parsed.data];

    startTransition(() => router.push(`/quote?jobs=${encodeQuoteJobs(nextJobs)}`));
  }

  const element = (draft.element ?? 'SLAB') as RccElement;
  const masonry = (draft.masonry ?? 'BRICK_STANDARD') as MasonryUnit;

  return (
    <form
      onSubmit={submit}
      noValidate
      className="space-y-4 rounded-card border border-hairline bg-surface p-4"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-heading4 text-ink">{QUOTE_JOB_LABELS[kind][locale]}</h2>
        <Link
          href={existing || jobs.length > 0 ? backHref : '/quote'}
          className="shrink-0 text-body3 text-ink-muted underline underline-offset-2"
        >
          {hi ? 'रद्द करें' : 'Cancel'}
        </Link>
      </div>

      <Segments
        label={hi ? 'नाप की इकाई' : 'Measure in'}
        value={unit}
        onChange={(next) => setUnit(next as QuoteLengthUnit)}
        options={[
          { value: 'FT', label: hi ? 'फ़ुट और इंच' : 'Feet and inches' },
          { value: 'M', label: hi ? 'मीटर और मिमी' : 'Metres and mm' },
        ]}
      />

      {kind === 'WALL' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field
              name="length"
              label={`${hi ? 'लंबाई' : 'Length'} (${long})`}
              value={draft.length ?? ''}
              onChange={set('length')}
              error={errors.length}
            />
            <Field
              name="height"
              label={`${hi ? 'ऊंचाई' : 'Height'} (${long})`}
              value={draft.height ?? ''}
              onChange={set('height')}
              error={errors.height}
            />
          </div>
          <Field
            name="openings"
            label={`${hi ? 'दरवाज़े और खिड़कियां' : 'Doors and windows'} (${area})`}
            hint={hi ? 'नहीं हैं तो खाली छोड़ दें' : 'Leave blank if there are none'}
            value={draft.openings ?? ''}
            onChange={set('openings')}
            error={errors.openings}
          />
          <Choice
            name="masonry"
            label={hi ? 'ईंट या ब्लॉक' : 'Brick or block'}
            value={masonry}
            onChange={changeMasonry}
            options={MASONRY_UNIT_KEYS.map((key) => ({
              value: key,
              label: MASONRY_UNITS[key].label[locale],
            }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Choice
              name="thicknessMm"
              label={hi ? 'दीवार की मोटाई' : 'Wall thickness'}
              value={draft.thicknessMm ?? ''}
              onChange={set('thicknessMm')}
              options={MASONRY_UNITS[masonry].thicknesses.map((mm) => ({
                value: String(mm),
                label: WALL_THICKNESS_LABELS[mm as WallThicknessMm][locale],
              }))}
            />
            <Choice
              name="mix"
              label={hi ? 'मसाला (सीमेंट:रेत)' : 'Mortar (cement:sand)'}
              value={draft.mix ?? ''}
              onChange={set('mix')}
              options={WALL_MIXES.map((mix) => ({ value: mix, label: mix }))}
            />
          </div>
        </>
      )}

      {kind === 'PLASTER' && (
        <>
          <Field
            name="area"
            label={`${hi ? 'क्षेत्रफल' : 'Area'} (${area})`}
            hint={hi ? 'लंबाई × ऊंचाई, सभी दीवारों का जोड़' : 'Length × height, added up for every wall'}
            value={draft.area ?? ''}
            onChange={set('area')}
            error={errors.area}
          />
          <div className="grid grid-cols-2 gap-3">
            <Choice
              name="thicknessMm"
              label={hi ? 'मोटाई' : 'Thickness'}
              value={draft.thicknessMm ?? ''}
              onChange={set('thicknessMm')}
              options={PLASTER_THICKNESSES_MM.map((mm) => ({
                value: String(mm),
                label: `${mm} ${hi ? 'मिमी' : 'mm'}`,
              }))}
            />
            <Choice
              name="mix"
              label={hi ? 'मसाला (सीमेंट:रेत)' : 'Mix (cement:sand)'}
              value={draft.mix ?? ''}
              onChange={set('mix')}
              options={PLASTER_MIXES.map((mix) => ({ value: mix, label: mix }))}
            />
          </div>
        </>
      )}

      {kind === 'RCC' && (
        <>
          <Segments
            label={hi ? 'क्या बना रहे हैं' : 'What are you casting?'}
            value={element}
            onChange={set('element')}
            options={RCC_ELEMENTS.map((value) => ({
              value,
              label: RCC_ELEMENT_LABELS[value][locale],
            }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Field
              name="span"
              label={`${
                element === 'COLUMN' ? (hi ? 'ऊंचाई' : 'Height') : hi ? 'लंबाई' : 'Length'
              } (${long})`}
              value={draft.span ?? ''}
              onChange={set('span')}
              error={errors.span}
            />
            <Field
              name="width"
              label={`${hi ? 'चौड़ाई' : 'Width'} (${element === 'SLAB' ? long : short})`}
              value={draft.width ?? ''}
              onChange={set('width')}
              error={errors.width}
            />
            <Field
              name="depth"
              label={`${
                element === 'SLAB' ? (hi ? 'मोटाई' : 'Thickness') : hi ? 'गहराई' : 'Depth'
              } (${short})`}
              value={draft.depth ?? ''}
              onChange={set('depth')}
              error={errors.depth}
            />
            <Field
              name="count"
              label={hi ? 'कितने' : 'How many'}
              value={draft.count ?? ''}
              onChange={set('count')}
              error={errors.count}
            />
          </div>
          <Choice
            name="grade"
            label={hi ? 'कंक्रीट ग्रेड' : 'Concrete grade'}
            value={draft.grade ?? ''}
            onChange={set('grade')}
            options={RCC_GRADE_KEYS.map((grade) => ({ value: grade, label: grade }))}
          />
        </>
      )}

      {kind === 'TILING' && (
        <>
          <Field
            name="area"
            label={`${hi ? 'फ़र्श का क्षेत्रफल' : 'Floor area'} (${area})`}
            value={draft.area ?? ''}
            onChange={set('area')}
            error={errors.area}
          />
          <div className="grid grid-cols-2 gap-3">
            <Choice
              name="tileSize"
              label={hi ? 'टाइल का आकार (इंच)' : 'Tile size (inches)'}
              value={draft.tileSize ?? ''}
              onChange={set('tileSize')}
              options={TILE_SIZES.map((size) => ({ value: size, label: size.replace('x', ' × ') }))}
            />
            <Choice
              name="bed"
              label={hi ? 'किस पर लगेगी' : 'Fixed with'}
              value={draft.bed ?? ''}
              onChange={set('bed')}
              options={TILE_BEDS.map((bed) => ({ value: bed, label: TILE_BED_LABELS[bed][locale] }))}
            />
          </div>
        </>
      )}

      {errors.form && (
        <p role="alert" className="text-body3 text-error">
          {errors.form}
        </p>
      )}

      <Button type="submit" variant="solid" block disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {editIndex !== null
          ? hi
            ? 'बदलाव सहेजें'
            : 'Save changes'
          : hi
            ? 'सामान का हिसाब लगाएं'
            : 'Work out materials'}
      </Button>
    </form>
  );
}
