'use server';

import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@StrikerStore/contract';
import { api } from '@/lib/api/server';

/**
 * The storefront's support writes.
 *
 * Thin, like every other action here: call the API, revalidate, return the
 * `ActionResult`. No validation — the schema lives in core and is the security
 * boundary, and duplicating it here would create a second definition to drift.
 */
export async function startTicket(input: unknown): Promise<ActionResult<{ ticketId: string }>> {
  const result = await (await api()).support.start.mutate(input);
  if (result.ok) revalidatePath('/support');
  return result;
}

export async function sendMessage(input: unknown): Promise<ActionResult<void>> {
  const result = await (await api()).support.send.mutate(input);
  if (result.ok) {
    const id = (input as { ticketId?: unknown } | null)?.ticketId;
    revalidatePath('/support');
    if (typeof id === 'string') revalidatePath('/support/' + id);
  }
  return result;
}

/** Moves a timestamp nothing on screen renders, so nothing is revalidated. */
export async function markRead(input: unknown): Promise<ActionResult<void>> {
  return (await api()).support.markMyRead.mutate(input);
}
