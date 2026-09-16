-- 0008 gave the event-media bucket's insert/delete policies no
-- ownership check at all (only bucket_id) — any authenticated admin
-- of ANY org could delete or overwrite ANY other org's speaker
-- photos / sponsor logos. Object paths are now namespaced as
-- <event_id>/<speakers|sponsors>/<uuid>-<filename> (see
-- upload-event-media.ts), so is_event_admin() — already used by the
-- speakers/sponsors table policies — can scope both operations to
-- admins of the owning event's org via the leading path segment.
drop policy "event-media: authenticated upload" on storage.objects;
drop policy "event-media: authenticated delete" on storage.objects;

create policy "event-media: event admins upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'event-media'
    and is_event_admin((storage.foldername(name))[1]::uuid)
  );

create policy "event-media: event admins delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'event-media'
    and is_event_admin((storage.foldername(name))[1]::uuid)
  );

-- No file-type/size limit existed at the bucket level, so any
-- authenticated admin could upload arbitrarily large or arbitrary-
-- type files. This only covers speaker/sponsor photo uploads.
update storage.buckets
set file_size_limit = 5242880, -- 5MB
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
where id = 'event-media';
