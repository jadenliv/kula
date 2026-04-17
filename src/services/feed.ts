import { supabase } from '../lib/supabase'

// ── Types ──────────────────────────────────────────────────────────────────────

export type FeedProfile = {
  id: string
  username: string
  display_name: string
}

export type FeedItemActivity = {
  type: 'activity'
  /** Stable key: `${userId}:${day}` */
  id: string
  profile: FeedProfile
  /** YYYY-MM-DD */
  day: string
  /** ISO timestamp of the latest completion in this group (used for sorting). */
  date: string
  count: number
  /** Unique sefer names extracted from refs. */
  sefarim: string[]
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

export type FeedItem = FeedItemActivity | FeedItemNote | FeedItemPost

export type FeedResult = {
  items: FeedItem[]
  /** False when the current user follows nobody — used to pick the empty-state variant. */
  hasFollows: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const FEED_WINDOW_DAYS = 7

/**
 * Strip the trailing numeric locator from a Sefaria ref to get the sefer name.
 * "Berakhot 2a" → "Berakhot", "Rashi on Berakhot 2a:3" → "Rashi on Berakhot"
 */
function extractSefer(ref: string): string {
  const parts = ref.split(/\s+/)
  for (let i = parts.length - 1; i >= 0; i--) {
    if (/\d/.test(parts[i])) {
      const sefer = parts.slice(0, i).join(' ').replace(/,\s*$/, '').trim()
      return sefer || ref
    }
  }
  return ref
}

function buildActivityItems(
  completions: { user_id: string; sefaria_ref: string; completed_at: string }[],
  profileMap: Map<string, FeedProfile>,
): FeedItemActivity[] {
  // Group by (user_id, YYYY-MM-DD) — one activity item per person per day.
  const groups = new Map<
    string,
    { userId: string; day: string; refs: string[]; latestDate: string }
  >()

  for (const c of completions) {
    const day = c.completed_at.slice(0, 10)
    const key = `${c.user_id}:${day}`
    if (!groups.has(key)) {
      groups.set(key, { userId: c.user_id, day, refs: [], latestDate: c.completed_at })
    }
    const g = groups.get(key)!
    g.refs.push(c.sefaria_ref)
    if (c.completed_at > g.latestDate) g.latestDate = c.completed_at
  }

  const items: FeedItemActivity[] = []
  for (const [key, g] of groups) {
    const profile = profileMap.get(g.userId)
    if (!profile) continue
    items.push({
      type: 'activity',
      id: key,
      profile,
      day: g.day,
      date: g.latestDate,
      count: g.refs.length,
      sefarim: [...new Set(g.refs.map(extractSefer))],
    })
  }
  return items
}

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

  // Fetch profiles, completions, notes, and posts in parallel.
  // RLS on each table controls what rows are actually returned — privacy is
  // enforced at the DB level; we filter in('user_id', followedIds) to scope
  // the results to people this user follows.
  const [profilesRes, completionsRes, notesRes, postsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, username, display_name')
      .in('id', followedIds),

    supabase
      .from('completions')
      .select('user_id, sefaria_ref, completed_at')
      .in('user_id', followedIds)
      .gte('completed_at', since)
      .order('completed_at', { ascending: false }),

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

  const activityItems = buildActivityItems(completionsRes.data ?? [], profileMap)

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

  const allItems = [...activityItems, ...noteItems, ...postItems].sort((a, b) =>
    b.date.localeCompare(a.date),
  )

  return { items: allItems, hasFollows: true }
}
