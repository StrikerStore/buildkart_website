'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Loader2, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Locale } from '@/lib/i18n';
import { reorder } from '@/app/checkout/actions';

/**
 * "Same order again" — the contractor use case PLAN.md §6.8 singles out.
 *
 * Lands on the **cart**, not on a placed order. Rates move daily in this trade,
 * so a repeat has to be repriced and looked at before it is committed; a button
 * that placed the order outright would charge last month's cement price or, on
 * a bad day, one the shop can no longer honour.
 */
export function ReorderButton({ orderId, locale }: { orderId: string; locale: Locale }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="quiet"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await reorder(orderId);
          router.push('/cart');
        })
      }
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <RotateCw className="size-4" aria-hidden />
      )}
      {locale === 'hi' ? 'यही दोबारा मँगाएँ' : 'Order this again'}
    </Button>
  );
}
