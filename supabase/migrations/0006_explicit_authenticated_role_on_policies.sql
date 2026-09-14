-- The organizations insert policy (and the other admin-write
-- policies) were created without an explicit `to authenticated`,
-- relying on the PostgreSQL default of PUBLIC. A brand-new,
-- correctly-authenticated user with no existing admin_memberships
-- row was still being rejected on insert (42501) with no data-based
-- explanation left standing — recreating these explicitly scoped to
-- `authenticated` to rule out a role-application gap.

drop policy "organizations: create if no existing membership" on public.organizations;
create policy "organizations: create if no existing membership" on public.organizations
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and not exists (select 1 from admin_memberships where user_id = auth.uid())
  );

drop policy "organizations: admins read own" on public.organizations;
create policy "organizations: admins read own" on public.organizations
  for select to authenticated using (is_org_admin(id));

drop policy "organizations: admins update own" on public.organizations;
create policy "organizations: admins update own" on public.organizations
  for update to authenticated using (is_org_admin(id));
