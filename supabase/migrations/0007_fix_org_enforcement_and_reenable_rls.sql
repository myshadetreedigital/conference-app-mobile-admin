-- The "one organization per admin" rule was enforced via an RLS
-- INSERT policy that subqueried a different table
-- (admin_memberships). That specific shape was proven broken through
-- direct testing (an equivalent-shaped policy with no cross-table
-- subquery, on personal_contacts, worked correctly; this one didn't,
-- for a reason that was never conclusively identified). Rather than
-- keep debugging that exact mechanism, this replaces it with a
-- unique constraint — the same category of tool already used
-- successfully for "one live event per org" (events_one_live_per_org)
-- per ARCHITECTURE.md's own stated preference for enforcing data
-- integrity rules at the database level via constraints/indexes.

-- A user can have at most one admin_memberships row, period — this
-- IS the "one org per admin" rule, enforced as a plain uniqueness
-- constraint instead of a policy boolean.
create unique index admin_memberships_one_per_user
  on public.admin_memberships (user_id);

-- Simplify the organizations insert policy to match the exact shape
-- already proven to work (a single self-contained condition, no
-- cross-table subquery). The one-per-admin rule is now enforced by
-- the unique index above: if a user already has a membership, the
-- handle_new_organization() trigger's insert into admin_memberships
-- will fail the unique constraint and roll back the whole
-- organization insert with it.
drop policy if exists "organizations: create if no existing membership" on public.organizations;
create policy "organizations: create if no existing membership" on public.organizations
  for insert
  with check (created_by = auth.uid());

-- Re-enable RLS on every table (it was disabled entirely as a
-- temporary unblock during debugging).
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.admin_memberships enable row level security;
alter table public.events enable row level security;
alter table public.speakers enable row level security;
alter table public.sponsors enable row level security;
alter table public.sessions enable row level security;
alter table public.session_speakers enable row level security;
alter table public.bookmarks enable row level security;
alter table public.personal_contacts enable row level security;

-- Cleanup: the temporary diagnostic function from the investigation
-- is no longer needed.
drop function if exists public.debug_whoami();
