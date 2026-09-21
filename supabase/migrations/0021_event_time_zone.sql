-- Session times are stored as absolute moments (timestamptz), but until now nothing said
-- which clock an organizer meant when typing "9:00 AM": the admin app read it in the
-- hosting server's time zone (UTC) and the phone showed it in each phone's own zone, so
-- a morning session could show at the wrong hour. Each event now has a time zone
-- (an IANA name such as America/New_York): the admin app reads and shows session times
-- in it, and the phone shows them in it, whatever zone the phone is in.
--
-- Existing events get America/New_York. Sessions saved before this migration were read
-- as UTC, so they are open to being re-saved in the admin app, which now shows their
-- times in the event's zone. The database only checks the name is well-formed; the
-- admin app checks it is a real zone.
alter table public.events
  add column time_zone text not null default 'America/New_York';

alter table public.events
  add constraint events_time_zone_format
  check (time_zone ~ '^[A-Za-z][A-Za-z0-9_+-]*(/[A-Za-z0-9_+-]+)*$' and char_length(time_zone) <= 64);
