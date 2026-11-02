'use server';

import { NOTICE_VERSION, type ActionResult } from '@StrikerStore/contract';
import { api } from '@/lib/api/server';

/**
 * The Contact us form.
 *
 * A Server Action because the API client holds the service token, which must
 * stay on the server. The signed-in customer and the client address reach the
 * API off this request, so the form cannot name either.
 */
export async function sendContactMessage(input: {
  name: string;
  phone: string;
  message: string;
  /** The trap field. Real people never see it. */
  company: string;
}): Promise<ActionResult<{ reference: string | null }>> {
  return (await api()).storefront.submitEnquiry.mutate({
    kind: 'CONTACT',
    ...input,
    // The button press, under the form's notice, is the yes.
    consent: true,
    noticeVersion: NOTICE_VERSION,
  });
}
