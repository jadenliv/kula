-- Admin stats RPC function.
--
-- Runs with SECURITY DEFINER so it can read across all users' rows,
-- bypassing row-level security. The admin check inside the function
-- ensures only your account can call it.
--
-- Run this once in Supabase Dashboard → SQL Editor.
--
-- After running, replace the UUID below with your actual admin UUID
-- if it differs from the one hardcoded in src/lib/adminConfig.ts.

create or replace function get_admin_stats()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
  caller_id text := auth.uid()::text;
begin
  -- Guard: only whitelisted admin UUIDs may call this function.
  -- Mirrors the ADMIN_USER_IDS list in src/lib/adminConfig.ts.
  if caller_id not in ('936edc86-c923-47fe-ab14-4e1d84daab92') then
    raise exception 'Unauthorized';
  end if;

  select json_build_object(

    -- ── User counts ──────────────────────────────────────────────────────────
    'total_users',            (select count(*)  from profiles),
    'onboarding_completed',   (select count(*)  from profiles where onboarding_completed = true),
    'public_profiles',        (select count(*)  from profiles where visibility = 'public'),
    'private_profiles',       (select count(*)  from profiles where visibility = 'private'),

    -- ── Signups over time ─────────────────────────────────────────────────────
    'signups_today',          (select count(*)  from profiles where created_at > now() - interval '1 day'),
    'signups_7d',             (select count(*)  from profiles where created_at > now() - interval '7 days'),
    'signups_30d',            (select count(*)  from profiles where created_at > now() - interval '30 days'),

    -- Weekly signups for the last 12 weeks (used for the chart).
    'signups_by_week', (
      select coalesce(json_agg(row_to_json(t) order by t.week), '[]')
      from (
        select
          date_trunc('week', created_at)::date as week,
          count(*)::int                        as count
        from profiles
        where created_at > now() - interval '12 weeks'
        group by 1
      ) t
    ),

    -- ── Activity ──────────────────────────────────────────────────────────────
    -- "Active" = checked off at least one section in the window.
    'active_users_7d',  (select count(distinct user_id) from completions where completed_at > now() - interval '7 days'),
    'active_users_30d', (select count(distinct user_id) from completions where completed_at > now() - interval '30 days'),

    -- Daily active users for the last 30 days (for the activity chart).
    'dau_by_day', (
      select coalesce(json_agg(row_to_json(t) order by t.day), '[]')
      from (
        select
          completed_at::date          as day,
          count(distinct user_id)::int as active_users
        from completions
        where completed_at > now() - interval '30 days'
        group by 1
      ) t
    ),

    -- ── Content counts ────────────────────────────────────────────────────────
    'total_completions', (select count(*) from completions),
    'total_notes',       (select count(*) from notes),
    'total_posts',       (select count(*) from posts where deleted_at is null),
    'total_follows',     (select count(*) from follows where status = 'accepted')

  ) into result;

  return result;
end;
$$;

-- Revoke public execute so only authenticated users can call it
-- (the function itself enforces the admin check on top of that).
revoke execute on function get_admin_stats() from anon;
grant  execute on function get_admin_stats() to authenticated;
