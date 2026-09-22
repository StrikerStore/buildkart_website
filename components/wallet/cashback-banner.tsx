import { formatINR, type CartDto } from '@StrikerStore/contract';
import { cn } from '@/lib/cn';
import type { Locale } from '@/lib/i18n';

/**
 * "Congrats — you'll earn ₹4 cashback on this order", above the cart lines.
 *
 * The figure is what the server priced (`CartDto.cashback`), never worked out
 * here, so the banner, the per-line pills and the order that gets written all
 * come from the same function.
 *
 * "You'll earn", not "you've earned": nothing lands until the order is
 * delivered and the hold has passed, and a banner that says otherwise is the
 * first thing a customer quotes back when they call asking where it is.
 *
 * Below the first slab it turns into the nudge instead — "add ₹X more to earn
 * 1%" — and says nothing at all when cashback is off.
 */
export function CashbackBanner({
  cart,
  locale,
  className,
}: {
  cart: Pick<CartDto, 'cashback' | 'cashbackNext'>;
  locale: Locale;
  className?: string;
}) {
  const hi = locale === 'hi';
  const { cashback, cashbackNext: next } = cart;

  if (cashback) {
    const hours = cashback.holdHours;
    return (
      <div className={cn('rounded-card bg-buy px-4 py-4 text-center text-buy-foreground', className)}>
        <p className="text-heading3">{hi ? 'बधाई हो!' : 'Congrats'}</p>
        <p className="mt-1 text-body3">
          {hi ? 'इस ऑर्डर पर ' : "You'll earn "}
          <span className="text-heading4 text-brand">{formatINR(cashback.amount)}</span>
          {hi ? ' कैशबैक मिलेगा' : ' cashback on this order'}
        </p>
        <p className="mt-1 text-body5 opacity-90">
          {hi
            ? `डिलीवरी के ${hours > 0 ? `${hours} घंटे ` : ''}बाद वॉलेट में`
            : `Added to your wallet ${hours > 0 ? `${hours} hours ` : ''}after delivery`}
          {next &&
            (hi
              ? ` · ${formatINR(next.shortfall)} और जोड़ें, ${next.percent}% पाएं`
              : ` · Add ${formatINR(next.shortfall)} more to earn ${next.percent}%`)}
        </p>
      </div>
    );
  }

  if (next) {
    return (
      <p
        className={cn(
          'rounded-box bg-brand-tint px-3 py-2 text-center text-heading7 text-brand-text',
          className,
        )}
      >
        {hi
          ? `${formatINR(next.shortfall)} और जोड़ें और ${next.percent}% कैशबैक पाएं`
          : `Add ${formatINR(next.shortfall)} more to earn ${next.percent}% cashback`}
      </p>
    );
  }

  return null;
}
