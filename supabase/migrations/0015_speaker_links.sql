-- Optional links shown on a speaker's page in the mobile app: a website
-- plus eight social platforms. Each value is either a full http(s) URL
-- or just a handle; the mobile app resolves both to a URL and ignores
-- anything it can't (see conference-app-mobile/src/lib/social-links.ts).
--
-- These columns were first added to the live database by hand, so this
-- migration uses "if not exists": it is a no-op there and creates them
-- on any database built from the migrations.
alter table public.speakers
  add column if not exists website_url text,
  add column if not exists instagram text,
  add column if not exists facebook text,
  add column if not exists youtube text,
  add column if not exists tiktok text,
  add column if not exists patreon text,
  add column if not exists twitch text,
  add column if not exists discord text,
  add column if not exists skool text;
