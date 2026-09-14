-- Data scoped to one attendee, never shared: bookmarked sessions, and
-- personal_contacts (the in-app address book of people they've met —
-- user-entered, not a pull from another user's account; see
-- PRODUCT-DECISIONS.md's MVP feature scope).

create table public.bookmarks (
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null references public.sessions (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, session_id)
);

create table public.personal_contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  email text not null default '',
  phone text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);
