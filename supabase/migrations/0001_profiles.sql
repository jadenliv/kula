-- Milestone 1 migration: profiles table + RLS + auto-create on signup.
-- Run this once in the Supabase dashboard: SQL Editor → New query → paste → Run.

-- 1. Table ------------------------------------------------------------------
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now()
);

-- 2. Row Level Security -----------------------------------------------------
alter table public.profiles enable row level security;

-- Users can read their own profile row.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = user_id);

-- Users can insert their own profile row.
-- (The trigger below creates it automatically, but this policy lets
-- the AuthContext do it as a client-side fallback if needed.)
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = user_id);

-- Users can update their own profile row.
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. Auto-create profile on signup ------------------------------------------
-- Supabase best practice: a SECURITY DEFINER trigger on auth.users that
-- inserts a matching profiles row when a new user is created. This works
-- whether email confirmation is on or off, and means client code never has
-- to coordinate the insert with the auth flow.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', '')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
