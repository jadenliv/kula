-- public.notes — free-form notes attached to a Sefaria ref. Many notes per
-- ref allowed (a learner might revisit Berakhot 2a six times and write a
-- new note each time). RLS enforces per-user isolation; the auth.uid() =
-- user_id check is the same pattern used by completions.

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sefaria_ref text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notes_user_id_idx on public.notes (user_id);
create index if not exists notes_user_ref_idx on public.notes (user_id, sefaria_ref);

alter table public.notes enable row level security;

drop policy if exists "notes_select_own" on public.notes;
create policy "notes_select_own" on public.notes
  for select using (auth.uid() = user_id);

drop policy if exists "notes_insert_own" on public.notes;
create policy "notes_insert_own" on public.notes
  for insert with check (auth.uid() = user_id);

drop policy if exists "notes_update_own" on public.notes;
create policy "notes_update_own" on public.notes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "notes_delete_own" on public.notes;
create policy "notes_delete_own" on public.notes
  for delete using (auth.uid() = user_id);

-- Keep updated_at in sync on any row update. Generic helper — reusable for
-- future tables that need the same behavior.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists notes_set_updated_at on public.notes;
create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();
