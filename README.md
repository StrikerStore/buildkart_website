# website

The customer-facing BuildKart storefront. **The storefront itself is not built
yet** — what exists is a working skeleton: a Next app that boots, reaches the
API, and renders one page proving the wiring.

## Running it

```bash
cp .env.example .env      # then fill in SERVICE_TOKEN to match backend/.env
npm install
npm run dev               # port 3000
```

`backend/api` must be running on the port in `API_URL` (3002 by default), and
its `SERVICE_TOKEN` must match this app's exactly — every request is refused
otherwise. `app/page.tsx` says which of the two went wrong when it fails, which
is the main reason that page exists.

Ports: storefront **3000**, admin 3001, `backend/api` 3002.

## How it gets its data

**Through `backend/api`, over tRPC. Not through Prisma.**

This is the one thing to get right, and it is a correction to the original
storefront plan, which assumed the storefront would query the database directly
the way the admin used to. It cannot: `backend/api` is the only service holding
`DATABASE_URL`.

The pattern is already here in `lib/api/`, copied from the admin:

- `AppRouter` is imported from `@StrikerStore/contract` as a **type only**. No API
  code is bundled, but every procedure keeps its signature — a changed argument
  breaks the build rather than a request.
- **One client per request**, cached, so `httpBatchLink` collapses everything a
  render asks for into a single HTTP request. A page that would have made five
  Prisma queries must not become five round trips.
- Prefer procedures modelled on **pages, not tables** — `catalog.productList`
  already returns rows, totals and filter options together.
- The shared vocabulary — money formatting, the en/hi locale fallback, media
  URLs, `priceOrder()` — comes from `@StrikerStore/contract` too. It is pure, has
  no database, and is meant to be used from both apps.

`@StrikerStore/contract` is published from the backend repository. Installing it
needs `NODE_AUTH_TOKEN` set to a GitHub token with `read:packages`; see
`.npmrc`.

## What it owns, and what it does not

The storefront owns **structure and theme**: layout, brand tokens, components,
templates, routing and SEO.

Everything it *says* — categories, products, menus, pages, policies, blog,
banners, offer strips and the homepage running order — comes from the database
and is edited in the admin. That split is the whole point of the design, and it
is the same one Shopify draws between a theme and a store.

## What is deliberately missing

- **`app/page.tsx` is a placeholder.** It renders store settings as a table to
  prove the app can read from the API. Whoever writes the real home page should
  delete it outright rather than build on it.
- **`app/globals.css` has almost no tokens.** The admin's palette follows
  Shopify because the owner asked for a tool that behaves like the one they
  already know; the storefront has no such constraint and its identity is still
  an open question. A placeholder palette is the kind of thing that survives by
  accident into production.
- **Content models that do not exist yet**: `Menu`/`MenuItem`, `Page` (with a
  reserved slot for policies), and `BlogPost`. Banners and homepage sections
  already exist and already work.
