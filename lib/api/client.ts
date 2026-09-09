import 'server-only';
import { createTRPCClient, httpBatchLink, TRPCClientError } from '@trpc/client';
import type { AppRouter } from '@StrikerStore/contract';

/**
 * The storefront's client for `backend/api`.
 *
 * `AppRouter` is a **type-only** import: no API code is bundled into this app,
 * but every procedure keeps its signature across the boundary, so a changed
 * argument breaks the build rather than a request.
 *
 * `httpBatchLink` is deliberate — it collapses the calls one render makes into a
 * single request, which is the mitigation for the N+1-over-HTTP risk the
 * architecture calls out. A storefront page assembling a header, a nav and a
 * product grid is exactly the shape that risk describes.
 */
function apiUrl(): string {
  const url = process.env.API_URL;
  if (!url) {
    throw new Error(
      'API_URL is not set. The storefront reaches backend/api over it — see .env.example.',
    );
  }
  return url.replace(/\/$/, '');
}

/**
 * Builds a client for one request.
 *
 * Per-request rather than a module singleton. Today the storefront is anonymous
 * and a singleton would be harmless, but customer sessions are coming, and a
 * shared client would then leak one shopper's token into another's request under
 * concurrency. Getting the shape right while it is still trivial costs nothing.
 */
export function apiClient(clientIp?: string | null, customerToken?: string | null) {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: apiUrl(),
        headers() {
          return {
            // Proves this is one of our apps. Not identity — every request from
            // the storefront carries the same value.
            'x-service-token': process.env.SERVICE_TOKEN ?? '',
            /*
             * The browser's address, forwarded on. The API is a hop removed from
             * the shopper, so left alone it would attribute everything to this
             * container. Forwarding is only safe because the caller is
             * authenticated by the service token above; an unauthenticated
             * caller's x-forwarded-for is never believed.
             */
            ...(clientIp ? { 'x-forwarded-for': clientIp } : {}),
            /*
             * The customer's session, when there is one. A separate header from
             * `authorization`, which carries the admin's — the API verifies the
             * two with different keys, and keeping them in different headers
             * means neither can be mistaken for the other by a proxy that
             * forwards one of them.
             */
            ...(customerToken ? { 'x-customer-token': customerToken } : {}),
          };
        },
      }),
    ],
  });
}

/** The tRPC error code, when the failure came from the API rather than the wire. */
export function apiErrorCode(error: unknown): string | null {
  return error instanceof TRPCClientError ? ((error.data as { code?: string })?.code ?? null) : null;
}
