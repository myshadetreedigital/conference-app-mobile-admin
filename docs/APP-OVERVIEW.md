# Conference App Platform — System Overview

**Purpose of this document:** a complete, self-contained description of what this system is, what it does today, how it is built, and what state it is in — written so that a person or an LLM with no prior context can understand it fully. Part 12 analyses how it could be adapted into a second, simpler product (an events hub). Everything above Part 12 describes what exists now; Part 12 is analysis, not built.

*As of 2026-09-20. Facts were taken from the code, migrations and docs in both repositories, and (for the database) checked against the live Supabase project. Where something is unverified or not built, this document says so.*

---

## 1. What it is, in one page

A **conference companion product** made of two applications that share one Supabase (Postgres) backend:

| | Admin web app | Mobile app |
|---|---|---|
| Repo | `conference-app-mobile-admin` (folder name; some code comments still say `conference-app`) | `conference-app-mobile` |
| Users | Event organizers | Event attendees |
| Tech | Next.js 16 (App Router), React 19, Tailwind 4, Supabase SSR, Zod, Vitest | Expo SDK 57, React Native 0.86, Expo Router, Supabase JS, Jest |
| Hosted | Vercel (auto-deploys from GitHub `main`) | Not published yet (development builds via Expo) |
| Does | Organizers create an organization and events, then author the content the mobile app displays | Attendees sign in, browse the live event's schedule, speakers, sponsors and info pages, bookmark sessions, and keep a small private address book |

**How they connect:** there is no custom API server. Both apps talk to Supabase directly. **Row Level Security (RLS) in Postgres is the security boundary.** Event content is public-read and admin-write; personal data (bookmarks, contacts) is visible only to its owner.

**Current commercial shape (decided 2026-09-18):** built for **one paying client first**, not as a white-label multi-client product. The mobile app is hard-wired to **one event** via an environment variable (`EXPO_PUBLIC_EVENT_ID`). The live event today is "NSSC 2026". The original white-label vision (a separately branded app per client) is recorded in `docs/PRODUCT-DECISIONS.md` but was deliberately dropped; the scaffolding for it was removed in mobile commit `7d4db0e`.

---

## 2. People and roles

- **Platform operator** — the owner of this system. Runs the Supabase project and the hosting, applies database migrations by hand, and (eventually) publishes the mobile app under their own Apple/Google developer accounts.
- **Organizer / admin** — registers on the admin web app, creates one *organization* (a business or a person; personal events are in scope), creates *events*, and authors all content. Roles `owner`/`admin`/`editor` exist in the database, **but no permission differences are enforced anywhere** — every member of an organization can do everything.
- **Attendee** — installs the mobile app, registers with email + password (first name, last name), and uses it during the event. Attendees never hold organization memberships.
- **Anonymous visitor** — can read event content through the API (RLS allows public read of content tables), but the mobile app itself requires sign-in before showing anything.

---

## 3. Domain model and vocabulary

| Term | Meaning |
|---|---|
| **Organization** | A paying client / an organizer's business. **One organization per admin account**, enforced in the database. |
| **Event** | One conference instance belonging to an organization. **The event is the tenant boundary**: sessions, speakers, sponsors, info pages all belong to exactly one event. |
| **Status** | `draft` → `live` → `archived`. Changed by explicit admin action (Publish / Archive), **not derived from dates**. An organization can have any number of events but **only one may be `live` at a time** (a partial unique index enforces it). |
| **Session** | A scheduled item in an event (talk, workshop): title, description, start/end time, location. |
| **Speaker** | A person presenting. Public. Has photo, title, bio, "featured" flag, and optional website + social links. |
| **Sponsor** | An organization supporting the event, grouped by **tier**: Diamond, Platinum, Gold, Silver, Bronze, À la carte. Has logo and website. |
| **Bookmark** | An attendee's saved session ("My schedule"). Private to the attendee. |
| **Personal contact** | An entry in an attendee's private address book (name, email, phone, notes). Private, per event, **maximum 10 per person** (enforced in the app only, not in the database). It is *not* a shared or public attendee directory. |
| **More Info** | The mobile tab (and the admin tab that feeds it): a menu of admin-authored rows such as About, Getting here, Emergency info. Stored in `event_info_sections`. The admin tab's URL key is still `my-event` (its old name); the label is "More Info". |
| **Row type** ("When tapped") | What a More Info row does: open a *text page*, open a *Q&A page*, or jump to an *existing screen* (Speakers, Schedule, Sponsors, Contacts). |
| **Q&A page** | A More Info page made of numbered question-and-answer pairs on alternating background bands. Stored in `event_info_qa_entries`. |
| **Accent color** | The one per-event customizable color (`events.primary_color`) applied across the mobile app at runtime. |

---

## 4. Data model (Supabase / Postgres)

Migrations `0000`–`0020` live in `supabase/migrations/` of the admin repo. **The admin repo owns the schema.** Migrations are applied **by hand** by pasting SQL into the Supabase SQL editor, in order; applied migrations are never edited. `0000`–`0019` are applied to the live project and were verified; `0020` is committed and applying it was not confirmed at the time of writing.

### Tables

| Table | Key columns and rules |
|---|---|
| `profiles` | `id` = auth user id; `first_name`, `last_name`. Created by a trigger on signup from user metadata. |
| `organizations` | `name`, `phone`, `email`, `address`, `flagged_duplicate_of`, `created_by`. Duplicate detection: 2 of {name, phone, email} matching an existing organization flags it (never blocks). |
| `admin_memberships` | `organization_id`, `user_id`, `role` (`owner`/`admin`/`editor`); unique per pair; one membership per user (one org per admin). |
| `events` | `organization_id`, `name`, `slug` (unique, auto-derived from the name), `status`, `logo_url`, `primary_color`, `background_color`/`text_color` (present, unused), `tagline`, `description`, `location` (text address), `starts_at`/`ends_at` (**dates only**), `banner_1_image_url`/`banner_1_link_url`/`banner_2_*` (two-slot Home banner), `location_image_url`. Partial unique index `events_one_live_per_org`. |
| `speakers` | `event_id`, `name`, `title`, `bio`, `photo_url`, `featured`, and link columns `website_url`, `instagram`, `facebook`, `youtube`, `tiktok`, `linkedin`, `patreon`, `twitch`, `discord`. A CHECK requires each link to be null or `https://…` (added `NOT VALID`, so it applies to new writes). |
| `sponsors` | `event_id`, `name`, `tier` (CHECK), `logo_url`, `website_url` (https CHECK). |
| `sessions` | `event_id`, `title`, `description`, `starts_at`/`ends_at` (timestamptz), `location`. |
| `session_speakers` | Join table session ↔ speaker. |
| `bookmarks` | (`user_id`, `session_id`), private. |
| `personal_contacts` | `owner_id`, `event_id`, `name`, `email`, `phone`, `notes`, private. |
| `event_info_sections` | `event_id`, `icon` (a name; CHECK only requires a well-formed name), `title`, `body` (HTML subset, see Part 8), `link_target` (`speakers`/`schedule`/`sponsors`/`contacts` or null), `page_style` (`text`/`qa`). Listed by creation time (there is no manual ordering column). Unique `(id, event_id)`. |
| `event_info_qa_entries` | `event_id`, `section_id` (composite foreign key with `event_id`, so an entry can't point at another event's row), `position`, `question` (≤300), `answer` (≤5000, HTML subset). |

Everything cascades on delete from its parent (event → content; auth user → profile, bookmarks, contacts, memberships).

### Storage
One public bucket, `event-media`, for speaker photos, sponsor logos, event logo/banners and the location image. Object paths are namespaced `<event_id>/<folder>/<uuid>-<filename>`, and insert/delete policies use `is_event_admin()` on the leading path segment. Bucket limits: image MIME types only, 5 MB. (Files uploaded before the path namespacing sit at old flat paths and can't be deleted through the app.)

### RLS and functions
- Default-deny with explicit policies. **Public read** on `events`, `speakers`, `sponsors`, `sessions`, `session_speakers`, `event_info_sections`, `event_info_qa_entries`. **Write** on those tables only for admins of the owning organization, via `is_event_admin(event_id)` / `is_org_admin(org_id)` (`security definer` helpers).
- **Own-only** on `profiles`, `bookmarks`, `personal_contacts`, and `admin_memberships`/`organizations` for members.
- `find_possible_duplicate_org(...)` — narrow `security definer` function used during onboarding; returns only a candidate id.
- Triggers: create a profile on signup; create the owner membership when an organization is created. (The organization insert deliberately does **not** use `RETURNING`, because the select policy depends on the membership the trigger creates — see the comment in `supabase-organization-repository.ts`.)
- `0005_debug_whoami.sql` creates a temporary diagnostic function that its own comment says should be deleted once an old investigation was resolved; the migration is still in the folder, and whether the function still exists in the live database was not checked.

### Server-side pieces
- **Edge Function `delete-account`** (Supabase, Deno) — deletes the caller's own auth user using the service-role key, which never leaves the server. Required by Apple guideline 5.1.1(v) and Google Play policy. Everything else cascades from the auth user.
- **Send Email Auth Hook** — admin route `src/app/api/auth/send-email/route.ts`. Supabase calls it instead of its built-in email sender; it verifies the Standard Webhooks signature and sends the message through **Resend**. Used so password reset can be a one-time **code** rather than a magic link.

---

## 5. Admin web app

**Routes** (`src/app/`): `/` dashboard · `/register` · `/login` · `/reset-password` (+ `/confirm`) · `/onboarding` · `/events/[eventId]` (the event editor) · `/api/auth/send-email`. A `proxy.ts` refreshes the Supabase session cookie on requests.

**Flow:** register (first name, last name, email, password) → onboarding: create the organization (name required and may be a person's name; phone required; email required, defaulting to the account email; address optional; duplicate warning "continue anyway?") → dashboard.

**Dashboard (`/`):** organization details (editable: name, phone, email, address), the list of events with status badges, **Publish** (sets `live`; fails with a friendly message if another event is already live) and **Archive**, a create-event form (slug auto-derived; collisions get `-2`, `-3`), and an account header with sign out.

**Event editor** (`/events/[eventId]`) — five tabs, chosen by `?tab=`:

1. **Event details** — logo, accent color picker, tagline, start/end dates, location/address (+ a hint that tapping it opens Maps), **location image** upload, "about" excerpt, and the two Home-screen **banner** slots (image + optional link each).
2. **Sessions** — create and delete. *(No editing, and no UI for linking speakers to sessions — `session_speakers` is only populated from seed data. The mobile schedule detail does display linked speakers.)*
3. **Speakers** — create/edit/delete with photo, title, bio, featured checkbox, and links to a website + 8 social platforms.
4. **Sponsors** — create/edit/delete with tier and logo. *(The website URL column exists and the mobile app shows it, but the admin form has no field for it.)*
5. **More Info** — the menu rows (see Part 8).

**Architecture rules** (`docs/ARCHITECTURE.md`, non-negotiable): `Route/Server Action → Service → Repository (interface) → Supabase`. Server actions never call Supabase directly. Every repository has a real Supabase implementation and an in-memory fake. Every input is validated by one Zod schema next to its service, and failures are structured results, not thrown exceptions. Data integrity and access control live in the database; workflow logic lives in services. Verification bar: `npm run typecheck`, `npm run lint`, `npm run test` all pass. About 765 tests, including browser-style component tests (jsdom) for the interactive forms.

**Interactive forms:** most of the admin is server-rendered forms that redirect with an `?error=` message. The More Info add/edit form is a **client component** (`section-forms.tsx`) so that choosing a row type changes the inputs instantly in the browser, Q&A pairs can be added/removed/reordered/collapsed without a server call, and nothing typed is lost when Save reports a problem.

---

## 6. Mobile app

**Boot:** loads fonts (Plus Jakarta Sans and the icon font), then `AccentProvider` → `AuthProvider` → a root `Stack` with two protected groups: **`(tabs)` only when signed in, `(auth)` only when signed out**. The entire app is behind sign-in.

**Auth (`(auth)`):** the signed-out entry redirects straight to login; there is also register (first name, last name, email, password; names go to user metadata → profile). Session persisted in AsyncStorage. An expired/invalid saved session (JWT error on a query) signs the user out instead of showing a raw error.

**Tabs (`(tabs)`):** Home · Schedule · Speakers · Sponsors · Contacts · **More Info** (circle-with-"i" icon). Each list tab is its own nested stack.

| Screen | What it does |
|---|---|
| **Home** | Two-slot banner slider (admin images, each optionally linking out), a pill menu to the other tabs, the next/current session, a spotlight sponsor, and featured speakers. |
| **Schedule** | Session list with a "my schedule only" filter and a +/− bookmark button. **Double-booking check:** bookmarking a session that overlaps an already-bookmarked one asks whether to switch. Detail page shows the session, its linked speakers, and "Add to schedule". Shared state lives in `ScheduleProvider` so all screens agree. |
| **Speakers** | List with a **Featured** filter; detail shows photo, "Featured" badge, name, title, bio, and a row of **icon buttons** for the website and social profiles. |
| **Sponsors** | Sections grouped by tier (sticky headers) with a filter-by-tier sheet; detail shows logo, tier, and website link. |
| **Contacts** | Private address book: add/edit/delete; up to 10; "N of 10" counter. *(An open question: the counter counts loaded records, and on one device a third card wasn't visible — probably below the fold; unresolved.)* |
| **More Info** | Admin-authored menu of rows with **line icons**. A row opens its own page (text or Q&A) or jumps to Speakers/Schedule/Sponsors/Contacts. Below the rows: the **Location block** (venue address + admin image; tap opens Apple Maps on iOS, Google Maps elsewhere) and the account section (**Sign out**, **Delete account** with confirmation). |

**Data access pattern:** screens query Supabase directly through a small hook, `useSupabaseQuery`, which handles loading/error/refetch and the expired-session sign-out. Every content query is filtered by `EVENT_ID`.

**Design system:** two **fixed surfaces** (not an OS dark-mode toggle): *content* (paper/white, dark text) and *discovery* (near-black with gold). Each screen declares its surface. Chrome is constant: black app bar, and a tab bar filled with the event's **accent color** (default house gold `#AC9245`), with a legible ink color computed from it. The accent is fetched at runtime from `events.primary_color` and cached, so it changes without a rebuild. Typography: Plus Jakarta Sans. Colors are expected to be redesigned later.

**Tests:** Jest with `jest-expo` and Testing Library — about 600 tests, including component and screen tests. Tests live outside `src/app/` because Expo Router treats every file there as a route.

---

## 7. Configuration and environments

**Mobile** (`.env.local`; also EAS environment variables for cloud builds): `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_EVENT_ID`. App identity (name, bundle IDs, splash color) is plain constants in `app.config.ts`. **The bundle ID / package name are permanent once published.**

**Admin** (`.env.local` / Vercel): Supabase URL and anon key, `SUPABASE_AUTH_HOOK_SECRET`, and the Resend API key. No service-role key is used anywhere in app code.

**Environments:** there is a **single Supabase project, and it is production**. `PRODUCT-DECISIONS.md` calls for a staging project first; none exists yet.

**Deploy:** pushing the admin repo's `main` deploys to Vercel automatically. Migrations are separate and manual.

---

## 8. Content authoring rules (what admins can put in More Info)

### Row types and icons
- The **icon** is chosen in a visual picker: **109 icons in 8 groups** (General, Schedule & tickets, Getting around, Venue & facilities, Food & drink, People & sessions, Contact & links, Health & safety) with previews and search. The names are a contract between three places: the admin list (`EVENT_INFO_SECTION_ICONS`, which validation uses), the display data in `src/lib/section-icons.ts`, and the mobile `ICONS` table. The database only checks that the name is well-formed. A name the phone doesn't know is drawn as the information icon.
- **Text page** — one text box. **Q&A page** — Question and Answer boxes per pair; pairs are added/removed/reordered/collapsed in the browser and saved together with the row (max 50; questions are plain text ≤300 characters; answers ≤5000). **Existing screen** — no page content.

### The text format: a small, strict subset of HTML
Text pages and Q&A answers are typed as HTML into an ordinary text box. When submitted, a **parser and filter** (`src/lib/html-content.ts`, using `htmlparser2`) either **rejects it with a plain-English error** or **rewrites it into one canonical form**, which is what gets stored.

- **Allowed:** `<a>`, `<h1>`–`<h6>`, `<p>`, `<ol>`, `<li>`, `<strong>`, `<b>`, `<em>`, `<i>`, `<br>`. `<b>`/`<i>` are stored as `<strong>`/`<em>`. Lists are numbered only (no `<ul>`). Plain text also works: a blank line starts a new paragraph.
- **Not allowed:** everything else — images, `div`, `span`, `style`, `script`, forms, embedded pages, tables — and **any attribute** except `href` on a link.
- **Links:** web links must be **https** (not http); **`mailto:`** must be one plain address (no subject/cc/body — the mobile app fills in the **event name as the subject**); **`tel:`** must be digits with an optional leading `+`. Link text that looks like an address must match where the link goes (so `paypal.com` can't lead elsewhere). Standard URL safety checks apply (no credentials, no custom ports, no IP addresses, no local names).
- **On the phone**, a second, independent, tolerant reader (`src/lib/html-content.ts` in the mobile repo) shows only those tags, throws away script/style/embedded content, never reads attributes other than `href`, and re-checks every link; a link that fails is shown as plain text. No renderer library, no web view, nothing executed.

### Speaker and other links
Speaker links are validated **per platform** (Instagram, Facebook, YouTube, TikTok, LinkedIn, Patreon, Twitch, Discord): exact host match, profile-only paths, platform username syntax; the stored value is always one canonical `https://` URL. Banner links and sponsor websites get the standard https-only checks. The mobile app re-checks every stored link before opening it.

---

## 9. Security posture (summary)

- RLS is the boundary; there is no separate API layer; no service-role key in application code (only inside the `delete-account` Edge Function).
- A 2026-09-16 audit (`docs/SECURITY-AUDIT.md`) found cross-organization storage tampering (fixed by path namespacing and `is_event_admin()` storage policies), missing upload limits (fixed), and PII in a log line (fixed).
- Links and rich text are validated on save, constrained again by database CHECKs where they apply, and re-validated by the phone at display time.
- Every admin server action re-derives identity server-side; the organization id is never taken from form input.
- **Not done:** a fresh security review of the new features, a staging environment, rate limiting, production email hardening beyond Resend.

---

## 10. Working conventions (for whoever, or whatever, continues this)

- **Read the framework docs first.** `AGENTS.md` in each repo says the Next.js and Expo versions have changed from common knowledge; read the versioned docs (`node_modules/next/dist/docs/`, `https://docs.expo.dev/versions/v57.0.0/`) before writing code.
- **Two repos, one product.** A data feature is not done until both sides are: migration + admin form/repository, and the mobile screen. Check both repos before calling anything complete. `CLAUDE.md` in each repo says this.
- **Migrations:** one per logical change; never edit an applied one; the owner applies them by hand. Ship the mobile change before dropping a column it reads.
- **Verification:** typecheck, lint and tests must pass. A useful habit here: after writing tests, deliberately break the code and confirm the tests fail.
- **Commits:** small, descriptive, with a co-author trailer. Pushing admin `main` triggers a production deploy.
- **Ask before deciding product behavior** that the owner hasn't specified; several rework cycles came from assuming.
- **Terminology drift to know about:** "My Event" → "More Info" (admin tab key still `my-event`); "Events tab" was never a real feature name; repo folders were renamed from `conference-app`/`conference-app-admin`.

---

## 11. Status

**Built and working:** admin (auth, onboarding, events, publish/archive, details, banners, location image, sessions create/delete, speakers, sponsors, More Info with text and Q&A pages, HTML filter, icon picker); mobile (auth, Home, Schedule with bookmarks and conflict check, Speakers with icon links, Sponsors by tier, private Contacts, More Info with pages, Q&A bands, Location block, account deletion); Edge Function and email hook.

**Deliberately deferred:** an **Attendees directory with a contact-card QR code** (reverses the "no attendee listing" decision, needs a privacy model); billing; a theme editor; real role permissions; multi-client white-label.

**Known gaps:** no admin UI to link speakers to sessions or to edit sessions; no sponsor website field in the admin form; personal-contact cap enforced only in the app; unresolved Contacts display question; the `0005_debug_whoami` leftover; `PRODUCT-DECISIONS.md` is out of date (it still describes white-label distribution, "one organization", "static schedule", "no attendee listing", and lists the mobile app as "not started").

**Agreed order of remaining work:** finish remaining fixes → **security** review → **compliance** (privacy policy, store data-safety declarations; account deletion already exists) → **publishing** (blocked on: whose Apple/Google developer accounts publish the app, the client's brand assets, and running `eas init`; EAS CLI is not installed yet).

---

## 12. Analysis: adapting this into an events hub (NOT BUILT)

**The idea:** a second, simpler app for the ATLGBTQ brand — one place to post LGBTQ+ events in Atlanta — with changed terminology (speakers → hosts) and **several events active at once**. The rest of the product is intended to stay largely as is.

**Short answer:** the concept is right, and most of the existing pieces carry over, but *multiple active events* is a much bigger change than the terminology, because the whole product is built around one event.

### 12.1 What changes, and how big

| Change | Where it lives today | Size |
|---|---|---|
| **Terminology** (Speakers → Hosts, etc.) | Admin tab labels and form text; mobile tab names, screen titles, route folder `speakers/`; the `speakers` table and its repository/service; test descriptions | **Small if labels only** (keep internal names `speakers`); moderate if you rename tables and code too. Decide which; a labels-only change is cheaper and safer. |
| **Several events live at once** | DB: partial unique index `events_one_live_per_org` (drop it) and the friendly "already live elsewhere" message in `publishEvent`. Mobile: **every screen filters by one `EVENT_ID` from the environment** | **Large.** The phone needs an **Events list** as its front door and an **event detail** with its own hosts/partners/info pages, replacing "all tabs are the one event". Home, Schedule and More Info are all event-scoped today. |
| **Per-event look** | One accent color for the whole app, fetched by `EVENT_ID` | Decide: one ATLGBTQ brand color for the whole app, or a color per event (then the accent provider must move from app-level to event-level). |
| **Sign-in requirement** | The whole app is behind login (`Stack.Protected`) | For a public discovery app, browsing should probably not need an account. Accounts would then only be needed for "save this event"—or not at all. Removing accounts removes the account-deletion and much of the privacy burden. **Worth an explicit decision** given the community. |
| **Organization onboarding** | Multi-tenant: registration → create org → duplicate detection | One brand posts everything, so this could be simplified to a single fixed organization. Optional. |

### 12.2 What probably stays as is
The whole admin architecture (layering, validation, repositories, tests); event content model (details, banners, location + image, More Info pages with Q&A, HTML filter, icon picker); speakers/hosts with photo, bio, featured flag and icon links; sponsors as partners with tiers (or a flat list); publish/archive; the design system and runtime accent; Supabase + RLS; the Edge Function and email hook if accounts remain.

### 12.3 What probably goes
**Schedule and sessions** (an event listing rarely has a multi-session agenda — but decide), **bookmarks** with the double-booking check (or turn into "saved events"), **personal contacts**, and possibly accounts entirely.

### 12.4 Small additions an events *listing* usually needs (not requested — for consideration)
The current event has date-only start/end and a text address. Listings usually want a real start time, a venue name separate from the address, a ticket/RSVP link, a category or tags, an age note, and accessibility info. Most of these fit as a few extra columns and admin fields.

### 12.5 Recommended approach
Fork both repos into a new pair and point them at a **new Supabase project** (isolation from the client's production data; the current tenancy model — one live event, single-event phone app — would otherwise fight the new one). Do the multi-event restructure first, then the terminology pass, then trim features. Reuse the existing conventions (migrations by hand, tests, two-repo rule).

### 12.6 Questions to settle before starting
1. Labels-only terminology, or rename tables and code?
2. Is an account needed at all? If yes, only for saving events?
3. One brand color or a color per event?
4. Do events have sessions/agendas, or are they single listings?
5. Do you want the extra listing fields in 12.4?
6. One fixed organization (the hub), or still multi-organization?
