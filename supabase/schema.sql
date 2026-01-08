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
  avatar_url text null,
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

alter table public.profiles
  add column if not exists avatar_url text;

do $$ begin
  create policy "profiles_select_own"
  on public.profiles for select
  using ( auth.uid() = id );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "profiles_select_admin"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) in ('admin', 'administrator')
    )
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "profiles_select_staff_directory"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) in ('admin', 'administrator', 'staff')
    )
    and lower(coalesce(role, '')) in ('admin', 'administrator', 'staff')
  );
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

-- Auto-create profiles on new Auth users (role clamped to student/educator)
create or replace function public.handle_auth_user_created_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb;
  raw_role text;
  resolved_role text;
  resolved_username text;
  resolved_name text;
  composed_name text;
begin
  meta := coalesce(new.raw_user_meta_data, '{}'::jsonb);

  raw_role := lower(coalesce(meta->>'accountType', meta->>'role', ''));
  resolved_role := case
    when raw_role = 'educator' then 'educator'
    when raw_role = 'student' then 'student'
    else 'student'
  end;

  resolved_username := nullif(btrim(meta->>'username'), '');
  if resolved_username is null then
    resolved_username := nullif(split_part(coalesce(new.email, ''), '@', 1), '');
  end if;

  resolved_name := nullif(btrim(meta->>'name'), '');
  if resolved_name is null then
    composed_name := btrim(concat_ws(
      ' ',
      nullif(btrim(meta->>'first_name'), ''),
      nullif(btrim(meta->>'last_name'), '')
    ));
    resolved_name := nullif(composed_name, '');
  end if;

  insert into public.profiles (id, email, username, name, role)
  values (
    new.id,
    new.email,
    resolved_username,
    coalesce(resolved_name, resolved_username, new.email),
    resolved_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_auth_user_created_profile();

-- Career Guidance question bank (used by the Career Guidance test + bank manager)
-- Note: If you already created this table without `updated_at`, run the `alter table` below.
create table if not exists public.cg_career_questions (
  id uuid not null default gen_random_uuid (),
  code text null,
  area text null,
  area_en text null,
  area_fr text null,
  area_ar text null,
  text_en text null,
  text_fr text null,
  text_ar text null,
  disc text null,
  bloom text null,
  un_goal text null,
  sort_index integer null,
  area_sort integer null,
  updated_at timestamptz not null default now(),
  constraint cg_career_questions_pkey primary key (id)
);

alter table public.cg_career_questions
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.cg_career_questions_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_cg_career_questions_updated_at on public.cg_career_questions;
create trigger trg_cg_career_questions_updated_at
before update on public.cg_career_questions for each row
execute function public.cg_career_questions_set_updated_at();

-- SAT Reading Competition question bank (RW-only, used by staff-facing bank tab + RW-only SAT mode)
create table if not exists public.cg_sat_reading_competition_questions (
  id uuid not null default gen_random_uuid (),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  subject text not null default 'ENGLISH',
  difficulty text null,
  skill text null,
  question_type text not null default 'mcq',
  question text not null,
  passage text null,
  answer_a text null,
  answer_b text null,
  answer_c text null,
  answer_d text null,
  correct text null,
  unit text null,
  lesson text null,
  constraint cg_sat_reading_competition_questions_pkey primary key (id),
  constraint cg_sat_reading_competition_questions_subject_check check (subject = 'ENGLISH')
);

create index if not exists cg_sat_reading_competition_questions_created_at_idx
  on public.cg_sat_reading_competition_questions (created_at);

create or replace function public.cg_sat_reading_competition_questions_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_cg_sat_reading_competition_questions_updated_at on public.cg_sat_reading_competition_questions;
create trigger trg_cg_sat_reading_competition_questions_updated_at
before update on public.cg_sat_reading_competition_questions for each row
execute function public.cg_sat_reading_competition_questions_set_updated_at();

-- Bank Manager: toggle which banks are visible to staff
create table if not exists public.cg_bank_tab_visibility (
  bank_id text primary key,
  staff_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.cg_bank_tab_visibility_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_cg_bank_tab_visibility_updated_at on public.cg_bank_tab_visibility;
create trigger trg_cg_bank_tab_visibility_updated_at
before update on public.cg_bank_tab_visibility for each row
execute function public.cg_bank_tab_visibility_set_updated_at();

insert into public.cg_bank_tab_visibility (bank_id, staff_visible)
values
  ('math', true),
  ('english', true),
  ('tests', true),
  ('diagnostic', false),
  ('reading_competition', true),
  ('career', false),
  ('resources', true)
on conflict (bank_id) do nothing;

-- Global site settings (admin-controlled)
create table if not exists public.cg_site_settings (
  key text primary key,
  value boolean not null default true,
  updated_at timestamptz not null default now()
);

create or replace function public.cg_site_settings_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_cg_site_settings_updated_at on public.cg_site_settings;
create trigger trg_cg_site_settings_updated_at
before update on public.cg_site_settings for each row
execute function public.cg_site_settings_set_updated_at();

alter table public.cg_site_settings enable row level security;

do $$ begin
  create policy "cg_site_settings_read_all"
  on public.cg_site_settings for select
  using ( true );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "cg_site_settings_admin_insert"
  on public.cg_site_settings for insert
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "cg_site_settings_admin_update"
  on public.cg_site_settings for update
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
exception when duplicate_object then null; end $$;

insert into public.cg_site_settings (key, value)
values ('animations_enabled', true)
on conflict (key) do nothing;

-- Live test monitoring sessions (Career + SAT)
create table if not exists public.cg_live_test_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text null,
  participant_name text null,
  school text null,
  class_name text null,
  test_type text not null,
  status text not null default 'in_progress',
  pause_reason text null,
  paused_at timestamptz null,
  answered_count integer not null default 0,
  total_questions integer null,
  started_at timestamptz not null default now(),
  finished_at timestamptz null,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cg_live_test_sessions_user_idx
  on public.cg_live_test_sessions (user_id);

create index if not exists cg_live_test_sessions_status_idx
  on public.cg_live_test_sessions (status);

create index if not exists cg_live_test_sessions_test_type_idx
  on public.cg_live_test_sessions (test_type);

create or replace function public.cg_live_test_sessions_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_cg_live_test_sessions_updated_at on public.cg_live_test_sessions;
create trigger trg_cg_live_test_sessions_updated_at
before update on public.cg_live_test_sessions
for each row execute function public.cg_live_test_sessions_set_updated_at();

alter table public.cg_live_test_sessions enable row level security;

do $$ begin
  create policy "cg_live_test_sessions_select_admin"
  on public.cg_live_test_sessions for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) in ('admin', 'administrator', 'staff')
    )
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "cg_live_test_sessions_select_own"
  on public.cg_live_test_sessions for select
  using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "cg_live_test_sessions_insert_own"
  on public.cg_live_test_sessions for insert
  with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "cg_live_test_sessions_update_own"
  on public.cg_live_test_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "cg_live_test_sessions_update_admin"
  on public.cg_live_test_sessions for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) in ('admin', 'administrator', 'staff')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) in ('admin', 'administrator', 'staff')
    )
  );
exception when duplicate_object then null; end $$;

-- Reading Competition events (staff scheduling)
create table if not exists public.cg_reading_competition_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz null,
  location text null,
  notes text null,
  created_by uuid null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.cg_reading_competition_events_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_cg_reading_competition_events_updated_at on public.cg_reading_competition_events;
create trigger trg_cg_reading_competition_events_updated_at
before update on public.cg_reading_competition_events
for each row execute function public.cg_reading_competition_events_set_updated_at();

-- Internal ticketing (staff <-> admin)
create table if not exists public.cg_internal_tickets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  status text not null default 'open',
  priority text not null default 'medium',
  category text null,
  due_at timestamptz null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_by_email text null,
  assigned_to uuid null references auth.users(id),
  assigned_to_email text null,
  closed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cg_internal_tickets
  add column if not exists due_at timestamptz;

create index if not exists cg_internal_tickets_created_by_idx
  on public.cg_internal_tickets (created_by);

create index if not exists cg_internal_tickets_status_idx
  on public.cg_internal_tickets (status);

create or replace function public.cg_internal_tickets_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_cg_internal_tickets_updated_at on public.cg_internal_tickets;
create trigger trg_cg_internal_tickets_updated_at
before update on public.cg_internal_tickets
for each row execute function public.cg_internal_tickets_set_updated_at();

create table if not exists public.cg_internal_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.cg_internal_tickets(id) on delete cascade,
  message text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_by_email text null,
  created_at timestamptz not null default now()
);

create index if not exists cg_internal_ticket_messages_ticket_idx
  on public.cg_internal_ticket_messages (ticket_id);

create index if not exists cg_internal_ticket_messages_created_at_idx
  on public.cg_internal_ticket_messages (created_at);

alter table public.cg_internal_tickets enable row level security;
alter table public.cg_internal_ticket_messages enable row level security;

do $$ begin
  create policy "cg_internal_tickets_select_admin"
  on public.cg_internal_tickets for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) in ('admin', 'administrator')
    )
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "cg_internal_tickets_select_staff"
  on public.cg_internal_tickets for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) = 'staff'
    )
    and (created_by = auth.uid() or assigned_to = auth.uid())
  );
exception when duplicate_object then null; end $$;

drop policy if exists "cg_internal_tickets_insert_staff_admin" on public.cg_internal_tickets;
do $$ begin
  create policy "cg_internal_tickets_insert_staff_admin"
  on public.cg_internal_tickets for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) in ('admin', 'administrator')
    )
    and created_by = auth.uid()
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "cg_internal_tickets_update_admin"
  on public.cg_internal_tickets for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) in ('admin', 'administrator')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) in ('admin', 'administrator')
    )
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "cg_internal_tickets_update_staff"
  on public.cg_internal_tickets for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) = 'staff'
    )
    and (created_by = auth.uid() or assigned_to = auth.uid())
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) = 'staff'
    )
    and (created_by = auth.uid() or assigned_to = auth.uid())
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "cg_internal_tickets_delete_admin"
  on public.cg_internal_tickets for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) in ('admin', 'administrator')
    )
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "cg_internal_ticket_messages_select_admin"
  on public.cg_internal_ticket_messages for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) in ('admin', 'administrator')
    )
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "cg_internal_ticket_messages_select_staff"
  on public.cg_internal_ticket_messages for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) = 'staff'
    )
    and exists (
      select 1 from public.cg_internal_tickets t
      where t.id = ticket_id
        and (t.created_by = auth.uid() or t.assigned_to = auth.uid())
    )
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "cg_internal_ticket_messages_insert_admin"
  on public.cg_internal_ticket_messages for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) in ('admin', 'administrator')
    )
    and created_by = auth.uid()
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "cg_internal_ticket_messages_insert_staff"
  on public.cg_internal_ticket_messages for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) = 'staff'
    )
    and created_by = auth.uid()
    and exists (
      select 1 from public.cg_internal_tickets t
      where t.id = ticket_id
        and (t.created_by = auth.uid() or t.assigned_to = auth.uid())
    )
  );
exception when duplicate_object then null; end $$;

-- Internal communication (staff/admin shared channel)
create table if not exists public.cg_internal_messages (
  id uuid primary key default gen_random_uuid(),
  body text not null,
  message_type text not null default 'team',
  recipient_id uuid null references auth.users(id) on delete set null,
  recipient_email text null,
  recipient_name text null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_by_email text null,
  created_by_name text null,
  created_at timestamptz not null default now()
);

alter table public.cg_internal_messages
  add column if not exists message_type text not null default 'team';

alter table public.cg_internal_messages
  add column if not exists recipient_id uuid null references auth.users(id) on delete set null;

alter table public.cg_internal_messages
  add column if not exists recipient_email text null;

alter table public.cg_internal_messages
  add column if not exists recipient_name text null;

create index if not exists cg_internal_messages_created_at_idx
  on public.cg_internal_messages (created_at desc);

create index if not exists cg_internal_messages_created_by_idx
  on public.cg_internal_messages (created_by);

create index if not exists cg_internal_messages_recipient_idx
  on public.cg_internal_messages (recipient_id);

create index if not exists cg_internal_messages_type_idx
  on public.cg_internal_messages (message_type);

create table if not exists public.cg_internal_message_reads (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.cg_internal_message_reads_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_cg_internal_message_reads_updated_at on public.cg_internal_message_reads;
create trigger trg_cg_internal_message_reads_updated_at
before update on public.cg_internal_message_reads
for each row execute function public.cg_internal_message_reads_set_updated_at();

alter table public.cg_internal_messages enable row level security;
alter table public.cg_internal_message_reads enable row level security;

do $$ begin
  create policy "cg_internal_messages_select_staff_admin"
  on public.cg_internal_messages for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) in ('admin', 'administrator', 'staff')
    )
    and (
      message_type = 'team'
      or created_by = auth.uid()
      or recipient_id = auth.uid()
    )
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "cg_internal_messages_insert_staff_admin"
  on public.cg_internal_messages for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) in ('admin', 'administrator', 'staff')
    )
    and created_by = auth.uid()
    and (
      (message_type = 'team' and recipient_id is null)
      or (message_type = 'direct' and recipient_id is not null)
    )
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "cg_internal_messages_delete_admin"
  on public.cg_internal_messages for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) in ('admin', 'administrator')
    )
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "cg_internal_messages_delete_own"
  on public.cg_internal_messages for delete
  using (
    created_by = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) in ('admin', 'administrator', 'staff')
    )
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "cg_internal_message_reads_select_self"
  on public.cg_internal_message_reads for select
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) in ('admin', 'administrator', 'staff')
    )
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "cg_internal_message_reads_insert_self"
  on public.cg_internal_message_reads for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) in ('admin', 'administrator', 'staff')
    )
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "cg_internal_message_reads_update_self"
  on public.cg_internal_message_reads for update
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) in ('admin', 'administrator', 'staff')
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) in ('admin', 'administrator', 'staff')
    )
  );
exception when duplicate_object then null; end $$;

-- Reading Competition access (QR check-in)
create table if not exists public.cg_reading_competition_access (
  event_id uuid not null references public.cg_reading_competition_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text null,
  unlocked boolean not null default true,
  scanned_by uuid null references auth.users(id),
  scanned_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index if not exists cg_reading_competition_access_event_idx
  on public.cg_reading_competition_access (event_id);

create index if not exists cg_reading_competition_access_user_idx
  on public.cg_reading_competition_access (user_id);

alter table public.cg_reading_competition_events enable row level security;

alter table public.cg_reading_competition_access enable row level security;

do $$ begin
  create policy "cg_rc_access_select_own"
  on public.cg_reading_competition_access for select
  using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "cg_rc_access_staff_all"
  on public.cg_reading_competition_access for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) in ('admin', 'administrator', 'staff')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) in ('admin', 'administrator', 'staff')
    )
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "cg_rc_events_staff_all"
  on public.cg_reading_competition_events for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) in ('admin', 'administrator', 'staff')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) in ('admin', 'administrator', 'staff')
    )
  );
exception when duplicate_object then null; end $$;

-- SAT Training: live interactive class sessions (not quizzes/tests)
create table if not exists public.cg_class_live_sessions (
  class_name text primary key,
  is_active boolean not null default false,
  teacher_email text null,
  title text null,
  url text null,
  state jsonb null,
  started_at timestamptz not null default now(),
  ended_at timestamptz null,
  updated_at timestamptz not null default now()
);

create or replace function public.cg_class_live_sessions_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_cg_class_live_sessions_updated_at on public.cg_class_live_sessions;
create trigger trg_cg_class_live_sessions_updated_at
before update on public.cg_class_live_sessions for each row
execute function public.cg_class_live_sessions_set_updated_at();

-- Storage bucket for profile avatars
insert into storage.buckets (id, name, public)
values ('profile-avatars', 'profile-avatars', true)
on conflict (id) do nothing;

do $$ begin
  create policy "profile avatars public read"
  on storage.objects for select
  using (bucket_id = 'profile-avatars');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "profile avatars own insert"
  on storage.objects for insert
  with check (
    bucket_id = 'profile-avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "profile avatars own update"
  on storage.objects for update
  using (
    bucket_id = 'profile-avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );
exception when duplicate_object then null; end $$;
