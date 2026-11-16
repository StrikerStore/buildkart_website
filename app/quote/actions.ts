'use server';

import {
  NOTICE_VERSION,
  type ActionResult,
  type QuoteEstimateDto,
  type QuoteJob,
  type QuoteSelection,
} from '@StrikerStore/contract';
import { api } from '@/lib/api/server';
import { currentPoint, currentPricingPincode } from '@/lib/location';

/**
 * The customer's area, off their cookie: the API re-checks it against the
 * owner's list. Out of area, the spot's pincode, so delivery reads "Not in
 * this area" rather than "Set your area".
 */
async function where() {
  const [pincode, point] = await Promise.all([currentPricingPincode(), currentPoint()]);
  return { ...(pincode ? { pincode } : {}), ...point };
}

/** Prices the list again after the customer changes a brand or a quantity. */
export async function repriceQuote(
  jobs: QuoteJob[],
  selections: QuoteSelection[],
): Promise<QuoteEstimateDto> {
  return (await api()).storefront.quoteEstimate.query({
    jobs,
    selections,
    ...(await where()),
  });
}

/**
 * Asks the shop for a better rate on this list.
 *
 * Sends the jobs and the customer's choices, never a price: the API works the
 * list out again and stores its own figures, so nothing forged reaches staff.
 */
export async function requestRate(input: {
  name: string;
  phone: string;
  message: string;
  /** The trap field. Real people never see it. */
  company: string;
  jobs: QuoteJob[];
  selections: QuoteSelection[];
}): Promise<ActionResult<{ reference: string | null }>> {
  const { jobs, selections, ...person } = input;
  return (await api()).storefront.submitEnquiry.mutate({
    kind: 'QUOTE',
    ...person,
    quote: { jobs, selections, ...(await where()) },
    // The button press, under the form's notice, is the yes.
    consent: true,
    noticeVersion: NOTICE_VERSION,
  });
}
