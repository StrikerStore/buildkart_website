import { NextResponse, type NextRequest } from 'next/server';
import { api } from '@/lib/api/server';
import { imageUrl, IMAGE } from '@/lib/media';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** How many rows the dropdown shows. The API caps this at ten. */
const LIMIT = 8;

/**
 * One suggestion, as the browser receives it.
 *
 * The difference from `StorefrontSuggestionDto` is `imageSrc`: the API returns
 * an `imageKey`, and turning one into a URL needs the media config, which lives
 * behind `lib/media.ts` — a `server-only` module a Client Component cannot
 * import. Resolving it here is what lets the dropdown render an `<img>` without
 * the search box knowing anything about R2 or Cloudflare.
 */
export type SuggestionRow = {
  handle: string;
  name: string;
  brandName: string | null;
  imageSrc: string | null;
  price: string | null;
  unitLabel: string | null;
};

/**
 * The search box's dropdown.
 *
 * A GET route rather than a Server Action, for the reason the support poll
 * states next door: an action is a POST that Next treats as a mutation and
 * serialises against other actions, which is the wrong shape for a read that
 * fires while somebody is typing. A route is also abortable, so a keystroke can
 * cancel the request the one before it started.
 *
 * It answers `[]` rather than an error for anything that goes wrong — a
 * dropdown that fails should quietly stop suggesting, not put a red box under
 * the header. The results page is one Enter away and is the real answer.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  const locale = request.nextUrl.searchParams.get('locale') === 'hi' ? 'hi' : 'en';

  // Matches `storefrontSuggestSchema`'s floor. Asking the API for a single
  // character would only earn a validation error.
  if (q.length < 2) return NextResponse.json([], { headers: { 'Cache-Control': 'no-store' } });

  try {
    const rows = await (await api()).storefront.suggest.query({ q, limit: LIMIT });

    const suggestions: SuggestionRow[] = await Promise.all(
      rows.map(async (row) => ({
        handle: row.handle,
        name: (locale === 'hi' && row.nameHi) || row.nameEn,
        brandName: row.brandName,
        imageSrc: await imageUrl(row.imageKey, IMAGE.thumb),
        price: row.price,
        unitLabel: (locale === 'hi' && row.unitLabelHi) || row.unitLabelEn,
      })),
    );

    return NextResponse.json(suggestions, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json([], { headers: { 'Cache-Control': 'no-store' } });
  }
}
