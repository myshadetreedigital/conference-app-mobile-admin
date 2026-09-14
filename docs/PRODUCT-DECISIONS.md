# Product Decisions — carried forward from the first iteration

Everything below is a settled requirement, arrived at through real
back-and-forth during the first build. The *code* is being thrown out;
these decisions are not being reconsidered as part of that reset —
this file is what the rebuild is built *against*.

## What this product is

A white-label conference companion platform: an admin web dashboard
(this repo) plus a mobile app (separate project, not started) sold to
conference organizers. Each client gets their own branded experience.

## MVP feature scope (mobile app)

- Schedule browsing — static/baked-in for the event (no live mid-event
  updates needed; content locks before the conference)
- Personal bookmarks — synced per user via account login
- Sponsor directory — grouped by tier (Diamond/Platinum/Gold/Silver/
  Bronze/A la Carte)
- Speaker list — public, speakers have already consented to being
  listed
- Personal contacts — attendees can save another person's contact
  info (name, and whatever they choose to add) as they meet people at
  the event, as an in-app personal address book. This is user-entered
  data, private to the attendee who saved it — **not** a shared or
  public attendee directory. There is no listing of attendees
  anywhere in the app. Explicitly NOT live messaging or AI-driven
  matching — those were scoped out as too complex for v1

## Multi-tenancy model

- `organization` = a paying client. `event` = one conference instance
  belonging to an organization. Event is the tenant boundary — all
  conference content (sessions, speakers, sponsors, attendees) belongs
  to exactly one event.
- **One organization per admin account**, enforced at the database
  level (not just hidden in the UI) — an admin sets up their
  organization once, during onboarding, and can't create a second one.
- **An organization can have any number of events** (draft next year's
  while this year's is live, keep past ones around instead of
  deleting them) — but **only one can be `live` at a time**. Status
  lifecycle: `draft` -> `live` -> `archived`. This is an explicit admin
  action (Publish / Archive), **not date-derived** — organizers may
  keep an event's app open to attendees well after the conference ends,
  at their own discretion.
- `admin_memberships` links a user to an organization with a role
  (`owner`/`admin`/`editor`) — the role distinction was named but never
  actually enforced differently anywhere; decide real permissions per
  role before relying on this for anything.

## Registration -> Onboarding -> Dashboard flow

Sequential, no branching:

1. **Register**: First name, last name, email, password. This is
   captured for the business's own user/adoption data, independent of
   any organization.
2. **Onboarding** (immediately after registration, before the
   dashboard): create the organization. Fields:
   - Name — required. Can be a person's name, not just a company —
     **personal events are in scope**, not just business conferences.
   - Phone — required.
   - Email — required, defaults to the account's own email but
     editable (so a different business line can be used).
   - Address — optional.
3. **Dashboard** — reached only once the organization exists.

## Duplicate-organization detection

- New organization's name/phone/email are compared against **every**
  existing organization (not just ones the new, membership-less user
  can already see) — this requires bypassing normal per-tenant
  visibility rules, deliberately narrowly: whatever mechanism does
  this should return *only* a candidate match id, never any of that
  other organization's actual data.
- **2 or more of {name, phone, email} matching** an existing org flags
  it as a likely duplicate. Both sides of a field comparison must
  actually have a value for that field to count (two blank phones
  must never count as "matching").
- This **does not block or auto-merge**. The registrant sees a "this
  looks similar to an existing organization — continue anyway?"
  prompt; flagged organizations are recorded for the platform operator
  to review manually. Automating resolution (contacting the
  organizer, merging accounts) is explicitly deferred — not worth
  building before there's real signal on how often this happens.
- Rejected alternative: requiring a "company email" (custom domain) as
  a stronger identity signal — explicitly rejected because it would
  exclude legitimate small organizers who run real businesses on
  Gmail/Yahoo/Outlook. If domain-based matching is used, it must
  exclude known generic/free email providers from counting as a match
  signal at all (matching two Gmail addresses proves nothing).
- Rejected alternative: EIN/SSN-based identity verification —
  explicitly rejected as too much legal/compliance overhead for what
  this needs to be.

## Slugs

- Event slugs are **auto-derived from the event name**, not manually
  typed, using WordPress's `sanitize_title()` rule pattern: lowercase,
  strip accents/diacritics, strip anything that isn't
  alphanumeric/space/underscore/hyphen, collapse whitespace and
  underscores into single hyphens, trim leading/trailing hyphens.
- A name that slugifies to nothing (non-Latin-only, punctuation-only)
  needs a fallback (WordPress's own fallback is the post's numeric ID;
  a random suffix is a reasonable stand-in when no ID exists yet at
  creation time).
- A slug collision with an existing one should get `-2`, `-3`, etc.
  appended — same as WordPress resolves a duplicate post slug.

## White-label mobile distribution

- **Every client gets their own separately-branded, separately
  App-Store/Play-Store-listed app** (own name, own icon) — not one
  shared multi-tenant app with in-app branding. This was a deliberate
  choice after weighing the alternative (one shared app, lower
  ongoing cost, but a weaker sales pitch since it doesn't read as
  "your own app").
- All client apps are published under the **platform operator's own**
  single Apple Developer + Google Play accounts — clients never need
  their own developer accounts or touch App Store Connect.
- Mobile app framework: **React Native + Expo**, chosen specifically
  because EAS Build/EAS Submit is the most mature tooling for "one
  codebase, many differently-branded, separately-published apps" —
  this was the deciding factor over Flutter or native, not general
  framework preference.
- Each client's build is driven by its own config: app name, bundle
  ID, icon, theme colors, and which backend tenant/event it points at.
- An *update* to an already-approved app clears store review much
  faster than a brand-new submission — the ongoing per-client rebuild
  cost is real but smaller than the first-time cost, and is meant to
  be handled by scripted/automated pipeline runs, not manual
  per-client work.

## Theme / branding

- Each event holds its own branding: logo, primary color, background
  color, text color. Editable from the admin dashboard (the actual
  editor UI was never built in the first iteration). Read by the
  mobile app's build config for anything that requires a rebuild to
  change, and at runtime for anything that doesn't.

## Data visibility / security model

- Row Level Security (or an equivalent enforced-at-the-data-layer
  mechanism) throughout: default-deny, explicit grants.
- Conference content (sessions, speakers, sponsors) is **public read**
  (the mobile app needs this, and none of it is sensitive) but
  **admin-write, scoped to the owning organization's admins only**.
- A user's personal data — bookmarks, and their saved personal
  contacts (see MVP feature scope) — is scoped to that user only. No
  attendee data is ever publicly readable.
- **The mobile app talks to Supabase directly** (same as the admin
  app), with RLS as the actual enforcement boundary — no separate API
  layer in front of it for v1. A REST/API layer would just re-
  implement what RLS already provides; only worth building later if a
  concrete need shows up (complex server-side aggregation, rate
  limiting, hiding schema from a future non-Supabase client) — not
  built speculatively now.

## Auth flows

- **Password reset**: user enters their email, receives a one-time
  code (not a magic link), enters the code + new password to
  complete the reset. Supabase's default recovery flow is a magic
  link — this needs the OTP-code variant (`resetPasswordForEmail` +
  `verifyOtp` with `type: 'recovery'`) built deliberately, not
  assumed to come free.

## Billing

- **Deferred entirely for v1.** No billing/subscription logic, no
  Stripe integration, no paywall — organizations are onboarded and
  used without any payment step for now. Revisit once there's a real
  need to charge; not worth designing against speculatively.

## Known operational notes

- Whatever email-sending mechanism is used for account verification,
  the free/shared/testing-tier sender on most platforms is
  rate-limited and not meant for real usage — plan to connect a real
  transactional email provider (Resend/SendGrid/Postmark/SES or
  similar) before real attendees rely on email verification working
  reliably.
- **Staging first, promoted to production deliberately** — migrations
  and changes land against a staging Supabase project before touching
  production, same pattern already used for the WAS-CROS evaluator
  app.
