import { NextResponse, type NextRequest } from 'next/server';
import { api } from '@/lib/api/server';
import { currentCustomer } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The thread poll.
 *
 * A GET route rather than a Server Action, deliberately. Polling wants a plain
 * request the client can fire often and abort; an action is a POST that Next
 * treats as a mutation and serialises against other actions, which is the wrong
 * shape for a read that happens every few seconds.
 *
 * The ticket id in the path is **not** what makes this safe — `myThread` scopes
 * the lookup by the customer on the session and answers null for anyone else's
 * ticket, which arrives here as a 404. There is no id in this request that
 * grants access to anything.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const customer = await currentCustomer();
  if (!customer) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const { id } = await context.params;
  const after = request.nextUrl.searchParams.get('after') ?? undefined;

  const thread = await (await api()).support.myThread.query({ ticketId: id, afterId: after });
  if (!thread) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  return NextResponse.json(thread, { headers: { 'Cache-Control': 'no-store' } });
}
