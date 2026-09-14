-- One-time wipe of the first iteration's schema in this reused Supabase
-- project. Not a template for future migrations — see ARCHITECTURE.md's
-- Migrations rule: this file exists once, is never edited again, and
-- nothing like it should be added later.

drop table if exists public.attendees cascade;
drop table if exists public.bookmarks cascade;
drop table if exists public.session_speakers cascade;
drop table if exists public.sessions cascade;
drop table if exists public.sponsors cascade;
drop table if exists public.speakers cascade;
drop table if exists public.events cascade;
drop table if exists public.admin_memberships cascade;
drop table if exists public.organizations cascade;
drop table if exists public.profiles cascade;

drop function if exists public.is_org_admin(uuid) cascade;
drop function if exists public.is_event_admin(uuid) cascade;
drop function if exists public.find_possible_duplicate_org(text, text, text) cascade;
drop function if exists public.handle_new_organization() cascade;
drop function if exists public.handle_new_user() cascade;
