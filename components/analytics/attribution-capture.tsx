'use client';

import { useEffect } from 'react';
import type { ConsentChoices } from '@StrikerStore/contract';
import {
  ATTRIBUTION_COOKIE,
  ATTRIBUTION_MAX_AGE,
  nextAttribution,
  parseAttribution,
  touchFromLocation,
} from '@/lib/attribution';
import { readCookie, writeCookie } from '@/lib/browser-cookies';
import { CONSENT_CHANGED, currentChoices } from '@/lib/consent-state';

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
 * **Only with consent.** The landing cookie waits for a yes to analytics, and
 * the `_fbc` it mints from an `fbclid` waits for a yes to marketing. The
 * landing URL is remembered from page load, so a shopper who answers the
 * banner a moment later is still credited to where they actually came from.
 *
 * `_fbc` is minted here because the pixel does it only when it loads; an ad
 * blocker that stops the pixel would otherwise cost the server-side Purchase
 * its strongest match key.
 */
export function AttributionCapture() {
  useEffect(() => {
    const landing = { href: location.href, referrer: document.referrer, path: location.pathname };
    let captured = false;
    let minted = false;

    const capture = (choices: ConsentChoices | null) => {
      try {
        const touch = touchFromLocation(landing.href, landing.referrer);

        if (choices?.analytics && !captured) {
          captured = true;
          const stored = parseAttribution(readCookie(ATTRIBUTION_COOKIE));
          const next = nextAttribution(stored, touch, landing.path);
          if (next) writeCookie(ATTRIBUTION_COOKIE, JSON.stringify(next), ATTRIBUTION_MAX_AGE);
        }

        if (choices?.marketing && !minted) {
          minted = true;
          if (touch?.fbclid && !readCookie('_fbc')?.endsWith(`.${touch.fbclid}`)) {
            writeCookie('_fbc', `fb.1.${Date.now()}.${touch.fbclid}`, FBC_MAX_AGE);
          }
        }
      } catch {
        // Blocked cookies, an odd URL: attribution is a nicety, never an error.
      }
    };

    capture(currentChoices());

    const onChange = (event: Event) => capture((event as CustomEvent<ConsentChoices>).detail);
    window.addEventListener(CONSENT_CHANGED, onChange);
    return () => window.removeEventListener(CONSENT_CHANGED, onChange);
  }, []);

  return null;
}
