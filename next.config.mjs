import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The directory Turbopack should treat as the workspace root.
 *
 * Next infers this from the nearest lockfile but stops at the enclosing git
 * repository — and since this app became its own repository the only lockfile
 * sits one directory above it, outside. Turbopack then resolves from this app
 * alone, cannot see the hoisted `node_modules`, and fails to find `next` itself.
 *
 * So the search happens here instead, on the same rule the `outputFileTracingRoot`
 * note below relies on: walk up to whoever owns the lockfile. Today that is the
 * monorepo root where `node_modules` is hoisted; once this app is installed on
 * its own it is this directory. Neither layout needs the value edited, which is
 * the point — a root pinned to one of them would have to be changed on the day
 * of the split, and that is exactly the edit that gets forgotten until a build
 * fails.
 */
function workspaceRoot() {
  const here = dirname(fileURLToPath(import.meta.url));

  for (let dir = here; ; ) {
    if (existsSync(join(dir, 'package-lock.json'))) return dir;
    const parent = dirname(dir);
    // Filesystem root reached with no lockfile anywhere: fall back to this app,
    // which is what Next would have chosen unaided.
    if (parent === dir) return here;
    dir = parent;
  }
}

/*
 * No dotenv call here.
 *
 * Next loads `website/.env` — its own app directory — on its own. This app is
 * not allowed near the database credentials, and not loading them is half of
 * what makes that true. See .env.example: two keys, neither of them a secret
 * that could read or write the database directly.
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // See `workspaceRoot` above: without this Turbopack cannot find the
  // hoisted `node_modules` now that this app is its own git repository.
  turbopack: { root: workspaceRoot() },

  /*
   * Railway builds with Nixpacks; standalone keeps the runtime image small.
   *
   * `outputFileTracingRoot` is deliberately **not** set — Next infers it from
   * the nearest lockfile, which is correct both while this lives beside the
   * other apps and once it is its own repository. `postbuild.mjs` locates the
   * traced output the same way rather than assuming where it landed.
   */
  output: 'standalone',

  /*
   * Security headers on every page.
   *
   * Framing is limited to this site, so a page that collects an address or a
   * payment cannot be overlaid by someone else's. Location is allowed for this
   * site alone (the delivery-area picker asks for it); camera and microphone
   * for nobody. `payment` is left at the browser default, which the gateways'
   * own frames rely on.
   *
   * The enforced CSP stops at framing, plugins and `<base>` — directives that
   * cannot break a script. The full allowlist below is **report-only**: it
   * blocks nothing, and posts what it *would* block to `/api/csp-report`, so it
   * can be checked against real traffic before it is ever enforced. Images may
   * come from any https host — the media domain is the API's to name at
   * runtime, and an image is the least dangerous thing a page loads. Scripts
   * are the point, and they are listed exactly.
   */
  async headers() {
    const reportOnly = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://connect.facebook.net https://checkout.razorpay.com https://maps.googleapis.com https://maps.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://*.facebook.com https://connect.facebook.net https://*.razorpay.com https://maps.googleapis.com https://*.r2.cloudflarestorage.com",
      "frame-src 'self' https://*.razorpay.com",
      "form-action 'self' https://secure.payu.in https://test.payu.in",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      'report-uri /api/csp-report',
    ].join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self'; object-src 'none'; base-uri 'self'",
          },
          { key: 'Content-Security-Policy-Report-Only', value: reportOnly },
        ],
      },
    ];
  },
};

export default nextConfig;
