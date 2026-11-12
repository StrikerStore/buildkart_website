import { NextResponse, type NextRequest } from 'next/server';
import { apiClient } from '@/lib/api/client';
import { allowsAnalytics, CONSENT_COOKIE } from '@/lib/consent';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The anonymous visit count — a visit from a browser that has not said yes to
 * analytics. See `recordVisit` in `lib/visit.ts`.
 *
 * The opposite of `/api/t` in everything it forwards. That route sends the
 * session, the visitor, the delivery area and the signed-in customer; this one
 * sends none of them, and reads no cookie at all except the consent one. The
 * API gets the event, the moment it was counted, and the user agent (for the
 * kind of device), and adds one to a daily tally. The client is built here
 * without the customer's session or the shopper's address, so the API could
 * not tie the visit to anyone even if it tried.
 *
 * A browser that did say yes is counted as a session instead, so its visits
 * are dropped here. A retraction is still let through: it is sent just after
 * the yes, to take back the visit counted before it.
 *
 * Always 204, and quickly: there is nobody to report a failure to.
 */
export async function POST(request: NextRequest) {
  try {
    const text = await request.text();
    if (text.length > 512) return new NextResponse(null, { status: 204 });
    const body = JSON.parse(text) as { event?: unknown; at?: unknown };
    if (body.event !== 'visit' && body.event !== 'retract') return new NextResponse(null, { status: 204 });
    if (body.event === 'visit' && allowsAnalytics(request.cookies.get(CONSENT_COOKIE)?.value)) {
      return new NextResponse(null, { status: 204 });
    }
    await apiClient(null, null).storefront.recordAnonymousVisit.mutate({
      event: body.event,
      at: typeof body.at === 'number' ? body.at : undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    });
  } catch {
    // Swallowed on purpose — see above.
  }
  return new NextResponse(null, { status: 204 });
}
