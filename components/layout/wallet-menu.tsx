'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Clock,
  Gift,
  IndianRupee,
  ShieldCheck,
  Truck,
  User,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { formatINR, type WalletRulesDto } from '@StrikerStore/contract';
import { buttonClass } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import type { Locale } from '@/lib/i18n';

type Summary = {
  balance: string;
  pendingCashback: string;
  expiringSoon: { amount: string; expiresAt: string } | null;
};

/**
 * The wallet in the header: a green pill, and a panel explaining it.
 *
 * Green because it is money the customer holds — the same green as every
 * control that spends money here — and a pill rather than a bare icon so it
 * reads as a balance, not a menu.
 *
 * The panel opens on **hover** where there is a mouse and on **tap** where
 * there is not. On a desktop the pill is still a link, so clicking it goes
 * straight to the wallet page; on a phone the first tap has to open the panel,
 * because there is no hover to have shown it.
 *
 * Every figure in the panel comes from the owner's wallet rules, so the admin
 * changing a slab changes this panel with nothing else to edit.
 *
 * Two placements, one per screen size (see `site-header.tsx`): `header` sits
 * in the top row on a desktop; `bar` sits beside the search box on a phone,
 * because the phone's top row has no room for a balance without squeezing the
 * delivery pincode out of view.
 */
export function WalletMenu({
  locale,
  rules,
  summary,
  variant = 'header',
  className,
}: {
  locale: Locale;
  rules: WalletRulesDto;
  /** Null when signed out. */
  summary: Summary | null;
  variant?: 'header' | 'bar';
  className?: string;
}) {
  const hi = locale === 'hi';
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [top, setTop] = useState(0);
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLAnchorElement>(null);
  const canHover = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    canHover.current = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  }, []);

  const show = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    // Placed under the pill wherever the header happens to be — the
    // announcement bar above it may or may not have scrolled away.
    const rect = trigger.current?.getBoundingClientRect();
    if (rect) setTop(rect.bottom);
    setOpen(true);
  }, []);

  const hide = useCallback(() => setOpen(false), []);

  // Closed by navigation, Escape, a tap elsewhere, or the page scrolling away
  // from where it was anchored.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && hide();
    const onPointer = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) hide();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
    window.addEventListener('scroll', hide, { passive: true });
    window.addEventListener('resize', hide);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('scroll', hide);
      window.removeEventListener('resize', hide);
    };
  }, [open, hide]);

  const signedIn = summary !== null;

  return (
    <div
      ref={wrapper}
      className={cn('relative', className)}
      onMouseEnter={() => canHover.current && show()}
      onMouseLeave={() => {
        if (!canHover.current) return;
        // A beat of grace, so crossing the gap into the panel does not close it.
        closeTimer.current = setTimeout(hide, 120);
      }}
    >
      <Link
        ref={trigger}
        href="/wallet"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={
          signedIn
            ? `${hi ? 'वॉलेट' : 'Wallet'} ${formatINR(summary.balance)}`
            : hi
              ? 'वॉलेट'
              : 'Wallet'
        }
        onClick={(event) => {
          if (canHover.current) return; // a mouse: the pill is a link
          event.preventDefault();
          if (open) hide();
          else show();
        }}
        className={cn(
          'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill text-cta2 text-white',
          // Level with the search box beside it on a phone; a full tap target.
          variant === 'bar' ? 'h-[var(--tap)] px-3' : 'h-10 px-3.5',
          'bg-gradient-to-b from-[#2f9a4a] to-buy-dark shadow-sm ring-1 ring-buy-dark/60',
          'transition hover:brightness-110',
          open && 'brightness-110',
        )}
      >
        <span className="relative grid size-6 place-items-center rounded-md bg-white/15">
          <Wallet className="size-4" aria-hidden />
          <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-brand ring-2 ring-buy-dark" />
        </span>
        {signedIn ? (
          <span className="tabular-nums">{formatINR(summary.balance)}</span>
        ) : (
          <span>{hi ? 'वॉलेट' : 'Wallet'}</span>
        )}
      </Link>

      {open && (
        <div
          role="dialog"
          aria-label={hi ? 'वॉलेट' : 'Wallet'}
          style={{ top }}
          className="fixed inset-x-3 z-50 pt-2 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full! sm:w-[380px]"
        >
          <Panel locale={locale} rules={rules} summary={summary} />
        </div>
      )}
    </div>
  );
}

function Panel({
  locale,
  rules,
  summary,
}: {
  locale: Locale;
  rules: WalletRulesDto;
  summary: Summary | null;
}) {
  const hi = locale === 'hi';
  const tiles = benefitTiles(rules, locale);
  // The welcome offer, in the owner's amount — only to somebody not signed in,
  // and only while the bonus is actually switched on.
  const bonus =
    summary === null && rules.enabled && rules.signupBonus.enabled
      ? rules.signupBonus.amount
      : null;

  return (
    <div className="overflow-hidden rounded-card border border-hairline bg-surface p-4 shadow-xl">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-heading7 text-ink">{hi ? 'BuildKart वॉलेट' : 'BuildKart Wallet'}</p>
          {summary ? (
            <>
              <p className="mt-2 text-body4 text-ink-muted">
                {hi ? 'उपलब्ध बैलेंस' : 'Available balance'}
              </p>
              <p className="text-heading2 text-ink tabular-nums">{formatINR(summary.balance)}</p>
            </>
          ) : (
            <p className="mt-2 text-heading3 text-ink">
              {hi ? 'BuildKart कैश पाएं और ज़्यादा बचाएं!' : 'Unlock BuildKart cash & save more!'}
            </p>
          )}
        </div>
        <WalletArt />
      </div>

      {summary ? (
        (summary.pendingCashback !== '0.00' || summary.expiringSoon) && (
          <div className="mt-3 space-y-1 text-body4 text-ink-muted">
            {summary.pendingCashback !== '0.00' && (
              <p className="flex items-center gap-1.5">
                <Gift className="size-4 shrink-0 text-success-fg" aria-hidden />
                {hi
                  ? `${formatINR(summary.pendingCashback)} कैशबैक आने वाला है`
                  : `${formatINR(summary.pendingCashback)} cashback on the way`}
              </p>
            )}
            {summary.expiringSoon && (
              <p className="flex items-center gap-1.5">
                <Clock className="size-4 shrink-0 text-warning-fg" aria-hidden />
                {hi
                  ? `${formatINR(summary.expiringSoon.amount)} ${shortDate(summary.expiringSoon.expiresAt, locale)} को समाप्त`
                  : `${formatINR(summary.expiringSoon.amount)} expires ${shortDate(summary.expiringSoon.expiresAt, locale)}`}
              </p>
            )}
          </div>
        )
      ) : (
        <>
          <p className="mt-2 text-body3 text-ink-muted">
            {hi
              ? 'हर ऑर्डर पर कैशबैक कमाने और अगली खरीद पर बचाने के लिए लॉगिन करें।'
              : 'Login to earn cashback on every order & save on your next purchases.'}
          </p>
          {bonus && (
            /*
             * "New customers", said plainly: the bonus is paid once, to an
             * account's first sign-in, and a returning customer promised ₹500
             * who does not get it is a complaint this line would have caused.
             */
            <p className="mt-3 flex items-center gap-2 rounded-box border border-brand/40 bg-brand-tint px-3 py-2">
              <Gift className="size-5 shrink-0 text-brand-text" aria-hidden />
              <span className="min-w-0">
                <span className="block text-heading7 text-ink">
                  {hi
                    ? `लॉगिन करें और वॉलेट में ${formatINR(bonus)} पाएं`
                    : `Login & get ${formatINR(bonus)} in your wallet`}
                </span>
                <span className="block text-body6 text-ink-muted">
                  {hi ? 'नए ग्राहकों के लिए वेलकम बोनस' : 'Welcome bonus for new customers'}
                </span>
              </span>
            </p>
          )}
        </>
      )}

      {tiles.length > 0 && (
        <>
          <hr className="my-4 border-hairline" />
          <ul
            className={cn(
              'grid divide-x divide-hairline rounded-box bg-success-bg/60 py-3',
              tiles.length === 3 ? 'grid-cols-3' : tiles.length === 2 ? 'grid-cols-2' : 'grid-cols-1',
            )}
          >
            {tiles.map(({ icon: Icon, title, sub }) => (
              <li key={title} className="flex flex-col items-center gap-1 px-2 text-center">
                <Icon className="size-5 text-success-fg" aria-hidden />
                <span className="text-heading8 text-ink">{title}</span>
                <span className="text-body6 text-ink-faint">{sub}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <Link
        href={summary ? '/wallet' : '/login?next=%2Fwallet'}
        className={buttonClass({
          variant: 'brand',
          size: 'md',
          block: true,
          pill: true,
          className: 'mt-4 gap-2 border border-ink/80',
        })}
      >
        {summary ? (
          <Wallet className="size-4" aria-hidden />
        ) : (
          <User className="size-4" aria-hidden />
        )}
        {summary
          ? hi
            ? 'वॉलेट देखें'
            : 'View wallet'
          : bonus
            ? hi
              ? `लॉगिन करें, ${formatINR(bonus)} पाएं`
              : `Login & get ${formatINR(bonus)}`
            : hi
              ? 'लॉगिन करें'
              : 'Login to continue'}
      </Link>
    </div>
  );
}

/**
 * Up to three benefits, in the owner's numbers: the entry cashback slab, where
 * the wallet can be spent, and the top slab. The welcome bonus has its own
 * line above these, so it is not repeated here.
 */
function benefitTiles(
  rules: WalletRulesDto,
  locale: Locale,
): Array<{ icon: LucideIcon; title: string; sub: string }> {
  const hi = locale === 'hi';
  const tiles: Array<{ icon: LucideIcon; title: string; sub: string }> = [];
  if (!rules.enabled) return tiles;

  const slabs = rules.cashback.enabled ? rules.cashback.slabs.filter((s) => s.percent > 0) : [];
  const first = slabs[0];
  const top = slabs.length > 1 ? slabs[slabs.length - 1] : undefined;

  if (first) {
    tiles.push({
      icon: Truck,
      title: hi ? `${first.percent}% कैश कमाएं` : `Earn ${first.percent}% cash`,
      sub: hi ? `${formatINR(first.minOrderValue)} से ऊपर` : `above ${formatINR(first.minOrderValue)}`,
    });
  }
  if (rules.redemption.enabled) {
    tiles.push({
      icon: ShieldCheck,
      title: hi ? 'अगले ऑर्डर पर इस्तेमाल' : 'Use on next order',
      sub: hi
        ? `${formatINR(rules.redemption.minOrderValue)} से ऊपर`
        : `above ${formatINR(rules.redemption.minOrderValue)}`,
    });
  }
  if (top) {
    tiles.push({
      icon: IndianRupee,
      title: hi ? `${top.percent}% तक` : `Up to ${top.percent}%`,
      sub: hi ? `${formatINR(top.minOrderValue)} से ऊपर` : `above ${formatINR(top.minOrderValue)}`,
    });
  }
  return tiles.slice(0, 3);
}

/** The green wallet card from the reference, drawn rather than shipped as an image. */
function WalletArt() {
  return (
    <div
      aria-hidden
      className="relative h-20 w-24 shrink-0 rotate-3 rounded-box bg-gradient-to-br from-[#2f9a4a] to-buy-dark shadow-lg ring-1 ring-black/10"
    >
      <div className="absolute inset-x-2 top-2 h-9 -rotate-6 rounded-md bg-[#48b865] shadow">
        <span className="absolute left-1/2 top-1/2 grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/25 text-white">
          <IndianRupee className="size-3.5" />
        </span>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-9 rounded-b-box bg-buy-dark/95" />
      <span className="absolute bottom-2 left-0 right-0 text-center text-[10px] font-bold text-white">
        Wallet
      </span>
    </div>
  );
}

function shortDate(iso: string, locale: Locale) {
  return new Date(iso).toLocaleDateString(locale === 'hi' ? 'hi-IN' : 'en-IN', {
    day: 'numeric',
    month: 'short',
  });
}
