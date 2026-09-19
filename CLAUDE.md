@AGENTS.md

## Two-repo project

This app is one half of a pair. Open `~/Documents/Dev/conference-app.code-workspace` in VS Code so both folders are visible in a session.

- **This repo** (`conference-app-mobile-admin`): Next.js admin app for organizers. **Owns the Supabase schema** (`supabase/migrations/`) and the product docs (`docs/PRODUCT-DECISIONS.md`, `docs/ARCHITECTURE.md`, `docs/backlog.md`).
- **Sibling repo** (`../conference-app-mobile`): Expo app for attendees. Reads the tables this repo defines.

Rules that follow from that:
- Every schema change ships as a numbered migration in `supabase/migrations/`. Never leave a column that exists only in the live database.
- A feature that touches data (new column, new field) is not done until both sides are: migration + admin form/repository here, and the screen in the mobile repo.
- Before calling work "complete", check both repos (`git status`, typecheck, tests), not just the one the session was opened in.
