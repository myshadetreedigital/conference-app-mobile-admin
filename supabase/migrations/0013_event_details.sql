-- Event detail fields for the admin event page: tagline/short about
-- excerpt, location/address, and event dates (date-only — a coarser
-- grain than sessions' precise timestamptz starts_at/ends_at, since
-- this is "the event runs Sept 15-17", not a specific session time).
alter table public.events
  add column tagline text not null default '',
  add column description text not null default '',
  add column location text not null default '',
  add column starts_at date,
  add column ends_at date;
