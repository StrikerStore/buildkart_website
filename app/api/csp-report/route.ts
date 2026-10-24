import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Where test the browser reports what the report-only Content Security Policy
 * would have blocked (see `next.config.mjs`). Nothing is blocked; this is how
 * the allowlist is checked against real traffic before it is enforced.
 *
 * One short log line per report — the directive and the blocked host — and
 * nothing that identifies the visitor: the page path is kept, its query
 * string is not. Bounded, because anyone can post here.
 *
 * Always 204.
 */
export async function POST(request: NextRequest) {
  try {
    const text = await request.text();
    if (text.length > 8192) return new NextResponse(null, { status: 204 });
    const body = JSON.parse(text) as Record<string, unknown> | Array<Record<string, unknown>>;

    // `report-uri` posts `{ "csp-report": {...} }`; the Reporting API posts a
    // list of `{ type, body }`.
    const reports = Array.isArray(body)
      ? body.map((entry) => entry.body as Record<string, unknown> | undefined)
      : [body['csp-report'] as Record<string, unknown> | undefined];

    for (const report of reports.slice(0, 5)) {
      if (!report) continue;
      const directive = String(report['violated-directive'] ?? report.effectiveDirective ?? '?');
      const blocked = String(report['blocked-uri'] ?? report.blockedURL ?? '?');
      const page = String(report['document-uri'] ?? report.documentURL ?? '?');
      console.warn(
        `[csp] ${directive.slice(0, 60)} blocked ${hostOf(blocked)} on ${pathOf(page)}`,
      );
    }
  } catch {
    // A malformed report is not worth an error.
  }
  return new NextResponse(null, { status: 204 });
}

function hostOf(uri: string): string {
  try {
    return new URL(uri).host || uri.slice(0, 40);
  } catch {
    return uri.slice(0, 40); // "inline", "eval", "data"
  }
}

function pathOf(uri: string): string {
  try {
    return new URL(uri).pathname.slice(0, 120);
  } catch {
    return '?';
  }
}
