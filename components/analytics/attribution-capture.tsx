'use client';

import { useEffect } from 'react';
import {
  ATTRIBUTION_COOKIE,
  ATTRIBUTION_MAX_AGE,
  nextAttribution,
  parseAttribution,
  touchFromLocation,
} from '@/lib/attribution';
import { readCookie, writeCookie } from '@/lib/browser-cookies';

/** Meta's click-id cookie lives 90 days; matching it keeps the two in step. */
const FBC_MAX_AGE = 60 * 60 * 24 * 90;

/**
 * Records where this visit came from, once per page load. Renders nothing.
 *
 * Once per *document*, not per route: UTM tags and click ids arrive on the
 * landing URL, and `document.referrer` only means "the site before this one"
 * on a full load — after a soft navigation it still names the original
 * referrer, which would credit every internal click to it again.
 *
 * Also mints Meta's `_fbc` cookie from an `fbclid` when there is not one for
 * that click already. The pixel does this itself, but only if it loads; an ad
 * blocker that stops the pixel would otherwise cost the server-side Purchase
 * its strongest match key.
 */
export function AttributionCapture() {
  useEffect(() => {
    try {
      const touch = touchFromLocation(location.href, document.referrer);
      const stored = parseAttribution(readCookie(ATTRIBUTION_COOKIE));
      const next = nextAttribution(stored, touch, location.pathname);
      if (next) writeCookie(ATTRIBUTION_COOKIE, JSON.stringify(next), ATTRIBUTION_MAX_AGE);

      if (touch?.fbclid && !readCookie('_fbc')?.endsWith(`.${touch.fbclid}`)) {
        writeCookie('_fbc', `fb.1.${Date.now()}.${touch.fbclid}`, FBC_MAX_AGE);
      }
    } catch {
      // Blocked cookies, an odd URL: attribution is a nicety, never an error.
    }
  }, []);

  return null;
}
