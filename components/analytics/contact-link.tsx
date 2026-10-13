'use client';

import { track } from '@/lib/meta-pixel';

/**
 * A call or WhatsApp link that tells Meta it was used.
 *
 * Many of this shop's customers ask before they buy — a thekedar calls to
 * check the rate, then orders on the phone. Meta's `Contact` event lets an ad
 * that made the phone ring be optimised for that, instead of looking like it
 * did nothing because the sale never passed through the checkout.
 *
 * A plain anchor otherwise: the navigation is the browser's, and the event is
 * sent without waiting for it.
 */
export function ContactLink({
  method,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { method: 'phone' | 'whatsapp' }) {
  return (
    <a
      {...props}
      onClick={(event) => {
        track('Contact', { content_name: method, content_category: 'support' });
        props.onClick?.(event);
      }}
    />
  );
}
