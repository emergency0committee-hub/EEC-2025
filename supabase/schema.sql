-- Supabase schema for consolidated submissions

-- enable pgcrypto if you want gen_random_uuid(); otherwise use identity/bigserial
-- create extension if not exists pgcrypto;

create table if not exists public.submissions (
  id bigint generated always as identity primary key,
  ts timestamptz not null default now(),
  profile jsonb,
  answers jsonb,
  radar_data jsonb,
  area_percents jsonb,
  pillar_agg jsonb,
  pillar_counts jsonb,
  top_codes text[],
  riasec_code text
);

-- Optional RLS (adjust to your needs)
-- alter table public.submissions enable row level security;
-- create policy "anon read" on public.submissions for select using (true);
-- create policy "anon insert" on public.submissions for insert with check (true);

-- Profiles table to store login metadata (linked to auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  username text unique,
  name text,
  role text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_profiles_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.handle_profiles_updated_at();

-- Enable RLS and policies so users can manage their own profile
alter table public.profiles enable row level security;

do $$ begin
  create policy "profiles_select_own"
  on public.profiles for select
  using ( auth.uid() = id );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "profiles_insert_own"
  on public.profiles for insert
  with check ( auth.uid() = id );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "profiles_update_own"
  on public.profiles for update
  using ( auth.uid() = id )
  with check ( auth.uid() = id );
exception when duplicate_object then null; end $$;
