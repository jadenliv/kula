import { supabase } from '../lib/supabase'

export type PostPrivacy = 'private' | 'followers' | 'public'

export type Post = {
  id: string
  user_id: string
  title: string | null
  body: string
  privacy: PostPrivacy
  created_at: string
  updated_at: string
  deleted_at: string | null
}

// ── Privacy helpers ───────────────────────────────────────────────────────────

/**
 * Numeric level for privacy comparisons.
 * Higher = more restrictive.
 *   public(0) < followers(1) < private(2)
 */
const PRIVACY_LEVEL: Record<PostPrivacy, number> = {
  public: 0,
  followers: 1,
  private: 2,
}

/**
 * Validate that a post's privacy is not less restrictive than:
 *   (a) the user's posts_page_privacy setting
 *   (b) their profile visibility (no public posts on a private profile)
 *
 * Throws a human-readable error if the constraint is violated.
 */
async function assertPostPrivacyAllowed(privacy: PostPrivacy): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const { data: profile } = await supabase
    .from('profiles')
    .select('visibility, posts_page_privacy')
    .eq('id', user.id)
    .single()

  if (!profile) return

  // Profile-level wall: private profile → no public posts
  if (privacy === 'public' && profile.visibility === 'private') {
    throw new Error(
      'Your profile is set to private, so posts cannot be public. ' +
        'Change your profile visibility first, or set this post to followers or private.',
    )
  }

  // posts_page_privacy: post cannot be less restrictive than the page
  const pageLevel = PRIVACY_LEVEL[profile.posts_page_privacy as PostPrivacy] ?? 0
  if (PRIVACY_LEVEL[privacy] < pageLevel) {
    const pagePrivacy = profile.posts_page_privacy as PostPrivacy
    throw new Error(
      `This post's visibility (${privacy}) is less restrictive than your Posts page visibility (${pagePrivacy}). ` +
        `Make the post more private, or change your Posts page setting in Settings → Privacy.`,
    )
  }
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

/** All non-deleted posts by the current user, newest first. */
export async function listOwnPosts(): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Post[]
}

/**
 * Public non-deleted posts for a given user (for profile pages).
 * RLS filters to public posts when the viewer is not the author.
 */
export async function listPostsForUser(userId: string): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Post[]
}

/** Fetch a single post by id. Returns null if not found or not accessible. */
export async function getPost(id: string): Promise<Post | null> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()
  if (error) throw error
  return data as Post | null
}

export type CreatePostInput = {
  title?: string
  body: string
  privacy: PostPrivacy
}

export async function createPost(input: CreatePostInput): Promise<Post> {
  await assertPostPrivacyAllowed(input.privacy)

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')

  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: user.id,
      title: input.title?.trim() || null,
      body: input.body,
      privacy: input.privacy,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Post
}

export type UpdatePostInput = Partial<Pick<Post, 'title' | 'body' | 'privacy'>>

export async function updatePost(id: string, input: UpdatePostInput): Promise<Post> {
  if (input.privacy) await assertPostPrivacyAllowed(input.privacy)

  const patch: Record<string, unknown> = {}
  if ('title' in input) patch.title = input.title?.trim() || null
  if (input.body !== undefined) patch.body = input.body
  if (input.privacy !== undefined) patch.privacy = input.privacy

  const { data, error } = await supabase
    .from('posts')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Post
}

/** Soft-delete: sets deleted_at so the post disappears but data is preserved. */
export async function deletePost(id: string): Promise<void> {
  const { error } = await supabase
    .from('posts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

/**
 * Moderator hard-delete: permanently removes a post by ID regardless of
 * ownership. Relies on the admin RLS policy allowing admins to delete any row.
 * Use `isAdmin()` to gate this in the UI before calling.
 */
export async function adminDeletePost(id: string): Promise<void> {
  const { error } = await supabase
    .from('posts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

/**
 * Fetch all non-deleted posts across all users, newest first.
 * Only succeeds for admin users — RLS blocks everyone else.
 */
export type AdminPost = Post & { author_username?: string; author_display_name?: string }

export async function listAllPostsAdmin(): Promise<AdminPost[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) throw error
  if (!data?.length) return []

  // Attach author profiles (posts → auth.users, not profiles, so manual join)
  const userIds = [...new Set(data.map((p) => p.user_id))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, display_name')
    .in('id', userIds)

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))

  return data.map((p) => ({
    ...(p as Post),
    author_username: profileMap.get(p.user_id)?.username,
    author_display_name: profileMap.get(p.user_id)?.display_name,
  }))
}

// ── Likes ─────────────────────────────────────────────────────────────────────

export async function likePost(postId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')

  const { error } = await supabase
    .from('post_likes')
    .insert({ post_id: postId, user_id: user.id })
  if (error) throw new Error(error.message)
}

export async function unlikePost(postId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')

  const { error } = await supabase
    .from('post_likes')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', user.id)
  if (error) throw new Error(error.message)
}

/** Fresh like count + whether the current user has liked, for the post page. */
export async function getLikeStatus(
  postId: string,
): Promise<{ likeCount: number; liked: boolean }> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [allRes, myRes] = await Promise.all([
    supabase.from('post_likes').select('id').eq('post_id', postId),
    user
      ? supabase
          .from('post_likes')
          .select('id')
          .eq('post_id', postId)
          .eq('user_id', user.id)
      : Promise.resolve({ data: [] as { id: string }[] }),
  ])

  return {
    likeCount: allRes.data?.length ?? 0,
    liked: (myRes.data?.length ?? 0) > 0,
  }
}

// ── Comments ──────────────────────────────────────────────────────────────────

export type PostComment = {
  id: string
  post_id: string
  user_id: string
  body: string
  created_at: string
  profile: { username: string; display_name: string } | null
}

/** All non-deleted comments for a post, oldest first. */
export async function listComments(postId: string): Promise<PostComment[]> {
  const { data, error } = await supabase
    .from('post_comments')
    .select('id, post_id, user_id, body, created_at')
    .eq('post_id', postId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
  if (error) throw error
  if (!data?.length) return []

  // Manually join profiles (post_comments.user_id → auth.users.id = profiles.id)
  const userIds = [...new Set(data.map((c) => c.user_id))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, display_name')
    .in('id', userIds)

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))

  return data.map((c) => ({
    ...c,
    profile: profileMap.get(c.user_id) ?? null,
  }))
}

export async function addComment(postId: string, body: string): Promise<PostComment> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')

  const { data, error } = await supabase
    .from('post_comments')
    .insert({ post_id: postId, user_id: user.id, body: body.trim() })
    .select('id, post_id, user_id, body, created_at')
    .single()
  if (error) throw new Error(error.message)

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name')
    .eq('id', user.id)
    .single()

  return { ...data, profile: profile ?? null }
}

/** Soft-delete: sets deleted_at so the comment disappears but data is preserved. */
export async function deleteComment(id: string): Promise<void> {
  const { error } = await supabase
    .from('post_comments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}
