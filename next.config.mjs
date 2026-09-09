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

  /*
   * Railway builds with Nixpacks; standalone keeps the runtime image small.
   *
   * `outputFileTracingRoot` is deliberately **not** set — Next infers it from
   * the nearest lockfile, which is correct both while this lives beside the
   * other apps and once it is its own repository. `postbuild.mjs` locates the
   * traced output the same way rather than assuming where it landed.
   */
  output: 'standalone',
};

export default nextConfig;
