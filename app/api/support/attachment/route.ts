import { NextResponse, type NextRequest } from 'next/server';
import type { UploadFailureReason } from '@StrikerStore/contract';
import { api } from '@/lib/api/server';
import { currentCustomer } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Maps core's failure reasons onto HTTP, as the admin's upload routes do.
 *
 * Core states *what* went wrong; deciding that a missing bucket is a 503 the
 * operator must fix, while a 12 MB photo is a 400 the customer can act on, is a
 * transport decision and belongs here.
 */
const STATUS: Record<UploadFailureReason, number> = {
  NOT_CONFIGURED: 503,
  INVALID: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
};

/**
 * A presigned slot for one support photo.
 *
 * The storefront's first route handler, and it earns the exception: the browser
 * PUTs the bytes straight to R2 with a plain `fetch`, and a plain fetch needs a
 * URL to ask for — a Server Action cannot be the thing an uploader calls before
 * it has anything to submit.
 *
 * The bytes never pass through this server, which is the whole point of the
 * presign dance: a photo from a modern phone is several megabytes, and holding
 * it in a request body would put it against the platform's body limit and this
 * container's memory for no gain.
 */
export async function POST(request: NextRequest) {
  const customer = await currentCustomer();
  if (!customer) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const result = await (await api()).support.presignAttachment.mutate(
    await request.json().catch(() => null),
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: STATUS[result.reason] });
  }

  return NextResponse.json(result.data, { headers: { 'Cache-Control': 'no-store' } });
}
