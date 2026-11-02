import type { Metadata } from 'next';
import Link from 'next/link';
import {
  decodeQuoteJobs,
  describeQuoteJob,
  encodeQuoteJobs,
  MAX_QUOTE_JOBS,
  QUOTE_JOB_KINDS,
  type QuoteJob,
  type QuoteJobKind,
} from '@StrikerStore/contract';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { JobForm } from '@/components/quote/job-form';
import { JobPicker } from '@/components/quote/job-picker';
import { QuoteResults } from '@/components/quote/quote-results';
import { api } from '@/lib/api/server';
import { currentLocale } from '@/lib/locale';
import { currentLocation, currentPoint } from '@/lib/location';
import { currentCustomer } from '@/lib/session';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const paramOf = (value: string | string[] | undefined) =>
  typeof value === 'string' ? value : null;

/*
 * The bare page is worth finding: "how much cement do I need" is a real search.
 * A link with measurements in it is one person's job and not a page to index.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const hasParams = Object.keys(await searchParams).length > 0;
  return {
    title: 'Get a quote: construction material calculator',
    description:
      'Work out the cement, sand, aggregate, steel, bricks and tiles for a wall, plaster, RCC slab or floor, with today’s prices.',
    alternates: { canonical: '/quote' },
    ...(hasParams ? { robots: { index: false, follow: true } } : {}),
  };
}

/**
 * Get a quote.
 *
 * Its own page rather than a panel, so that every step is a URL: the back button
 * moves between steps, and a link can be sent to a contractor. The link holds
 * only measurements, and the prices are read fresh when it is opened.
 *
 *   /quote                  which job?
 *   /quote?job=WALL         its measurements
 *   /quote?jobs=<encoded>   the material list
 *
 * A link that does not decode falls back to the first of those, because there
 * is nothing useful to say about somebody else's mangled URL.
 */
export default async function QuotePage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const jobsParam = paramOf(raw.jobs);
  const jobs: QuoteJob[] = decodeQuoteJobs(jobsParam) ?? [];
  const encoded = jobs.length > 0 ? jobsParam : null;

  const editRaw = Number(paramOf(raw.edit));
  const editIndex =
    paramOf(raw.edit) !== null && Number.isInteger(editRaw) && jobs[editRaw] ? editRaw : null;

  const jobParam = paramOf(raw.job);
  const kind: QuoteJobKind | null =
    editIndex !== null
      ? jobs[editIndex]!.kind
      : QUOTE_JOB_KINDS.includes(jobParam as QuoteJobKind)
        ? (jobParam as QuoteJobKind)
        : null;

  const adding = paramOf(raw.add) !== null && jobs.length < MAX_QUOTE_JOBS;

  const [locale, location, point, customer] = await Promise.all([
    currentLocale(),
    currentLocation(),
    currentPoint(),
    currentCustomer(),
  ]);
  const hi = locale === 'hi';

  const estimate =
    jobs.length > 0
      ? await (await api()).storefront.quoteEstimate.query({
          jobs,
          ...(location ? { pincode: location.pincode } : {}),
          ...point,
        })
      : null;

  const withJobs = (next: QuoteJob[]) =>
    next.length > 0 ? `/quote?jobs=${encodeQuoteJobs(next)}` : '/quote';

  const showPicker = !kind && (jobs.length === 0 || adding);
  const editing = kind !== null;

  return (
    <div className="page-w page-x py-6">
      <h1 className="text-heading2 text-ink">{hi ? 'कोटेशन पाएं' : 'Get a quote'}</h1>
      <p className="mt-1 max-w-2xl text-body2 text-ink-muted print:hidden">
        {hi
          ? 'अपने काम का नाप डालें। हम बताएंगे कितना सीमेंट, रेत, सरिया और बाकी सामान लगेगा, आज के भाव के साथ।'
          : 'Enter your measurements. We will work out the cement, sand, steel and other materials, with today’s prices.'}
      </p>

      {showPicker && (
        <div className="mt-5">
          {adding && (
            <p className="mb-3 text-heading5 text-ink">{hi ? 'और कौन सा काम?' : 'Which job next?'}</p>
          )}
          <JobPicker locale={locale} encodedJobs={encoded} />
          {adding && encoded && (
            <Link
              href={`/quote?jobs=${encoded}`}
              className="mt-3 inline-block text-body2 text-ink-muted underline underline-offset-2"
            >
              {hi ? 'वापस सूची पर' : 'Back to the list'}
            </Link>
          )}
        </div>
      )}

      {!showPicker && (
        <div className="mt-5 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-8">
          <div className="min-w-0 space-y-4">
            {editing && kind ? (
              <JobForm
                // A fresh form for each job being edited.
                key={`${kind}-${editIndex ?? 'new'}`}
                kind={kind}
                locale={locale}
                jobs={jobs}
                editIndex={editIndex}
              />
            ) : (
              <section className="rounded-card border border-hairline bg-surface p-4">
                <h2 className="text-heading5 text-ink">{hi ? 'आपके काम' : 'Your jobs'}</h2>
                <ul className="mt-2 divide-y divide-hairline">
                  {jobs.map((job, index) => (
                    <li key={index} className="flex items-start gap-2 py-2">
                      <span className="min-w-0 flex-1 text-body2 text-ink">
                        {describeQuoteJob(job, locale)}
                      </span>
                      <Link
                        href={`/quote?jobs=${encoded}&edit=${index}`}
                        aria-label={hi ? 'बदलें' : 'Edit'}
                        className="grid size-9 shrink-0 place-items-center rounded-box text-ink-muted hover:bg-surface-muted print:hidden"
                      >
                        <Pencil className="size-4" aria-hidden />
                      </Link>
                      <Link
                        href={withJobs(jobs.filter((_, i) => i !== index))}
                        aria-label={hi ? 'हटाएं' : 'Remove'}
                        className="grid size-9 shrink-0 place-items-center rounded-box text-ink-muted hover:bg-surface-muted print:hidden"
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
                {jobs.length < MAX_QUOTE_JOBS && (
                  <Link
                    href={`/quote?jobs=${encoded}&add=1`}
                    className="mt-2 inline-flex min-h-[var(--tap)] items-center gap-2 text-cta2 text-ink underline-offset-2 hover:underline print:hidden"
                  >
                    <Plus className="size-4" aria-hidden />
                    {hi ? 'और काम जोड़ें' : 'Add another job'}
                  </Link>
                )}
              </section>
            )}
          </div>

          {/* On a phone one step per screen, so the list waits behind the form.
              A desktop has the room for both. */}
          <div className={editing ? 'hidden min-w-0 lg:block' : 'mt-4 min-w-0 lg:mt-0'}>
            {estimate && encoded ? (
              <QuoteResults
                key={encoded}
                jobs={jobs}
                initial={estimate}
                locale={locale}
                customer={customer ? { name: customer.name, phone: customer.phone } : null}
              />
            ) : (
              <p className="rounded-card border border-dashed border-hairline-strong p-6 text-body2 text-ink-muted">
                {hi
                  ? 'नाप डालने पर सामान की सूची यहां दिखेगी।'
                  : 'Your list of materials will appear here once you enter the measurements.'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
