-- Temporary diagnostic function — not security definer, so this
-- returns exactly what Postgres sees auth.uid() as for the calling
-- request. Delete this migration (and the function) once the
-- organizations-insert investigation is resolved.
create function public.debug_whoami()
returns uuid
language sql
stable
as $$
  select auth.uid();
$$;
