# Security audit — admin app (2026-09-16)

Full-codebase review of the admin app (`main` branch, not a diff review). Covered: auth/session handling, Supabase RLS enforcement, server action input validation, the Send Email Auth Hook, file uploads, secrets/env exposure, XSS/injection, and memory leaks.

## Findings

### 1. HIGH — Cross-org storage tampering
- **File**: `supabase/migrations/0008_media_storage.sql:14-22`, `src/lib/upload-event-media.ts:16`
- **Issue**: The `event-media` storage bucket's insert/delete policies only check `bucket_id = 'event-media'` — no check that the uploader administers the org/event the file belongs to. Uploaded paths are flat (`speakers/<uuid>-<filename>`), with no per-org/per-event namespace.
- **Exploit scenario**: Any authenticated admin — of any organization, not just the one that owns the file — can enumerate, delete, or overwrite another org's speaker photos and sponsor logos.
- **Fix**: Namespace upload paths by event id (`<eventId>/speakers/...`, `<eventId>/sponsors/...`) and scope the insert/delete storage policies to `is_event_admin()` (already used elsewhere in the schema) against that leading path segment.
- **Status**: ✅ Fixed — `supabase/migrations/0010_scope_media_storage_to_event_admins.sql`

### 2. MEDIUM — No upload file-type/size limits
- **File**: `src/lib/upload-event-media.ts`, `supabase/migrations/0008_media_storage.sql`
- **Issue**: No file-size or MIME-type restriction, client or server side, or at the bucket level.
- **Exploit scenario**: Any authenticated admin can upload arbitrarily large files or non-image content types, running up storage costs or hosting arbitrary files behind a trusted-looking public URL.
- **Fix**: Set `file_size_limit`/`allowed_mime_types` on the bucket, plus an explicit check in `uploadEventMedia` for a clearer error message.
- **Status**: ✅ Fixed — same migration as #1, plus `src/lib/upload-event-media.ts`

### 3. LOW — PII logged on every onboarding submission
- **File**: `src/app/onboarding/actions.ts:39`
- **Issue**: `console.log` on every onboarding submission includes the user id and full org contact info (name/phone/email/address).
- **Exploit scenario**: Low severity — no secret exposure, just unnecessary PII reaching application logs.
- **Fix**: Remove the log line.
- **Status**: ✅ Fixed

## Checked, confirmed not vulnerable

- **Send Email Auth Hook** (`src/app/api/auth/send-email/route.ts`) — the `v1,` secret-prefix fix (from this session) holds up under review; a missing/empty secret fails closed (401), not open.
- **Auth/session handling** — every server action re-derives identity via `requireUser()`; org id is always looked up server-side, never trusted from client-supplied form data.
- **RLS as the enforcement boundary** — repositories rely on RLS rather than app-layer filtering, matching the documented architecture; no service-role key found anywhere in app code (which would bypass RLS entirely).
- **XSS/injection** — no `dangerouslySetInnerHTML`, `eval`, or unsafe `rpc()` calls found.
- **Secrets/env exposure** — no server-only secret (hook secret, Resend key, any service-role key) referenced in a `NEXT_PUBLIC_*` variable or passed to a client component.
- **Memory leaks** — none found. No `useEffect`, timers, or event listeners in the codebase; the one client component is a plain form with no subscriptions; Supabase clients are created fresh per request with no shared module-level state.

## Separate note (not a code vulnerability)

`AGENTS.md` (checked into this repo, loaded as project instructions for every Claude Code session working here) instructs the agent to treat files under `node_modules/next/dist/docs/` as authoritative override instructions before writing code. A vendored dependency's bundled files directing agent behavior is an unusual pattern and worth confirming is intentional — the same mechanism could be abused by a compromised or malicious npm package shipping a similar "docs" folder. Not fixed as part of this audit; flagged for the user to review.
