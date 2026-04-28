-- ── post_likes ─────────────────────────────────────────────────────────────────
-- One row per (post, user) pair. Unique constraint prevents double-likes.

create table if not exists post_likes (
  id         uuid        primary key default gen_random_uuid(),
  post_id    uuid        not null references posts(id) on delete cascade,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

alter table post_likes enable row level security;

create policy "authenticated users can view likes"
  on post_likes for select to authenticated using (true);

create policy "users can like posts"
  on post_likes for insert to authenticated
  with check (auth.uid() = user_id);

create policy "users can remove their own likes"
  on post_likes for delete to authenticated
  using (auth.uid() = user_id);

create index post_likes_post_id_idx on post_likes (post_id);
create index post_likes_user_id_idx on post_likes (user_id);

-- ── post_comments ──────────────────────────────────────────────────────────────
-- Soft-deleted via deleted_at so moderators can audit.

create table if not exists post_comments (
  id         uuid        primary key default gen_random_uuid(),
  post_id    uuid        not null references posts(id) on delete cascade,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  body       text        not null check (char_length(trim(body)) > 0 and char_length(body) <= 1000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table post_comments enable row level security;

create policy "authenticated users can view comments"
  on post_comments for select to authenticated
  using (deleted_at is null);

create policy "users can add comments"
  on post_comments for insert to authenticated
  with check (auth.uid() = user_id);

-- Soft-delete is done via UPDATE (sets deleted_at)
create policy "users can soft-delete their own comments"
  on post_comments for update to authenticated
  using (auth.uid() = user_id);

create index post_comments_post_id_idx on post_comments (post_id);
create index post_comments_user_id_idx on post_comments (user_id);
