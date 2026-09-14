# Architecture Rules (non-negotiable)

This document exists because the first iteration didn't have one, and
the absence was the actual root cause of the validation
inconsistencies and untestable code that triggered this rebuild —
Next.js and a raw Supabase client are unopinionated; nothing forces
good structure unless it's written down and checked against. This is
that check.

Every rule below maps to a specific problem that actually happened.

## Layering (fixes: no Dependency Inversion)

```
Route / Server Action  ->  Service  ->  Repository (interface)  ->  Supabase (concrete)
```

- **Server Actions and Route Handlers never call `supabase.from(...)`
  directly.** They call a service function, which depends on a
  repository *interface*, not a concrete Supabase client. This is the
  Dependency Inversion Principle applied literally, not abstractly:
  the thing that changes often (route/action code) depends on an
  abstraction; the thing that's stable (the interface) doesn't depend
  on the thing that changes rarely but is annoying to test (Supabase).
- Each repository interface is scoped to one aggregate (e.g.
  `OrganizationRepository`, `EventRepository`) — not one giant
  `SupabaseRepository` that does everything. That's Interface
  Segregation: a consumer that only needs to read events shouldn't
  depend on an interface that also knows how to write sponsors.
- Every repository interface has two implementations: a real one
  (Supabase) and an in-memory fake, used in tests. If a repository
  can't reasonably have a fake written for it, that's a sign its
  interface is wrong (too broad, leaking Supabase-specific concepts).

## Validation (fixes: no centralized validation)

- **Every piece of data entering the system from outside — form
  submissions, API payloads — is validated against one schema, defined
  once, before it reaches any service or repository.** Zod (or
  equivalent) schemas live next to the service they belong to, and are
  the *only* place that decides "is this a valid organization."
- No ad hoc `String(formData.get(...) ?? "").trim()` + manual `if
  (!x)` checks scattered across action functions. If a field needs a
  rule (required, min length, format), it goes in the schema, not in
  the function that happens to use it first.
- A schema failure produces a structured, predictable error — not a
  raw thrown exception or a silently-ignored `return`.

## Where business logic actually lives

- **Data integrity and access control -> the database.** Row Level
  Security, foreign keys, check constraints, unique indexes (including
  partial ones for "at most one X per group" rules). These need to
  hold true no matter what touches the data — this app, a future
  second client (the mobile app), a person in the SQL editor, a bug —
  so they belong where nothing can bypass them.
- **Workflow and product logic -> the application (services).**
  Multi-step flows, anything that changes as the product evolves,
  anything that benefits from being read/tested/debugged in
  TypeScript rather than PL/pgSQL. Don't reach for another database
  trigger when a service function does the same job more legibly.
- A `security definer` database function is only ever used for a
  narrow, specific reason (e.g. checking something across tenant
  boundaries that RLS would otherwise block) — and it returns the
  minimum data needed for that one purpose, never a full row/table.
  Reaching for the service-role key from application code is treated
  as a last resort, not a default.

## Single Responsibility, applied concretely

- A service function does one thing. "Validate, check for a
  duplicate, insert, and decide where to redirect" is four
  responsibilities in one function — split them. Validation is the
  schema's job; persistence is the repository's job; the service
  orchestrates; the route handles navigation/response.

## Testing

- Every repository has an in-memory fake (see Layering above).
- Every service function has real unit tests written against the
  fake, not the real Supabase client — no network, no live database,
  in CI or locally.
- Every pure utility function (slug generation, formatting, etc.) has
  direct unit tests — no fakes needed, just inputs and expected
  outputs.
- `npm run typecheck`, `npm run lint`, and `npm run test` all pass
  before anything is considered done — same standard as the WAS-CROS
  evaluator project.

## Migrations

- One migration per logical change. Never edit a migration that has
  already been run against a real database (local or remote) — write
  a new one instead.
- If a migration was written but never actually applied anywhere,
  it's fine to edit or squash it — it isn't real yet.

## Documentation discipline

- `PRODUCT-DECISIONS.md` is the single source of truth for *what* this
  product does. This file is the source of truth for *how* it's
  built. Both get updated deliberately when a real decision changes —
  never left to silently drift out of sync with the code.

## SOLID: what's actually being applied, honestly

This document leans on SOLID language, so it's worth being precise
about which principles are deliberate design goals here versus which
just happen to hold as a side effect — claiming "all five" without
this distinction would overstate what's actually being engineered.

- **SRP — deliberate.** See "Single Responsibility, applied
  concretely" above: a service does one thing, validation/persistence/
  orchestration/navigation are split apart on purpose.
- **ISP — deliberate.** See "Layering" above: repository interfaces
  are scoped per aggregate (`OrganizationRepository`,
  `EventRepository`, ...), not one interface that knows everything.
- **DIP — deliberate, and the primary reason this document exists.**
  Actions/routes depend on a repository interface, never the concrete
  Supabase client.
- **LSP — a side effect, not a separate goal.** It's satisfied because
  the real (Supabase) and fake (in-memory) implementation of each
  repository interface have to honor the same contract for the fakes
  to be valid test doubles at all — if a fake behaved differently from
  the real thing in a way that mattered, the tests would be lying. Not
  something enforced by a rule beyond that.
- **OCP — not a design goal here, on purpose.** No plugin/strategy
  points (e.g. a swappable duplicate-matching strategy) are being
  built in ahead of a concrete need. Speculative extensibility with no
  current use case is exactly what the Migrations rule above already
  argues against ("if it isn't real yet, don't build it") — the same
  reasoning applies here.
