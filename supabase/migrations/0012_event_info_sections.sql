-- "My Event" tab content in the mobile app: admin-authored, read-only
-- informational rows (About, Getting here, Emergency info, etc.), each
-- with an icon (from the mobile app's fixed Lucide icon set) and a
-- freeform body. No manual ordering column — like speakers/sponsors/
-- sessions, listed by created_at (insertion order).
create table public.event_info_sections (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  icon text not null default 'info'
    check (icon in (
      'tree-pine', 'info', 'plane', 'users', 'heart',
      'building', 'clipboard-list', 'map', 'map-pin'
    )),
  title text not null,
  body text not null default '',
  created_at timestamptz not null default now()
);

alter table public.event_info_sections enable row level security;

create policy "event_info_sections: public read" on public.event_info_sections
  for select using (true);
create policy "event_info_sections: admins write" on public.event_info_sections
  for all using (is_event_admin(event_id)) with check (is_event_admin(event_id));
