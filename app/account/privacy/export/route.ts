import { NextResponse } from 'next/server';
import { api } from '@/lib/api/server';
import { currentCustomer } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * "Download my data" — everything the shop holds about the signed-in customer,
 * as a JSON file (DPDP Act §11).
 *
 * A route rather than a page, so a plain link saves a file. The API reads the
 * customer off the session it is forwarded, never off the URL, so there is no
 * id here anyone could change to download someone else's.
 */
export async function GET(request: Request) {
  const customer = await currentCustomer();
  if (!customer) {
    return NextResponse.redirect(new URL('/login?next=%2Faccount%2Fprivacy', request.url));
  }

  const data = await (await api()).storefront.myDataExport.query();
  const day = new Date().toISOString().slice(0, 10);

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="my-data-${day}.json"`,
      // Personal data: never kept by a browser or proxy cache.
      'cache-control': 'no-store, private',
    },
  });
}
