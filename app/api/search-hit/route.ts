import { NextResponse, type NextRequest } from 'next/server';
import { api } from '@/lib/api/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * A product opened from search — the homepage's TRENDING band counts these.
 *
 * A route rather than a Server Action because it is sent with
 * `navigator.sendBeacon` as the page navigates away, which a Server Action
 * cannot receive. `api()` forwards the shopper's IP, which is what the API
 * de-duplicates on — so nothing here needs to, and nothing here trusts a
 * visitor id from the body.
 *
 * Always 204. The shopper has already left for the product page; there is
 * nobody to report a failure to, and a counter that misses a click is fine.
 */
export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const handle =
      body && typeof body === 'object' && 'handle' in body && typeof body.handle === 'string'
        ? body.handle
        : null;
    // SEARCH only: views are recorded by the product page itself and cart adds
    // by the cart action, so a browser cannot claim either through here.
    if (handle) {
      await (await api()).storefront.recordProductSignal.mutate({ kind: 'SEARCH', handle });
    }
  } catch {
    // Swallowed on purpose — see above.
  }
  return new NextResponse(null, { status: 204 });
}
