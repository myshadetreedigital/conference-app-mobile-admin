# Backlog

Bigger, open-ended product/UX questions get tracked here instead of
derailing whatever's being actively built.

## Open questions

- **Only `organizations` has a repository/service pair so far.** Events,
  sessions, speakers, sponsors, bookmarks, and personal_contacts still
  need the same treatment as they're built out — this file exists so
  that list doesn't get lost.
- **Admin roles beyond owner/editor**: `admin_memberships.role` supports
  `owner`/`admin`/`editor`, but no real permission differences are
  defined yet.
- **Password reset (OTP-code variant)**: needs `resetPasswordForEmail`
  + `verifyOtp({ type: 'recovery' })` built deliberately — Supabase's
  default recovery flow is a magic link, not a code.
- **Theme/branding editor UI**: `events` has the color/logo columns,
  no editor built yet.
- **Production email**: Supabase's built-in sender is rate-limited and
  meant for testing only — needs a real transactional provider before
  real attendees rely on it.
- **Staging Supabase project**: PRODUCT-DECISIONS.md commits to
  staging-first, but this reused project currently *is* production —
  a separate staging project should exist before real client data
  goes through this.
