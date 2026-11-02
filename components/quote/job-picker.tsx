import Link from 'next/link';
import { BrickWall, Building2, ChevronRight, Grid2x2, PaintRoller, type LucideIcon } from 'lucide-react';
import { QUOTE_JOB_KINDS, QUOTE_JOB_LABELS, type QuoteJobKind } from '@StrikerStore/contract';
import type { Locale } from '@/lib/i18n';

const ICONS: Record<QuoteJobKind, LucideIcon> = {
  WALL: BrickWall,
  PLASTER: PaintRoller,
  RCC: Building2,
  TILING: Grid2x2,
};

const DETAILS: Record<QuoteJobKind, { en: string; hi: string }> = {
  WALL: { en: 'Bricks or blocks, cement and sand', hi: 'ईंट या ब्लॉक, सीमेंट और रेत' },
  PLASTER: { en: 'Cement and sand', hi: 'सीमेंट और रेत' },
  RCC: { en: 'Cement, sand, aggregate and steel', hi: 'सीमेंट, रेत, गिट्टी और सरिया' },
  TILING: { en: 'Tiles, and adhesive or cement and sand', hi: 'टाइल, और एडहेसिव या सीमेंट और रेत' },
};

/** Which job? Links, so the back button returns here from the measurements. */
export function JobPicker({ locale, encodedJobs }: { locale: Locale; encodedJobs: string | null }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {QUOTE_JOB_KINDS.map((kind) => {
        const Icon = ICONS[kind];
        return (
          <li key={kind}>
            <Link
              href={`/quote?job=${kind}${encodedJobs ? `&jobs=${encodedJobs}` : ''}`}
              className="flex min-h-[72px] items-center gap-3 rounded-card border border-hairline-strong bg-surface p-4 hover:border-ink"
            >
              <Icon className="size-6 shrink-0 text-ink-muted" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-heading5 text-ink">{QUOTE_JOB_LABELS[kind][locale]}</span>
                <span className="block text-body3 text-ink-muted">{DETAILS[kind][locale]}</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-ink-faint" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
