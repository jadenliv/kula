import { supabase } from '../lib/supabase'

// ── Types ──────────────────────────────────────────────────────────────────────

export type FeedProfile = {
  id: string
  username: string
  display_name: string
}

export type FeedItemNote = {
  type: 'note'
  id: string
  profile: FeedProfile
  note: {
    id: string
    user_id: string
    sefaria_ref: string
    body: string
    tags: string[]
    privacy: string
    created_at: string
  }
  date: string
}

export type FeedItemPost = {
  type: 'post'
  id: string
  profile: FeedProfile
  post: {
    id: string
    user_id: string
    title: string | null
    body: string
    privacy: string
    created_at: string
  }
  date: string
}

// Activity items (completion check-offs) are intentionally not shown on the
// feed — learning progress is private by default.
export type FeedItem = FeedItemNote | FeedItemPost

export type FeedResult = {
  items: FeedItem[]
  /** False when the current user follows nobody — used to pick the empty-state variant. */
  hasFollows: boolean
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FEED_WINDOW_DAYS = 7

// ── Main query ────────────────────────────────────────────────────────────────

export async function getFeedItems(): Promise<FeedResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { items: [], hasFollows: false }

  // Who does the current user follow?
  const { data: follows } = await supabase
    .from('follows')
    .select('followed_user_id')
    .eq('follower_user_id', user.id)
    .eq('status', 'accepted')

  const followedIds = follows?.map((f) => f.followed_user_id) ?? []
  if (!followedIds.length) return { items: [], hasFollows: false }

  const since = new Date(Date.now() - FEED_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()

  // Fetch profiles, notes, and posts in parallel.
  // Completions are deliberately excluded — learning progress is private.
  // RLS on each table controls what rows are returned; we filter by followedIds
  // to scope results to people this user follows.
  const [profilesRes, notesRes, postsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, username, display_name')
      .in('id', followedIds),

    supabase
      .from('notes')
      .select('id, user_id, sefaria_ref, body, tags, privacy, created_at')
      .in('user_id', followedIds)
      .neq('privacy', 'private')
      .gte('created_at', since)
      .order('created_at', { ascending: false }),

    supabase
      .from('posts')
      .select('id, user_id, title, body, privacy, created_at')
      .in('user_id', followedIds)
      .neq('privacy', 'private')
      .is('deleted_at', null)
      .gte('created_at', since)
      .order('created_at', { ascending: false }),
  ])

  const profileMap = new Map(
    (profilesRes.data ?? []).map((p) => [p.id, p as FeedProfile]),
  )

  const noteItems: FeedItemNote[] = (notesRes.data ?? [])
    .map((n) => {
      const profile = profileMap.get(n.user_id)
      if (!profile) return null
      return {
        type: 'note' as const,
        id: n.id,
        profile,
        note: { ...n, tags: n.tags ?? [] },
        date: n.created_at,
      }
    })
    .filter((x): x is FeedItemNote => x !== null)

  const postItems: FeedItemPost[] = (postsRes.data ?? [])
    .map((p) => {
      const profile = profileMap.get(p.user_id)
      if (!profile) return null
      return {
        type: 'post' as const,
        id: p.id,
        profile,
        post: p,
        date: p.created_at,
      }
    })
    .filter((x): x is FeedItemPost => x !== null)

  const allItems = [...noteItems, ...postItems].sort((a, b) =>
    b.date.localeCompare(a.date),
  )

  return { items: allItems, hasFollows: true }
}
