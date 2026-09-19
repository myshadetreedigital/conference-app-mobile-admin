-- Adds a LinkedIn link to speakers and makes the database refuse any
-- speaker link that isn't an https URL.
--
-- The admin app validates each link against its platform's URL rules and
-- stores the canonical https URL (src/lib/speaker-links.ts). This CHECK is
-- the backstop: even a write that bypasses the admin app (a direct API
-- call, a future admin tool) can't store javascript:, data:, http: or any
-- other scheme that the mobile app would later open.
--
-- NOT VALID: applies to new and updated rows only, so this can't fail on a
-- row written before the rule existed. Run
--   alter table public.speakers validate constraint speakers_links_https;
-- once you've confirmed no old rows hold anything but null or https URLs.
--
-- (The Skool column is dropped separately, in 0018, after the mobile app
-- stops selecting it.)

alter table public.speakers
  add column if not exists linkedin text;

alter table public.speakers
  drop constraint if exists speakers_links_https;

alter table public.speakers
  add constraint speakers_links_https check (
    (website_url is null or (website_url ~ '^https://[^[:space:]]+$' and char_length(website_url) <= 2048)) and
    (instagram   is null or (instagram   ~ '^https://[^[:space:]]+$' and char_length(instagram)   <= 2048)) and
    (facebook    is null or (facebook    ~ '^https://[^[:space:]]+$' and char_length(facebook)    <= 2048)) and
    (youtube     is null or (youtube     ~ '^https://[^[:space:]]+$' and char_length(youtube)     <= 2048)) and
    (tiktok      is null or (tiktok      ~ '^https://[^[:space:]]+$' and char_length(tiktok)      <= 2048)) and
    (linkedin    is null or (linkedin    ~ '^https://[^[:space:]]+$' and char_length(linkedin)    <= 2048)) and
    (patreon     is null or (patreon     ~ '^https://[^[:space:]]+$' and char_length(patreon)     <= 2048)) and
    (twitch      is null or (twitch      ~ '^https://[^[:space:]]+$' and char_length(twitch)      <= 2048)) and
    (discord     is null or (discord     ~ '^https://[^[:space:]]+$' and char_length(discord)     <= 2048))
  ) not valid;
