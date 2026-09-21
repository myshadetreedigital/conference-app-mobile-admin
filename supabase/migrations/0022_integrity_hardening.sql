-- Two limits the apps already enforce, now also enforced by the database, because the
-- database is the only thing an attacker calling the API directly can't skip (RLS is the
-- security boundary here; there is no API server in between).

-- 1. A session may only be linked to speakers of its own event.
--    The old policy checked that the caller administers the session's event, but not that
--    the speaker belongs to that event, so an admin could link a session to another
--    event's speaker id. (The admin app already rejects this; this closes the direct-API path.)
drop policy if exists "session_speakers: admins write" on public.session_speakers;
create policy "session_speakers: admins write" on public.session_speakers
  for all to authenticated
  using (
    exists (select 1 from public.sessions s where s.id = session_id and public.is_event_admin(s.event_id))
  )
  with check (
    exists (
      select 1
      from public.sessions s
      join public.speakers sp on sp.event_id = s.event_id
      where s.id = session_id and sp.id = speaker_id and public.is_event_admin(s.event_id)
    )
  );

-- 2. Personal contacts: at most 10 per person per event, and bounded field sizes.
--    Until now the cap of 10 lived only in the mobile app, so anyone with a login could
--    store unlimited rows of unlimited size through the API. The length checks are added
--    NOT VALID so existing rows are not re-checked; they apply to every new write.
create or replace function public.limit_personal_contacts()
returns trigger
language plpgsql
as $$
begin
  if (
    select count(*) from public.personal_contacts
    where owner_id = new.owner_id and event_id = new.event_id
  ) >= 10 then
    raise exception 'You can save up to 10 contacts.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists personal_contacts_limit on public.personal_contacts;
create trigger personal_contacts_limit
  before insert on public.personal_contacts
  for each row execute function public.limit_personal_contacts();

alter table public.personal_contacts
  drop constraint if exists personal_contacts_field_lengths;
alter table public.personal_contacts
  add constraint personal_contacts_field_lengths check (
    char_length(name) <= 200
    and char_length(email) <= 320
    and char_length(phone) <= 50
    and char_length(notes) <= 2000
  ) not valid;
