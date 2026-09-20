-- More Info rows can now use a much larger set of icons (about 110, chosen in the
-- admin app's icon picker). The admin app validates the icon name against its own
-- list, and the mobile app draws any name it doesn't recognise as the information
-- icon, so the database no longer needs to enumerate the allowed names — which
-- meant a migration for every icon added. It now only checks that the value is a
-- well-formed name: lower-case words joined by hyphens, at most 40 characters.
--
-- The original CHECK (0012, widened in 0017) was inline on the column, so Postgres
-- named it event_info_sections_icon_check. Every icon stored so far already fits
-- the new rule.
alter table public.event_info_sections
  drop constraint if exists event_info_sections_icon_check;

alter table public.event_info_sections
  drop constraint if exists event_info_sections_icon_format;

alter table public.event_info_sections
  add constraint event_info_sections_icon_format
  check (icon ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(icon) <= 40);
