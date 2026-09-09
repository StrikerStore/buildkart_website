import { Check } from 'lucide-react';
import type { Locale } from '@/lib/i18n';

/**
 * "Rate updated today ✓" — PLAN.md §2's trust signal for volatile lines.
 *
 * Cement and sariya move daily, and the owner's whole morning routine is the
 * Today's Rates screen. This stamp is what that routine buys: it tells a
 * contractor the number on screen is this morning's, not last week's, which is
 * the single thing that makes an online materials price believable.
 *
 * It renders *only* when the price really was touched today. A stamp that says
 * "today" every day regardless would be worth less than no stamp at all, so the
 * component says nothing when the date does not support it.
 */
export function RateStamp({ updatedAt, locale }: { updatedAt: string; locale: Locale }) {
  const updated = new Date(updatedAt);
  if (Number.isNaN(updated.getTime())) return null;

  const now = new Date();
  const sameDay =
    updated.getFullYear() === now.getFullYear() &&
    updated.getMonth() === now.getMonth() &&
    updated.getDate() === now.getDate();

  if (!sameDay) return null;

  return (
    <p className="mt-0.5 flex items-center gap-1 text-body6 text-success">
      <Check className="size-3" aria-hidden />
      {locale === 'hi' ? 'आज का भाव' : 'Rate updated today'}
    </p>
  );
}
