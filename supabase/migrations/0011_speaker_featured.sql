-- Lets admins mark a speaker as "featured" for display prominence in
-- the mobile app (e.g. a Featured filter on the speaker list).
alter table public.speakers
  add column featured boolean not null default false;
