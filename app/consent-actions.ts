'use server';

import { api } from '@/lib/api/server';

/**
 * Files a cookie-banner answer with the shop, as the record the DPDP Act asks
 * it to be able to produce. The cookie the banner already wrote is what
 * governs this browser; this is only the proof.
 *
 * `api()` forwards the customer's session, so a signed-in shopper's answer
 * also becomes their account's, and follows them to the next device.
 *
 * Never throws: an answer that could not be filed must not stop the banner
 * from closing.
 */
export async function rememberConsent(choices: {
  id: string;
  analytics: boolean;
  marketing: boolean;
  v: string;
}): Promise<void> {
  try {
    await (await api()).storefront.recordConsent.mutate({
      id: choices.id,
      analytics: choices.analytics,
      marketing: choices.marketing,
      noticeVersion: choices.v,
    });
  } catch {
    // The choice still applies; only its record is missing.
  }
}
