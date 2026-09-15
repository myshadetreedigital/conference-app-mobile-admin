-- Storage bucket for speaker photos and sponsor logos. Public bucket
-- (public: true) so getPublicUrl() works without auth for the mobile
-- app's read side — no dependency on any other table or trigger, by
-- design, after the organizations RETURNING/trigger incident.

insert into storage.buckets (id, name, public)
values ('event-media', 'event-media', true)
on conflict (id) do nothing;

create policy "event-media: public read"
  on storage.objects for select
  using (bucket_id = 'event-media');

create policy "event-media: authenticated upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'event-media');

create policy "event-media: authenticated delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'event-media');
