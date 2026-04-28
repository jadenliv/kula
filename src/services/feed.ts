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

/**
 * Engagement counts for a post in the feed.
 * Fetched in a single batch after the main post query to avoid N+1.
 */
export type PostEngagement = {
  likeCount: number
  commentCount: number
  likedByCurrentUser: boolean
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
  engagement: PostEngagement
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
  const hasFollows = followedIds.length > 0

  // Always include the current user's own non-private content in the feed
  // so they can see their own posts alongside the people they follow.
  const feedIds = [...new Set([user.id, ...followedIds])]

  const since = new Date(Date.now() - FEED_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()

  // Fetch profiles, notes, and posts in parallel.
  // Completions are deliberately excluded — learning progress is private.
  // RLS on each table controls what rows are returned; we filter by feedIds
  // to scope results to the user and the people they follow.
  const [profilesRes, notesRes, postsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, username, display_name')
      .in('id', feedIds),

    supabase
      .from('notes')
      .select('id, user_id, sefaria_ref, body, tags, privacy, created_at')
      .in('user_id', feedIds)
      .neq('privacy', 'private')
      .gte('created_at', since)
      .order('created_at', { ascending: false }),

    supabase
      .from('posts')
      .select('id, user_id, title, body, privacy, created_at')
      .in('user_id', feedIds)
      .neq('privacy', 'private')
      .is('deleted_at', null)
      .gte('created_at', since)
      .order('created_at', { ascending: false }),
  ])

  const profileMap = new Map(
    (profilesRes.data ?? []).map((p) => [p.id, p as FeedProfile]),
  )

  // ── Batch-fetch engagement (likes + comments) for all posts ───────────────
  // This avoids N+1 queries — one fetch per resource type across all post IDs.
  const postIds = (postsRes.data ?? []).map((p) => p.id)

  const likeCountMap = new Map<string, number>()
  const commentCountMap = new Map<string, number>()
  const likedByUserSet = new Set<string>()

  if (postIds.length > 0) {
    const [likesRes, commentsRes, myLikesRes] = await Promise.all([
      supabase.from('post_likes').select('post_id').in('post_id', postIds),
      supabase.from('post_comments').select('post_id').in('post_id', postIds).is('deleted_at', null),
      supabase.from('post_likes').select('post_id').in('post_id', postIds).eq('user_id', user.id),
    ])

    for (const l of likesRes.data ?? []) {
      likeCountMap.set(l.post_id, (likeCountMap.get(l.post_id) ?? 0) + 1)
    }
    for (const c of commentsRes.data ?? []) {
      commentCountMap.set(c.post_id, (commentCountMap.get(c.post_id) ?? 0) + 1)
    }
    for (const l of myLikesRes.data ?? []) {
      likedByUserSet.add(l.post_id)
    }
  }

  // ── Build typed feed items ────────────────────────────────────────────────

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
        engagement: {
          likeCount: likeCountMap.get(p.id) ?? 0,
          commentCount: commentCountMap.get(p.id) ?? 0,
          likedByCurrentUser: likedByUserSet.has(p.id),
        },
        date: p.created_at,
      }
    })
    .filter((x): x is FeedItemPost => x !== null)

  const allItems = [...noteItems, ...postItems].sort((a, b) =>
    b.date.localeCompare(a.date),
  )

  return { items: allItems, hasFollows }
}
