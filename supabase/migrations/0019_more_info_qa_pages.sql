-- Q&A pages for the mobile app's More Info screen.
--
-- A More Info row now has a page style: 'text' (a page of formatted text, as
-- before) or 'qa' (a static page of numbered question-and-answer pairs, each on
-- an alternating background band). A row that opens an existing screen
-- (link_target) is always 'text'.
--
-- The pairs live in their own table so each one is a separate, orderable
-- record instead of Markdown inside one text field.

alter table public.event_info_sections
  add column if not exists page_style text not null default 'text'
    check (page_style in ('text', 'qa'));

-- Lets an entry reference (section, event) together, so an entry can never
-- point at a section that belongs to a different event.
alter table public.event_info_sections
  drop constraint if exists event_info_sections_id_event_key;

alter table public.event_info_sections
  add constraint event_info_sections_id_event_key unique (id, event_id);

create table if not exists public.event_info_qa_entries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  section_id uuid not null,
  -- 0-based order within the section; the app sorts by this, then created_at.
  position integer not null default 0,
  question text not null check (char_length(question) between 1 and 300),
  -- Plain text with the small formatting subset (**bold**, [link](https://…)).
  -- Links are validated by the admin app when saved and re-checked by the
  -- mobile app when shown.
  answer text not null default '' check (char_length(answer) <= 5000),
  created_at timestamptz not null default now(),
  foreign key (section_id, event_id)
    references public.event_info_sections (id, event_id) on delete cascade
);

create index if not exists event_info_qa_entries_section_position_idx
  on public.event_info_qa_entries (section_id, position);

alter table public.event_info_qa_entries enable row level security;

drop policy if exists "event_info_qa_entries: public read" on public.event_info_qa_entries;
create policy "event_info_qa_entries: public read" on public.event_info_qa_entries
  for select using (true);

drop policy if exists "event_info_qa_entries: admins write" on public.event_info_qa_entries;
create policy "event_info_qa_entries: admins write" on public.event_info_qa_entries
  for all using (is_event_admin(event_id)) with check (is_event_admin(event_id));

-- A row can open any of these existing app screens (tabs) instead of its own page.
-- Home and More Info itself are deliberately not offered. The CHECK from 0017 was
-- inline on the column, so Postgres named it event_info_sections_link_target_check.
alter table public.event_info_sections
  drop constraint if exists event_info_sections_link_target_check;

alter table public.event_info_sections
  add constraint event_info_sections_link_target_check
  check (link_target is null or link_target in ('speakers', 'schedule', 'sponsors', 'contacts'));
