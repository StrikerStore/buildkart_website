import { NextResponse, type NextRequest } from 'next/server';
import { api } from '@/lib/api/server';
import { LOCATION_COOKIE, parseLocation } from '@/lib/location-shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The visit beacon — one storefront session event. See `lib/visit.ts`.
 *
 * A route rather than a Server Action because it is sent with
 * `navigator.sendBeacon`, often as the page navigates away. The body is passed
 * through untouched apart from the user agent and the delivery area, which are
 * read here from the request rather than trusted from the page; the API
 * validates the rest and drops what it does not like.
 *
 * The area is the `bk_area` cookie the location picker sets: its city, or just
 * its pincode for the API to name. It is what the city reports count. `api()` forwards the customer's session, so a
 * signed-in shopper's visit is tied to them.
 *
 * Always 204, and quickly: there is nobody to report a failure to.
 */
export async function POST(request: NextRequest) {
  try {
    const text = await request.text();
    // A session event is a few hundred bytes; anything bigger is not one.
    if (text.length > 4096) return new NextResponse(null, { status: 204 });
    const body = JSON.parse(text) as unknown;
    if (body && typeof body === 'object') {
      const area = parseLocation(request.cookies.get(LOCATION_COOKIE)?.value);
      await (await api()).storefront.recordVisit.mutate({
        ...body,
        userAgent: request.headers.get('user-agent') ?? undefined,
        city: area?.city ?? undefined,
        pincode: area?.pincode,
      });
    }
  } catch {
    // Swallowed on purpose — see above.
  }
  return new NextResponse(null, { status: 204 });
}
