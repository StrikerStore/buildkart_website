import { Check, TrendingDown } from 'lucide-react';
import { formatINR, type BulkNudgeDto } from '@buildkart/contract';
import type { Locale } from '@/lib/i18n';

/**
 * The bulk-price nudge — PLAN.md §6.6.
 *
 * This is the storefront's one piece of deliberate persuasion, and it earns its
 * place by being true: the server only sends a nudge when the cart really holds
 * something with a bulk rate and crossing the cutoff really saves that amount.
 * Every number below is computed from the catalogue, not written here.
 *
 * Two states, and the unlocked one matters as much as the other. Telling
 * someone they *have* saved ₹411 is what makes the next order's nudge
 * believable.
 */
export function BulkProgress({ bulk, locale }: { bulk: BulkNudgeDto; locale: Locale }) {
  if (bulk.unlocked) {
    return (
      <div className="rounded-card border border-success/20 bg-success-bg p-3">
        <p className="flex items-center gap-2 text-heading6 text-success">
          <Check className="size-4 shrink-0" aria-hidden />
          {locale === 'hi'
            ? `बल्क भाव लग गया — ${formatINR(bulk.saving)} बचे`
            : `Bulk prices unlocked — you saved ${formatINR(bulk.saving)}`}
        </p>
      </div>
    );
  }

  const progress = Number(bulk.progress);
  const cutoff = Number(bulk.cutoff);
  const percent = cutoff > 0 ? Math.min(100, Math.round((progress / cutoff) * 100)) : 0;

  return (
    <div className="rounded-card border border-hairline bg-brand-tint p-3">
      <p className="flex items-center gap-2 text-heading6 text-ink">
        <TrendingDown className="size-4 shrink-0 text-brand-text" aria-hidden />
        {locale === 'hi'
          ? `${formatINR(bulk.remaining)} और जोड़ें — ${formatINR(bulk.saving)} बचाएँ`
          : `Add ${formatINR(bulk.remaining)} more to unlock bulk prices — save ${formatINR(bulk.saving)}`}
      </p>

      {/*
        * A real progress bar with the ARIA roles, not a decorative div: a
        * screen reader should hear "62 percent toward bulk prices" rather than
        * nothing at all, since the visual bar is half the message.
        */}
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={locale === 'hi' ? 'बल्क भाव की प्रगति' : 'Progress toward bulk prices'}
        className="mt-2 h-2 overflow-hidden rounded-pill bg-surface"
      >
        <div className="h-full rounded-pill bg-brand" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
