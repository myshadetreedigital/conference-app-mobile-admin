# Security review — both apps (2026-09-20)

Follow-up to `SECURITY-AUDIT.md` (2026-09-16), covering what was added since: speaker links, More Info (text/Q&A pages, HTML filter, icons), location block, session editing and speaker linking, event time zone, and the mobile app. Method: reading the code, migrations and policies; `npm audit` in both repos; checks of the live project with the public (anon) key only, read-only. Nothing was tested against the hosted admin app beyond that.

## Findings and what was done

| # | Severity | Finding | Status |
|---|---|---|---|
| 1 | Medium | **Contact limits lived only in the phone.** The cap of 10 contacts and the field sizes were checked by the app, not the database, so anyone with a login could store unlimited rows of unlimited size through the API. | **Fixed in migration `0022`** (limit trigger + length checks; the phone's inputs stop at the same lengths). *Needs `0022` applied.* |
| 2 | Low | **A session could be linked to another event's speaker** by calling the API directly (the policy checked the session's event, not the speaker's). The admin app already rejected it. | **Fixed in `0022`.** *Needs `0022` applied.* |
| 3 | Medium | **`delete-account` would delete an organizer's login.** Admin and attendee accounts share one login system, so an organizer signed in on the phone could delete their account and orphan their organization. | **Fixed in the function source** (refuses accounts with an admin membership). *Needs the function redeployed.* |
| 4 | Low | **`delete-account` imported an unpinned supabase-js from esm.sh**, so whatever that CDN served next would run beside the service-role key. | **Fixed:** pinned to `2.49.4`. *Redeploy, and check the version is available and the function still works.* |
| 5 | Medium | **No browser security headers on the admin app.** | **Fixed in `next.config.ts`:** `X-Frame-Options`, `frame-ancestors 'none'`, `nosniff`, referrer and permissions policies, HSTS. *Confirm after the deploy with `curl -I` on the hosted admin.* |
| 6 | Low | **No Content-Security-Policy for scripts** on the admin app. Next.js needs a per-request nonce for its inline scripts. | Not done: a separate piece of work. There is no `dangerouslySetInnerHTML` anywhere, which is what makes this low. |
| 7 | Medium | **Open admin registration.** Anyone can register on the admin site, create an organization and events, and upload images (5 MB each) to the public media bucket. Their writes are confined to their own organization by RLS, but it is free public hosting for images. | Accepted for the conference app. **The festival project should close registration** (only the owner adds content). |
| 8 | Low | **Sign-up needs no email confirmation** (the send-email hook only handles password reset). Fake or mistyped addresses can register. | Accepted; matters more once browsing is sign-in-free. Consider enabling confirmation before publishing. |
| 9 | Low | **The phone stores its login session in AsyncStorage**, not the OS keychain. Needs a compromised device to matter. | Recommended, not done: Supabase's encrypted-SecureStore adapter. |
| 10 | Low | **`npm audit` in the mobile repo reports 14 moderate items**, all from two packages (`decode-uri-component` DoS through `expo-router`'s query-string; `uuid` bounds check through Expo's build-time `xcode` plugin). The admin repo reports none. | Not fixed: the only fix offered is `npm audit fix --force` (breaking, downgrades Expo). Neither is reachable in a way that matters here (a crafted URL can at worst stall one screen; the other is build tooling). Re-check when Expo publishes a patch. |
| 11 | Info | The send-email hook logs request headers when a signature fails. They hold no secrets (signature, id, timestamp). | Accepted. |

## Checked and fine

- **RLS on every table**, including the newer `event_info_sections` and `event_info_qa_entries` (public read; write only for `is_event_admin(event_id)`, with a matching `with check`). Personal data (`profiles`, `bookmarks`, `personal_contacts`) is own-only.
- **Every admin server action** calls `requireUser()` (or is a login/register/reset action by nature). The event id comes from the URL and is enforced by RLS and by the storage policies; ids in forms (session, sponsor, speaker) only work on rows the caller administers.
- **Uploads:** paths are namespaced by event and the storage policies check `is_event_admin` on that segment; images only, 5 MB.
- **Links and rich text:** https-only checks, per-platform speaker links, the HTML allowlist filter (server) and the tolerant reader that re-checks every link (phone); database CHECKs on link columns and icon names.
- **Keys:** the phone holds only the anon key (decoded: role `anon`); no service-role key in either repo or its history; `.env*` is git-ignored; the service-role key exists only inside the edge function.
- **No `dangerouslySetInnerHTML`, `eval`, or unsafe `rpc()`** in the admin app.

## Things only the owner can check (Supabase dashboard)

Not visible from the code. Open each and confirm:

1. **Authentication → Providers → Email:** minimum password length (8+), and whether to turn on "Confirm email".
2. **Authentication → Attack protection:** enable leaked-password protection, and CAPTCHA if sign-up abuse appears.
3. **Authentication → URL configuration:** the site URL and redirect list contain only your real domains.
4. **Authentication → Rate limits:** leave the defaults on.
5. **Project Settings → API:** the `service_role` key has never been in a client bundle or a chat; rotate it if in doubt.
6. **Storage:** the `event-media` bucket still shows image types and the 5 MB limit.
7. **Database → Backups:** point-in-time recovery or daily backups on. Production is the only environment.
8. **Edge Functions → delete-account:** redeploy after this change and confirm "Verify JWT" is on.

## Not done (out of scope for this pass)

A staging environment; rate limiting on the admin login (Supabase's built-in limits apply); a penetration test of the hosted apps; CSP (item 6); secure token storage on the phone (item 9).
