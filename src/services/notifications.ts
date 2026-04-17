import { supabase } from '../lib/supabase'

// ── Types ──────────────────────────────────────────────────────────────────────

export type NotificationType = 'new_follower' | 'follow_request' | 'follow_accepted'

export type Notification = {
  id: string
  user_id: string
  type: NotificationType
  actor_user_id: string
  target_type: string | null
  target_id: string | null
  read_at: string | null
  created_at: string
  actor: { username: string; display_name: string }
}

// ── Queries ───────────────────────────────────────────────────────────────────

/** Last 30 notifications for the current user, with actor profile attached. */
export async function listNotifications(): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) throw error
  if (!data?.length) return []

  // notifications.actor_user_id → auth.users, not profiles, so we can't use
  // Supabase FK joins. Fetch profiles separately and attach manually.
  const actorIds = [...new Set(data.map((n) => n.actor_user_id))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, display_name')
    .in('id', actorIds)

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, { username: p.username, display_name: p.display_name }]),
  )

  return data.map((n) => ({
    ...n,
    actor: profileMap.get(n.actor_user_id) ?? {
      username: 'unknown',
      display_name: 'Unknown user',
    },
  })) as Notification[]
}

/** Count of unread notifications. */
export async function getUnreadCount(): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null)

  if (error) throw error
  return count ?? 0
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export async function markAllRead(): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null)
  if (error) throw error
}

export async function markOneRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .is('read_at', null) // no-op if already read
  if (error) throw error
}
