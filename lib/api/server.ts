import 'server-only';
import { cookies, headers } from 'next/headers';
import { cache } from 'react';
import { apiClient } from './client';
import { SESSION_COOKIE } from '../session';
import type { MenuHandle, StorefrontAnnouncementsDto } from '@buildkart/contract';

/**
 * Railway terminates TLS at its proxy, so the socket address is always the
 * proxy's. The leftmost x-forwarded-for entry is the closest thing to the real
 * client — good enough for attribution, and not trusted for anything else.
 */
async function clientIp(): Promise<string | null> {
  const headerList = await headers();
  const forwarded = headerList.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first.slice(0, 45);
  }
  return headerList.get('x-real-ip')?.slice(0, 45) ?? null;
}

/**
 * An API client for this request.
 *
 * Every page goes through here rather than building its own. `cache` makes it
 * one client per request instead of one per call site — the batch link then
 * collapses the calls a single render makes into one HTTP request, which is the
 * whole defence against turning a page's five queries into five round trips.
 */
export const api = cache(async () =>
  apiClient(await clientIp(), (await cookies()).get(SESSION_COOKIE)?.value ?? null),
);

/**
 * Store settings: name, contact details, the locale defaults.
 *
 * Per-request cached, so a header, a footer and a page body all asking for the
 * store name cost one round trip between them.
 */
export const storeSettings = cache(async () => (await api()).content.settings.query());

/**
 * The category tree.
 *
 * Cached per request for the same reason `storeSettings` is: the header strip
 * and a category page's sidebar both want it, and they should cost one call
 * between them rather than two.
 */
export const categoryNav = cache(async () => (await api()).storefront.categoryNav.query());

/**
 * A published menu, by handle.
 *
 * Cached per request and per handle: the header draws two of these — `header`
 * across the top on a desktop, `mobile` inside the side panel — and a page that
 * asks for the same one twice should pay for it once.
 *
 * A failure resolves to an empty menu rather than throwing. A menu is
 * navigation, not content: a header rendered without its links is a degraded
 * page, while a header that throws takes down every page on the site — including
 * the ones a customer reached by other means.
 */
type PublishedMenu = Awaited<
  ReturnType<Awaited<ReturnType<typeof api>>['content']['publishedMenu']['query']>
>;
export type PublishedMenuItem = PublishedMenu['items'][number];

export const publishedMenu = cache(async (handle: MenuHandle): Promise<PublishedMenu> => {
  try {
    return await (await api()).content.publishedMenu.query({ handle });
  } catch {
    return { handle, items: [] };
  }
});

/**
 * The announcement bar, already reduced to what will be shown.
 *
 * Its own call rather than a field on `storeSettings`: the bar is content, and
 * `getSettings` is a named-key read whose whole discipline is that nothing
 * drifts into it by accident. The cost is nothing — the batch link collapses
 * this into the same HTTP request as the header's settings query, because both
 * fire in the one render pass the root layout makes.
 *
 * An empty list on failure, for the same reason the menus take that route: a
 * missing announcement is a page without a strip, while a throw is no page.
 */
export const announcementBar = cache(async (): Promise<StorefrontAnnouncementsDto> => {
  try {
    return await (await api()).content.announcements.query();
  } catch {
    return { rotateSeconds: 5, items: [] };
  }
});
