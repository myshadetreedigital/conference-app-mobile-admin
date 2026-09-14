-- Core tenancy tables: profiles (one per auth user), organizations
-- (paying client), events (tenant boundary, one live at a time per
-- org), admin_memberships (links a user to an org with a role).
-- See docs/PRODUCT-DECISIONS.md for the rules these encode.

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  created_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null default '',
  email text not null default '',
  address text not null default '',
  flagged_duplicate_of uuid references public.organizations (id),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create table public.admin_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'admin', 'editor')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  slug text not null unique,
  status text not null default 'draft' check (status in ('draft', 'live', 'archived')),
  logo_url text,
  primary_color text,
  background_color text,
  text_color text,
  created_at timestamptz not null default now()
);

-- Only one live event per organization at a time — admin-controlled
-- via Publish/Archive, not date-derived (see PRODUCT-DECISIONS.md).
create unique index events_one_live_per_org
  on public.events (organization_id)
  where status = 'live';
