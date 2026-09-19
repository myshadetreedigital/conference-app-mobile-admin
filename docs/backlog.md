# Backlog

Bigger, open-ended product/UX questions get tracked here instead of
derailing whatever's being actively built.

## Open questions

- **Only `organizations` has a repository/service pair so far.** Events,
  sessions, speakers, sponsors, bookmarks, and personal_contacts still
  need the same treatment as they're built out — this file exists so
  that list doesn't get lost.
- **LinkedIn speaker link**: add `linkedin` to the speaker social links —
  a new migration column, an entry in `SPEAKER_LINK_FIELDS`
  (`src/lib/speaker-links.ts`), the validation schema in
  `speaker-service.ts` (the `satisfies` check will flag it), and the mobile
  app's `SOCIAL_PLATFORMS` (`conference-app-mobile/src/lib/social-links.ts`).
- **Icons on speaker profiles**: show speaker links as brand icons instead
  of text labels. `MaterialCommunityIcons` (already in the mobile app) has
  Instagram, Facebook, YouTube, Patreon, Twitch, LinkedIn and a web icon,
  but not TikTok, Discord or Skool. FontAwesome6 has TikTok and Discord;
  Skool has no logo in any bundled set and needs a generic fallback.
- **"More Info" screen (replaces the My Event tab)**: named "More Info", with
  a circle-with-"i" tab icon and line (outline) icons on its rows; each row opens its own page with a back button to More. Reference
  screenshots: `conference-app-mobile/assets/images/IMG_6766.PNG`,
  `IMG_6767.PNG`, `IMG_6768.PNG`. Needs: a detail route for sections; more
  icons (`event_info_sections.icon` has a DB CHECK limited to 9 values, so
  it needs a migration plus the admin `EVENT_INFO_SECTION_ICONS` list and
  the mobile icon map); a Location block with a map (the `events` table has
  only a text `location`, no coordinates). Decided: the Speakers row links
  to the existing Speakers screen; Customer review is a rich-text page
  (bold, paragraphs, inline links), so section bodies need a safe formatting
  subset; the Location block is an admin-uploaded image of the area plus a
  tap that opens the address in Maps (no embedded map). Also decided: drop
  the Skool speaker link entirely and add LinkedIn (migration adds
  `linkedin`, drops `skool`; ship the mobile change before dropping the
  column, since mobile selects it).
- **Attendees directory + contact-card QR** — **DEFERRED: not in the first
  release** (decided 2026-09-18). Leave the Attendees row off the More screen
  for now. (A row on the More screen): lists
  everyone at the conference; tapping a person shows a card with their role
  and company, plus a button that pops up a contact-card (vCard) QR code.
  **This reverses PRODUCT-DECISIONS.md**, which says "There is no listing of
  attendees anywhere in the app" and "No attendee data is ever publicly
  readable" — update that doc once the privacy model is chosen (opt-in vs
  automatic). Needs: `role`/`company` (and the sharing choices) on profiles,
  a new RLS policy for reading other attendees, a profile-editing screen,
  and a QR library (`react-native-svg` is already installed). Not built.
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
