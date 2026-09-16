-- personal_contacts (0003) had no event_id — an attendee's saved
-- contact wasn't tied to which event they met that person at. No
-- application code has ever written to this table, so any existing
-- rows predate the feature entirely and have no real event to
-- backfill against — clearing them is safe (and correct: a contact
-- with no meaningful event association isn't valid data under the
-- new schema anyway).
delete from public.personal_contacts;

alter table public.personal_contacts
  add column event_id uuid not null references public.events (id) on delete cascade;
