-- ============================================================
--  SecureTag — production schema (idempotent, safe to re-run)
--  Run in: Supabase Dashboard -> SQL Editor -> New query -> Run
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- profiles (1:1 with auth.users, holds role) ----------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text,
  role       text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now()
);

-- auto-create a profile whenever a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- backfill profiles for users who signed up before this migration
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

-- ---------- tags ----------
create table if not exists public.tags (
  id            text primary key,
  claimed       boolean not null default false,
  owner_user_id uuid references auth.users(id) on delete set null,
  owner_name    text,
  phone         text,
  car_model     text,
  plate_number  text,
  message       text,
  lost_mode     boolean not null default false,
  created_at    timestamptz not null default now(),
  claimed_at    timestamptz
);
alter table public.tags add column if not exists owner_user_id uuid references auth.users(id) on delete set null;
alter table public.tags add column if not exists lost_mode boolean not null default false;
alter table public.tags add column if not exists emergency_contact_name text;
alter table public.tags add column if not exists emergency_contact_phone text;
alter table public.tags add column if not exists alt_phone text;
alter table public.tags add column if not exists alt_email text;
alter table public.tags add column if not exists address text;
create index if not exists tags_owner_idx on public.tags(owner_user_id);

-- ---------- scan_requests (the notify & accept flow) ----------
create table if not exists public.scan_requests (
  id              uuid primary key default gen_random_uuid(),
  tag_id          text not null references public.tags(id) on delete cascade,
  owner_user_id   uuid references auth.users(id) on delete cascade,
  reason          text,
  scanner_message text,
  scanner_lat     double precision,
  scanner_lng     double precision,
  status          text not null default 'pending' check (status in ('pending','accepted','declined','auto')),
  created_at      timestamptz not null default now(),
  responded_at    timestamptz
);
create index if not exists scan_requests_owner_idx on public.scan_requests(owner_user_id, status);

-- ---------- role helper (security definer avoids RLS recursion) ----------
create or replace function public.is_admin()
returns boolean
language sql stable
security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------- Row Level Security ----------
alter table public.profiles      enable row level security;
alter table public.tags          enable row level security;
alter table public.scan_requests enable row level security;

-- profiles: a user sees their own row; admins see all
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.is_admin());
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid());

-- tags: owner sees own tags; admins see all (writes happen server-side via service role)
drop policy if exists tags_select on public.tags;
create policy tags_select on public.tags
  for select using (owner_user_id = auth.uid() or public.is_admin());

-- scan_requests: owner sees requests for their tags (enables realtime); admins see all
drop policy if exists scan_requests_select on public.scan_requests;
create policy scan_requests_select on public.scan_requests
  for select using (owner_user_id = auth.uid() or public.is_admin());

-- ---------- enable Realtime on scan_requests ----------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'scan_requests'
  ) then
    alter publication supabase_realtime add table public.scan_requests;
  end if;
end $$;

-- ============================================================
--  SEED YOUR FIRST ADMIN  (edit the email, then it's DB-driven)
-- ============================================================
update public.profiles set role = 'admin' where email = 'bhargav@pixiverse.in';
