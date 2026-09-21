# Conference App Platform — System Overview

**Purpose of this document:** a complete, self-contained description of what this system is, what it does today, how it is built, and what state it is in — written so that a person or an LLM with no prior context can understand it fully. Part 12 describes the direction it is being taken next: a multi-organizer festival guide (for example Atlanta Pride weekend), where many organizers each curate their own events under one umbrella. Everything above Part 12 describes what exists now; Part 12 is planned, not built.

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

Migrations `0000`–`0020` live in `supabase/migrations/` of the admin repo. **The admin repo owns the schema.** Migrations are applied **by hand** by pasting SQL into the Supabase SQL editor, in order; applied migrations are never edited. `0000`–`0020` are applied to the live project (`0005` no longer exists; see Part 4).

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
- The temporary `debug_whoami()` diagnostic function (old migration `0005`) was dropped from the live database on 2026-09-20 and its migration file deleted. Migration numbering therefore skips `0005`; a fresh database simply never creates it.

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
2. **Sessions** — create, **edit** and delete, and choose which speakers present each session (checkboxes on both forms; only speakers of the same event are accepted). Times are read in the server's time zone, not the event's (see Part 11).
3. **Speakers** — create/edit/delete with photo, title, bio, featured checkbox, and links to a website + 8 social platforms.
4. **Sponsors** — create/edit/delete with tier, logo and **website** (same https rules as a speaker's website).
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
| **Contacts** | Private address book: add/edit/delete; up to 10; the counter reads "N of 10 contacts saved". |
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

**Known gaps:** **session times have no time zone handling** (the admin reads a typed time in the server's zone, the phone shows it in the phone's zone, so a 9:00 AM session can show at the wrong hour; fix = a time zone on each event); personal-contact cap enforced only in the app; `PRODUCT-DECISIONS.md` is out of date (it still describes white-label distribution, "one organization", "static schedule", "no attendee listing", and lists the mobile app as "not started").

**Agreed order of remaining work:** finish remaining fixes → **security** review → **compliance** (privacy policy, store data-safety declarations; account deletion already exists) → **publishing** (blocked on: whose Apple/Google developer accounts publish the app, the client's brand assets, and running `eas init`; EAS CLI is not installed yet).

---

## 12. Direction: from one conference to a multi-organizer festival guide (NOT BUILT)

**Decisions (2026-09-20):** the product grows into a multi-organizer guide, built as a **separate project cloned from these two repositories**: new copies of both repos, a **new Supabase project** (its own database and keys), and its own Vercel project. The current conference app and its production database (NSSC 2026) are not touched by this work. Cloning means the new project starts from this code and is changed in place rather than written from scratch. The earlier idea of a simpler, trimmed-down fork is dropped; the new product keeps every feature and adds to them. Everything in Parts 1–11 describes what exists today; this part describes where the clone is going and what changes.

### 12.1 The product

**The problem.** During Atlanta Pride weekend, many independent promoters run their own events (parties, panels, shows). The information is scattered across many social accounts and flyers, and attendees can't see it all in one place.

**The solution.** One app where **many organizers, each curating their own events, appear together under one umbrella** (for example "Atlanta Pride 2026"). An attendee can:
- do everything they can do in the app today (browse a schedule, see people, bookmark sessions with the double-booking check, keep private contacts, read More Info pages, see the venue on a map);
- **see every organization taking part**, and open an organization to see **all of that organization's events in one place**;
- browse the whole weekend across organizers, and filter it.

The commercial shape changes with this: the earlier decision "one paying client, one event, `EXPO_PUBLIC_EVENT_ID`" (Part 1) does not apply to the new product. It is a separate project with its own database, so the NSSC conference is unaffected.

### 12.2 New vocabulary (confirmed 2026-09-20; "Festival" and "Event" are still working names)

| Term | Meaning |
|---|---|
| **Festival** (working name) | The umbrella the app opens on: "Atlanta Pride 2026". Today's `events` row plays this role for the single-event app; whether it keeps that name is open (12.6, question 1). |
| **Organizer** | A promoter/organization taking part. Already exists as `organizations`; becomes public (logo, description, links) instead of purely a login boundary. |
| **Event** | One thing an organizer runs during the festival (for example "White Party"). See 12.3 for the structural question. |
| **Session type** | Every schedule item gets a type: *party, panel, show*, plus today's talk/workshop; the list is extensible. Used for filtering and for a badge/icon on the phone. |
| **Person type** | Every speaker gets a type: *host, MC, DJ, performer*, plus *speaker*; extensible. Replaces the single fixed word "Speaker". **A person can hold more than one type (confirmed).** |

### 12.3 The structural decision that everything else depends on

Today: **Organization 1 → n Event; Event 1 → n Session/Speaker/Sponsor/More Info.** The event is the tenant boundary, and the phone shows exactly one.

The new requirement has one more level than that, and it is not yet settled how to model it. Two candidate shapes:

- **A. Festival above events (three levels).** `Festival → Event (owned by an Organizer) → Sessions`. A promoter's "White Party" is an *event* that has its own details, hosts, sponsors, and possibly several sessions (doors, main show, after-party). The festival is the umbrella that lists organizers and their events. Most flexible; most new code (a new top-level table and a many-to-many "this event takes part in this festival").
- **B. The festival is today's event; promoters' items are sessions.** `Event (the festival) → Sessions (each tagged with an organizer and a session type)`. Least change: the existing schema, Schedule, Speakers and Sponsors screens carry over almost unchanged, and "an organizer's events in one place" is a filter on sessions. The cost: an organizer's individual event can't have its own page, banner, or sponsors — it is only a schedule row — and organizers would need write access to *sessions* inside an event that another organization owns, which is the reverse of today's permission model.

**Decided (2026-09-20): shape A.** A new level is added above events, because it scales better and makes organizations and events first-class, browsable things. Shape B is rejected. This decides the migrations, the admin navigation and the phone's front door.

### 12.4 What changes, and how big

| Change | Where it lives today | Size |
|---|---|---|
| **Many live events** | DB: the partial unique index `events_one_live_per_org` (only one live event per organization) and the "already live elsewhere" message in `publishEvent`. | Small and mechanical: drop the index, change the publish rule. |
| **Phone: the app is no longer one event** | Every screen filters by `EVENT_ID` from the environment; Home, Schedule, Speakers, Sponsors, Contacts and More Info are all event-scoped. | **Large.** The phone needs a *chosen context* instead of a constant: a festival landing (the reworked Home), an **Organizers** list, an **organizer page**, and an **event page**. The existing tabs keep working *inside* an event (or across the festival for Schedule and People). |
| **Home screen rework** | Two-slot banner, pill menu, next session, spotlight sponsor, featured speakers. | Moderate. Becomes the festival's front door: banners, "happening now / today", featured organizers, and entry points to the organizer list and the full schedule. |
| **Organizers become public** | `organizations` is only readable by its own members (RLS). | Moderate. **Decided: every organizer field is public** (name, logo, description, website and social links, contact phone/email/address), so the table can be public-read as a whole rather than split into public and private parts. Consequences: the owner must not store internal notes on it (a separate private table if ever needed); the existing internal columns `flagged_duplicate_of` and `created_by` and the self-registration duplicate check would be dropped or hidden from public reads, since organizers no longer self-register; new profile fields (logo, description, links) are added. The organizer's contact details are published exactly as the onboarding form collects them, so the form should say so. |
| **Person types** | `speakers` has no type; label "Speaker" everywhere. | Small–moderate: because one person can hold several types (confirmed), a small `person_types` table plus a join table (not a single column), admin multi-select field, phone badge and filter, and label wording ("People" or per-type headings instead of "Speakers"). |
| **Session types** | `sessions` has no type. | Small–moderate: a type column, admin field, phone filter and badge/icon. |
| **Sessions become central** | Admin can only create and delete sessions; there is **no editing** and **no UI to link speakers to sessions** (`session_speakers` is only filled from seed data). | **Now a blocker, not a nice-to-have.** Sessions with hosts/MCs/DJs/performers are the core content; session edit, type, and person-linking screens must be built first. |
| **Permissions across organizations** | One organization per admin account (enforced in the DB); every member can do everything; `is_event_admin` = admin of the owning organization; organizations self-register. | **Much smaller than first feared, because of a decision:** organizers get no logins. Only the platform owner (ATLGBTQ) creates and edits organizers, events and everything under them (12.6, questions 2–3). Organizer self-registration and org onboarding come out of the admin app; the one-org-per-admin rule and membership roles stop mattering for organizers. Organizers still exist as public data rows, not as users. |
| **Per-organizer look** | One accent color for the whole app from `events.primary_color`, fetched by `EVENT_ID`. | **Decided: a color per organizer** (12.6, question 6). The accent provider moves from app level to organizer context, and the color column moves to (or is added on) the organizer. |
| **Cross-event bookmarks** | Bookmarks are (user, session) and already work across events at the table level; the double-booking check and Schedule are per event. | Small–moderate: the schedule and conflict check must work across the whole festival, not one event. |
| **Private contacts** | Per attendee, per event, max 10. | Decide: keep per event, or per festival. |
| **Sign-in** | The whole app is behind login (`Stack.Protected`); RLS already allows public reads. | **Decided: browsing needs no account; sign-in is prompted only when saving** (12.6, question 8). The route gate is removed and save actions trigger sign-in. |

### 12.5 What stays as is
The architecture rules (Route/Action → Service → Repository → Supabase, Zod, fakes, tests); RLS as the boundary; the More Info system with text and Q&A pages, the HTML filter and the icon picker (per event, and possibly per organizer); banners; location block with map link; sponsors and tiers; bookmarks; private contacts; the design system and runtime accent; account deletion; the Edge Function and email hook; migrations applied by hand from the admin repo; the two-repo rule.

### 12.6 Questions to settle before building

1. ~~Shape A or B?~~ **Answered: A**, a level above events. Still open: what to call each level in the UI ("Festival" and "Event" are placeholders), and whether one organizer's "event" is a single thing at one time and place or has several sessions.
2. ~~Who can create an organizer?~~ **Answered:** only the platform owner. Organizers do not self-register; the guide is gated by hand.
3. ~~Who edits what?~~ **Answered:** only the platform owner adds or edits anything. Organizers submit their organizer and event information through a **separate onboarding form** (outside this admin app), and the owner enters it. Still open: where that form lives (a third-party form tool, or a public page in this system, which would be a new public-write surface needing spam and abuse protection), and whether submissions should flow into the admin for review.
4. **Person types and session types:** are the starting lists (host, MC, DJ, performer, speaker; party, panel, show, talk, workshop) complete? (Only the owner edits the lists, since only the owner edits anything. **Answered: one person can hold several types.**)
5. ~~Public organizer profile~~ **Answered:** all organizer fields are public. Still open: the exact field list (logo, description, website and social links, contact email/phone/address) and which links get the per-platform validation used for speakers.
6. ~~Look~~ **Answered:** a color **per organizer**. The accent provider moves from app level to organizer context (organizer page and that organizer's events use its color). Still open: whether it is one color or a small palette, and what the festival-level screens (Home, organizer list) use, likely a fixed festival color.
7. ~~Share the current Supabase project?~~ **Answered: no.** A new Supabase project, Vercel project and repos, so the two products are fully isolated. Consequence: fixes made later in one are not automatic in the other (see question 9).
8. ~~Accounts~~ **Answered:** browsing does **not** require sign-in; login/registration is triggered only when the person saves something (a bookmark, a contact). This matches Apple's rule that an app should not force an account unless it has significant account-based features. Age-restricted content (18+/21+ parties) is handled through each store's age-rating questionnaire, not by requiring sign-in; **not yet verified against current store policy, to be checked in the compliance phase.** Work this implies: RLS and the mobile app's `Stack.Protected` gate change so signed-out visitors can read; save actions prompt for sign-in and then continue.
9. **Sequence (updated):** *(f, added by the owner)* first **complete the remaining conference-app items** (Part 11 known gaps: session editing and speaker linking, the Contacts count question, confirming migration 0020, the sponsor website field, plus the fixes/security items already planned), because the new project is an extension of that app, and **cloning after these are done** means the fixes are inherited instead of made twice. Then *(a)* person and session types → *(b)* the festival level, organizers and events model → *(c)* the phone front door, organizer pages, Home rework, signed-out browsing → *(d)* security and compliance review of the public data and the sign-in change → publishing. Confirm whether the clone is made before or after step (f).
10. ~~Timeline~~ **Answered:** the festival is **Oct 9, 2026**; the target is to **submit to the Apple App Store on Oct 2, 2026** (12 days from 2026-09-20). Everything in this part is intended as the first release, but the date makes scope the main risk: see 12.7.

### 12.7 Schedule and scope for the Oct 2 submission

**Facts that drive the plan.** Apple review usually takes 1–2 days but can take longer, and a first submission is often rejected once; a rejection on Oct 2 leaves about a week to fix and resubmit. Items with lead times outside the code: an Apple Developer Program account (individual enrollment is quick; an organization account needs a D-U-N-S number and can take days to weeks), the app icon and store screenshots, a privacy policy at a public URL, a support URL, the age-rating questionnaire, and `eas init` plus EAS CLI setup. **Start these first; they cannot be sped up by writing code.**

**Content does not need to be finished at submission.** Organizers, events, sessions and people are database rows the owner enters after the app is approved, so the app can be approved while the guide is still being filled in.

**Proposed must-have for Oct 2:** the cloned project (new Supabase, Vercel, repos); the festival level and organizers (public organizer pages, all events of an organizer in one place); session types and multi-valued person types; session editing and linking people to sessions in the admin; signed-out browsing with sign-in on save; per-organizer color; a reworked Home; account deletion (already built); a focused security pass and the compliance items above.

**Candidates to cut or defer if time runs out:** private Contacts (already built, keep unless it blocks), the Attendees directory (already deferred), a staging environment, rate limiting, per-platform validation for any new organizer links beyond https-only, the onboarding form as code (use a third-party form tool; no code).
