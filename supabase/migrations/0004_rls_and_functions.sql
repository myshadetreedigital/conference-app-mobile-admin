-- Row Level Security throughout: default-deny, explicit grants.
-- security definer functions are narrow escape hatches that return
-- only the minimum needed data (see ARCHITECTURE.md).

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

-- ── Helper functions ────────────────────────────────────────────────

create function public.is_org_admin(p_organization_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from admin_memberships
    where organization_id = p_organization_id and user_id = auth.uid()
  );
$$;

create function public.is_event_admin(p_event_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from events e
    join admin_memberships m on m.organization_id = e.organization_id
    where e.id = p_event_id and m.user_id = auth.uid()
  );
$$;

-- Bypasses normal per-tenant visibility (an onboarding user has no
-- membership yet, so can't otherwise see any organizations) but
-- returns only a candidate match id — never another org's data.
create function public.find_possible_duplicate_org(p_name text, p_phone text, p_email text)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  with candidate as (
    select trim(p_name) as name, trim(p_phone) as phone, trim(p_email) as email
  ),
  scored as (
    select
      o.id,
      (lower(o.name) = lower(c.name))::int
      + (o.phone <> '' and c.phone <> ''
         and regexp_replace(o.phone, '\D', '', 'g') = regexp_replace(c.phone, '\D', '', 'g'))::int
      + (o.email <> '' and c.email <> '' and lower(o.email) = lower(c.email))::int
        as match_count
    from organizations o, candidate c
  )
  select id from scored where match_count >= 2 order by match_count desc limit 1;
$$;

-- ── Triggers ─────────────────────────────────────────────────────────

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.handle_new_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.admin_memberships (organization_id, user_id, role)
  values (new.id, auth.uid(), 'owner');
  return new;
end;
$$;

create trigger on_organization_created
  after insert on public.organizations
  for each row execute function public.handle_new_organization();

-- ── Policies: profiles ──────────────────────────────────────────────

create policy "profiles: read own" on public.profiles
  for select using (id = auth.uid());

create policy "profiles: update own" on public.profiles
  for update using (id = auth.uid());

-- ── Policies: organizations ─────────────────────────────────────────

create policy "organizations: admins read own" on public.organizations
  for select using (is_org_admin(id));

-- One organization per admin account — enforced here, not just
-- hidden in the UI.
create policy "organizations: create if no existing membership" on public.organizations
  for insert with check (
    created_by = auth.uid()
    and not exists (select 1 from admin_memberships where user_id = auth.uid())
  );

create policy "organizations: admins update own" on public.organizations
  for update using (is_org_admin(id));

-- ── Policies: admin_memberships ─────────────────────────────────────

create policy "admin_memberships: read own" on public.admin_memberships
  for select using (user_id = auth.uid());

-- ── Policies: events ─────────────────────────────────────────────────

create policy "events: public read" on public.events
  for select using (true);

create policy "events: admins create" on public.events
  for insert with check (is_org_admin(organization_id));

create policy "events: admins update" on public.events
  for update using (is_org_admin(organization_id));

create policy "events: admins delete" on public.events
  for delete using (is_org_admin(organization_id));

-- ── Policies: speakers / sponsors / sessions / session_speakers ─────

create policy "speakers: public read" on public.speakers
  for select using (true);
create policy "speakers: admins write" on public.speakers
  for all using (is_event_admin(event_id)) with check (is_event_admin(event_id));

create policy "sponsors: public read" on public.sponsors
  for select using (true);
create policy "sponsors: admins write" on public.sponsors
  for all using (is_event_admin(event_id)) with check (is_event_admin(event_id));

create policy "sessions: public read" on public.sessions
  for select using (true);
create policy "sessions: admins write" on public.sessions
  for all using (is_event_admin(event_id)) with check (is_event_admin(event_id));

create policy "session_speakers: public read" on public.session_speakers
  for select using (true);
create policy "session_speakers: admins write" on public.session_speakers
  for all using (
    exists (select 1 from sessions s where s.id = session_id and is_event_admin(s.event_id))
  );

-- ── Policies: bookmarks / personal_contacts (private per user) ─────

create policy "bookmarks: own only" on public.bookmarks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "personal_contacts: own only" on public.personal_contacts
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
