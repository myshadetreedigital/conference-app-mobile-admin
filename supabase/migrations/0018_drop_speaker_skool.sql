-- Removes the Skool speaker link entirely (decided 2026-09-18: Skool has no
-- logo in any bundled icon set, so it isn't shown). The admin app stopped
-- offering it in 0016's release, and the mobile app no longer selects it.
--
-- Run this AFTER the mobile app version that no longer selects `skool` is in
-- use: PostgREST rejects a select that names a missing column, so an older
-- mobile build would fail to load speaker profiles.
--
-- Any value stored in this column is discarded.
alter table public.speakers
  drop column if exists skool;
