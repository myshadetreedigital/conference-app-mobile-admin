-- Content that belongs to an event: speakers, sessions, sponsors.
-- All public-read (the mobile app needs this, none of it is
-- sensitive), admin-write scoped to the owning org's admins.
-- No attendees table — see PRODUCT-DECISIONS.md: there is no
-- attendee directory in this product.

create table public.speakers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  title text not null default '',
  bio text not null default '',
  photo_url text,
  created_at timestamptz not null default now()
);

create table public.sponsors (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  tier text not null default 'a_la_carte'
    check (tier in ('diamond', 'platinum', 'gold', 'silver', 'bronze', 'a_la_carte')),
  logo_url text,
  website_url text,
  created_at timestamptz not null default now()
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  title text not null,
  description text not null default '',
  starts_at timestamptz,
  ends_at timestamptz,
  location text not null default '',
  created_at timestamptz not null default now()
);

create table public.session_speakers (
  session_id uuid not null references public.sessions (id) on delete cascade,
  speaker_id uuid not null references public.speakers (id) on delete cascade,
  primary key (session_id, speaker_id)
);
