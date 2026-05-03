create extension if not exists pgcrypto;

create table if not exists public.auth_users (
  id text primary key,
  name text not null,
  username text not null unique,
  role text not null check (role in ('admin', 'client')),
  insurer_id text not null,
  insurer_name text not null,
  built_in boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  password_hash text not null
);

create table if not exists public.auth_sessions (
  token text primary key,
  user_id text not null references public.auth_users(id) on delete cascade,
  created_at timestamptz not null,
  last_seen_at timestamptz not null,
  expires_at timestamptz not null
);

create index if not exists auth_users_username_idx on public.auth_users (username);
create index if not exists auth_sessions_user_id_idx on public.auth_sessions (user_id);
create index if not exists auth_sessions_expires_at_idx on public.auth_sessions (expires_at);

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  imei_serial text not null unique,
  serial_number text,
  device_name text not null,
  brand text,
  device_type text,
  last_fetched_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.claims (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete cascade,
  external_id text,
  date_of_loss timestamptz,
  claim_amount numeric(12, 2) not null default 0,
  outcome text not null check (outcome in ('APPROVED', 'REJECTED', 'PENDING')),
  reason text,
  insurer text not null,
  source text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists claims_external_id_unique
  on public.claims (external_id)
  where external_id is not null;

create unique index if not exists claims_dedupe_fingerprint
  on public.claims (device_id, date_of_loss, claim_amount, outcome, insurer, source, coalesce(reason, ''));

create index if not exists claims_device_id_idx on public.claims (device_id);
create index if not exists devices_last_fetched_at_idx on public.devices (last_fetched_at desc);

create table if not exists public.dashboard_claims (
  id uuid primary key default gen_random_uuid(),
  imei text not null,
  claim_amount numeric(12, 2) not null default 0,
  status text not null,
  created_at timestamptz not null default timezone('utc', now()),
  insurer_id text not null,
  user_id text not null
);

create table if not exists public.dashboard_searches (
  id uuid primary key default gen_random_uuid(),
  imei text not null,
  searched_at timestamptz not null default timezone('utc', now()),
  result_found boolean not null default false,
  insurer_id text not null,
  user_id text not null
);

alter table public.dashboard_claims
  add column if not exists user_id text;

alter table public.dashboard_searches
  add column if not exists user_id text;

create index if not exists dashboard_claims_insurer_created_idx
  on public.dashboard_claims (insurer_id, created_at desc);

create index if not exists dashboard_searches_insurer_searched_idx
  on public.dashboard_searches (insurer_id, searched_at desc);

create index if not exists dashboard_claims_insurer_user_created_idx
  on public.dashboard_claims (insurer_id, user_id, created_at desc);

create index if not exists dashboard_searches_insurer_user_searched_idx
  on public.dashboard_searches (insurer_id, user_id, searched_at desc);
