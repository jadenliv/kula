-- Milestone 2 migration: completions table + RLS.
-- Run this in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

-- 1. Table ------------------------------------------------------------------
-- One row per "this user marked this Sefaria ref complete."
-- sefaria_ref is the exact Sefaria reference string ("Genesis 1", "Berakhot 2a",
-- "Mishneh Torah, Fundamentals of the Torah, 1", etc.).
-- We store at whatever granularity the user clicked; aggregation happens in
-- the client for now.
create table if not exists public.completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sefaria_ref text not null,
  learning_track_id uuid,
  completed_at timestamptz not null default now(),
  -- A user can't mark the same ref complete twice. If they want to log
  -- re-learning a section, that belongs in time_logs, not completions.
  unique (user_id, sefaria_ref)
);

-- Fast lookups for "all my completions" and "all completions under this prefix."
create index if not exists completions_user_idx
  on public.completions (user_id);

create index if not exists completions_user_ref_idx
  on public.completions (user_id, sefaria_ref);

-- 2. Row Level Security -----------------------------------------------------
alter table public.completions enable row level security;

drop policy if exists "completions_select_own" on public.completions;
create policy "completions_select_own"
  on public.completions for select
  using (auth.uid() = user_id);

drop policy if exists "completions_insert_own" on public.completions;
create policy "completions_insert_own"
  on public.completions for insert
  with check (auth.uid() = user_id);

drop policy if exists "completions_delete_own" on public.completions;
create policy "completions_delete_own"
  on public.completions for delete
  using (auth.uid() = user_id);

-- Updates aren't needed yet — check/uncheck is insert/delete.
