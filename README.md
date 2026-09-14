# conference-app

**Live:** https://event-mobile-app-admin.vercel.app/

Admin web dashboard for a white-label conference companion platform.
The rebuild of `conference-app-admin`'s first iteration — see
[`docs/PRODUCT-DECISIONS.md`](docs/PRODUCT-DECISIONS.md) for what this
product does and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for
the rules governing how it's built.

## Stack

Next.js (App Router) + Supabase (Postgres, Auth, RLS) + Zod, following
a Route/Action → Service → Repository (interface) → Supabase layering.

## Setup

```bash
npm install
cp .env.local.example .env.local   # fill in Supabase URL + anon key
npm run dev
```

## Scripts

- `npm run dev` / `npm run build` / `npm run start`
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` — ESLint
- `npm run test` — Vitest (services against in-memory repository fakes,
  pure utilities directly — no live Supabase, no network)

All three (`typecheck`, `lint`, `test`) must pass before anything is
considered done.

## Database

Migrations live in `supabase/migrations/`, applied in order. This
project reuses the first iteration's Supabase project; `0000_wipe_*`
tears down that schema before the real migrations run — it's a
one-time file, not a pattern to repeat.
