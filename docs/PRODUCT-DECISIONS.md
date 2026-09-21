# Product Decisions — carried forward from the first iteration

Settled product decisions, recorded as they were made. **For what the system
is and does today, read `docs/APP-OVERVIEW.md`**; this file is the record of
*why*. Where a decision here has since been changed, the section says
**Superseded** and names the date and the replacement, and the original text
is kept so the reasoning isn't lost. Decisions made after the first build are in
"Decisions since the first build" at the end.

## What this product is

A conference companion: an admin web dashboard (this repo) and an attendee
mobile app (`conference-app-mobile`, built) sharing one Supabase backend.

**Superseded (2026-09-18): white-label.** It was originally planned as a
white-label platform sold to many organizers, each with their own branded app.
That was dropped: the product is built for **one paying client first**, one
event at a time. Do not add multi-client scaffolding. (The multi-organizer
direction now planned is a different product, a separate project; see the end
of this file.)

## MVP feature scope (mobile app)

- Schedule browsing — **Superseded:** originally static/baked-in. The
  schedule is now admin-managed content read live from the database:
  organizers create, edit and delete sessions and choose their speakers,
  and changes appear on the phone without a rebuild. Session times are
  typed and shown in the event's time zone.
- Personal bookmarks — synced per user via account login, with a
  double-booking check (bookmarking a session that overlaps a saved one
  asks whether to switch)
- Sponsor directory — grouped by tier (Diamond/Platinum/Gold/Silver/
  Bronze/A la Carte)
- Speaker list — public, speakers have already consented to being
  listed; each may have a photo, bio, a website and social links (https
  only, validated per platform)
- More Info — an admin-authored menu of pages (text or Q&A) and shortcuts
  to existing screens, plus a Location block with a map link
- Personal contacts — attendees can save another person's contact
  info (name, and whatever they choose to add) as they meet people at
  the event, as an in-app personal address book. This is user-entered
  data, private to the attendee who saved it, **at most 10 per person per
  event** — **not** a shared or public attendee directory. There is no listing of attendees
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

## White-label mobile distribution — Superseded (2026-09-18)

The original decision was that every client would get their own
separately-branded, separately store-listed app, all published under the
platform operator's own Apple and Google accounts, built with React Native +
Expo and EAS Build/Submit (chosen because that tooling is the most mature for
"one codebase, many differently-branded apps").

**What replaced it:** one app, one client. The mobile app is tied to one event
through `EXPO_PUBLIC_EVENT_ID`; the white-label scaffolding was removed. Kept
from the original decision: React Native + Expo, and publishing under the
operator's own developer accounts. An update to an approved app still clears
store review faster than a new submission.

## Theme / branding

- The one customizable value today is the event's **accent color**
  (`events.primary_color`), chosen in the admin's Event details tab and applied
  across the mobile app at runtime, with no rebuild. Everything else in the
  design system (two fixed surfaces, constant chrome, typography) is fixed.
- **Superseded:** the original plan for a full theme editor (logo, primary,
  background and text colors) was not built and is deferred. The
  `background_color` and `text_color` columns exist but are unused. Colors are
  expected to be redesigned later.

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
- **Staging first, promoted to production deliberately** — the intent
  stands, but **no staging project exists yet**: the single Supabase project
  is production, and migrations are applied to it by hand (pasted into the SQL
  editor, in order, never editing an applied one).

## Decisions since the first build

- **2026-09-18 — one client, not white-label.** See above.
- **Speaker links:** https only; each platform's link is checked against that
  platform's own host and username rules and stored in one canonical form; any
  link that doesn't pass is rejected on save and not opened by the phone.
  Skool was removed.
- **More Info (formerly "My Event"):** a menu of rows, each opening a text page,
  a Q&A page (numbered pairs on alternating bands, not an accordion), or an
  existing screen (Speakers, Schedule, Sponsors, Contacts). Home is left out of
  the shortcuts. Icons come from a fixed catalogue of about 110, chosen in a
  visual picker, drawn as line icons on the phone.
- **Text format:** a small strict subset of HTML instead of Markdown (a, h1–h6,
  p, ol, li, strong/b, em/i, br), typed into an ordinary text box and filtered
  when saved; anything else is rejected with a plain-English message. `mailto:`
  and `tel:` links are allowed (the email subject is the event name); web links
  are https only.
- **Attendees directory with a contact-card QR code:** deferred, not in this
  release; it would need a privacy model.
- **Event time zone (2026-09-20):** every event has an IANA time zone; session
  times are typed and shown in it, on the phone too.
- **Multi-organizer festival guide (2026-09-20):** a separate product, cloned
  from these repositories into its own Supabase, Vercel and GitHub projects,
  with a festival level above events, public organizer pages, person and
  session types, signed-out browsing and a color per organizer. Only the
  platform owner adds and edits content. Its decisions are recorded in Part 12
  of `docs/APP-OVERVIEW.md`. Nothing here changes for the conference app.
