import { Gift } from 'lucide-react';
import { formatINR, type WalletRulesDto } from '@StrikerStore/contract';
import type { Locale } from '@/lib/i18n';

/**
 * "Assured 2% Cashback — on purchases above ₹50,000", under the price.
 *
 * The brand tint rather than a green success band: this is an offer about
 * price, and yellow marks price on this storefront (see globals.css). The
 * tint is the token that exists for exactly this — "the wash behind a badge
 * or an offer strip" — never solid yellow.
 *
 * Renders nothing when cashback is off or has no slabs, so the owner switching
 * it off in the admin takes it off every product page at once.
 */
export function CashbackOffer({ rules, locale }: { rules: WalletRulesDto; locale: Locale }) {
  if (!rules.enabled || !rules.cashback.enabled) return null;
  const slabs = rules.cashback.slabs.filter((slab) => slab.percent > 0);
  if (slabs.length === 0) return null;

  const hi = locale === 'hi';
  const top = slabs.reduce((best, slab) => (slab.percent > best.percent ? slab : best), slabs[0]!);
  const only = slabs.length === 1;

  const title = hi
    ? `${only ? '' : 'अधिकतम '}${top.percent}% कैशबैक पक्का`
    : `Assured ${only ? '' : 'up to '}${top.percent}% Cashback`;

  const detail = only
    ? hi
      ? `${formatINR(top.minOrderValue)} से ऊपर की खरीद पर`
      : `On purchases above ${formatINR(top.minOrderValue)}`
    : slabs
        .map((slab) =>
          hi
            ? `${formatINR(slab.minOrderValue)} से ऊपर ${slab.percent}%`
            : `${slab.percent}% above ${formatINR(slab.minOrderValue)}`,
        )
        .join(' · ');

  return (
    <div className="flex items-center gap-3 rounded-box border-l-4 border-brand bg-gradient-to-r from-brand-tint to-transparent px-3 py-2.5">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink text-brand">
        <Gift className="size-4" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-heading6 text-ink">{title}</span>
        <span className="block text-body5 text-ink-muted">
          {detail}
          {' · '}
          {hi ? 'वॉलेट में मिलेगा' : 'credited to your wallet'}
        </span>
      </span>
    </div>
  );
}
