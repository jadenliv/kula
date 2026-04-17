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
  if (error) throw error
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
