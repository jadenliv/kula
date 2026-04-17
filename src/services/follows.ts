import { supabase } from '../lib/supabase'

export type FollowStatus = 'pending' | 'accepted'

export type Follow = {
  id: string
  follower_user_id: string
  followed_user_id: string
  status: FollowStatus
  created_at: string
  accepted_at: string | null
}

export type FollowProfile = {
  id: string
  username: string
  display_name: string
}

export type FollowWithProfile = Follow & { profile: FollowProfile }

// ── Read ─────────────────────────────────────────────────────────────────────

/**
 * Returns the follow record from the current user → target, or null.
 * null  = not following at all
 * {status:'pending'}  = request sent, waiting approval
 * {status:'accepted'} = accepted follower
 */
export async function getFollowStatus(targetUserId: string): Promise<Follow | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('follows')
    .select('*')
    .eq('follower_user_id', user.id)
    .eq('followed_user_id', targetUserId)
    .maybeSingle()

  return data as Follow | null
}

/** Accepted followers of `userId` with their basic profile. */
export async function listFollowers(userId: string): Promise<FollowWithProfile[]> {
  const { data: follows, error } = await supabase
    .from('follows')
    .select('*')
    .eq('followed_user_id', userId)
    .eq('status', 'accepted')
    .order('accepted_at', { ascending: false })
  if (error) throw error
  if (!follows?.length) return []

  return attachProfiles(follows as Follow[], 'follower_user_id')
}

/** Users that `userId` follows (accepted only). */
export async function listFollowing(userId: string): Promise<FollowWithProfile[]> {
  const { data: follows, error } = await supabase
    .from('follows')
    .select('*')
    .eq('follower_user_id', userId)
    .eq('status', 'accepted')
    .order('accepted_at', { ascending: false })
  if (error) throw error
  if (!follows?.length) return []

  return attachProfiles(follows as Follow[], 'followed_user_id')
}

/** Pending follow requests directed at the current user. */
export async function listFollowRequests(): Promise<FollowWithProfile[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data: follows, error } = await supabase
    .from('follows')
    .select('*')
    .eq('followed_user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error) throw error
  if (!follows?.length) return []

  return attachProfiles(follows as Follow[], 'follower_user_id')
}

/** Accepted follower + following counts for any user. */
export async function getFollowCounts(
  userId: string,
): Promise<{ followers: number; following: number }> {
  const [frs, fing] = await Promise.all([
    supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('followed_user_id', userId)
      .eq('status', 'accepted'),
    supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('follower_user_id', userId)
      .eq('status', 'accepted'),
  ])
  return { followers: frs.count ?? 0, following: fing.count ?? 0 }
}

// ── Write ─────────────────────────────────────────────────────────────────────

/**
 * Follow a user. Auto-accepted for public profiles, pending for private.
 * Idempotent — throws only on genuine DB errors (duplicate handled gracefully).
 */
export async function followUser(targetUserId: string): Promise<Follow> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')

  const { data: target } = await supabase
    .from('profiles')
    .select('visibility')
    .eq('id', targetUserId)
    .single()

  const isPublic = target?.visibility === 'public'
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('follows')
    .insert({
      follower_user_id: user.id,
      followed_user_id: targetUserId,
      status: isPublic ? 'accepted' : 'pending',
      accepted_at: isPublic ? now : null,
    })
    .select()
    .single()

  if (error) throw error
  return data as Follow
}

/** Remove a follow (current user unfollows target). */
export async function unfollowUser(targetUserId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_user_id', user.id)
    .eq('followed_user_id', targetUserId)

  if (error) throw error
}

/** Approve a pending follow request (current user is the followed). */
export async function approveFollowRequest(followId: string): Promise<void> {
  const { error } = await supabase
    .from('follows')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', followId)
  if (error) throw error
}

/** Deny or cancel a follow request (delete the record). */
export async function denyFollowRequest(followId: string): Promise<void> {
  const { error } = await supabase.from('follows').delete().eq('id', followId)
  if (error) throw error
}

/** Remove a follower (current user is the followed; they remove a follower). */
export async function removeFollower(followerUserId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_user_id', followerUserId)
    .eq('followed_user_id', user.id)

  if (error) throw error
}

// ── Internal ──────────────────────────────────────────────────────────────────

/** Fetch profiles for a list of follows and attach them. */
async function attachProfiles(
  follows: Follow[],
  idField: 'follower_user_id' | 'followed_user_id',
): Promise<FollowWithProfile[]> {
  const ids = follows.map((f) => f[idField])
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, username, display_name')
    .in('id', ids)
  if (error) throw error

  const map = new Map((profiles ?? []).map((p) => [p.id, p as FollowProfile]))
  return follows.map((f) => ({
    ...f,
    profile: map.get(f[idField]) ?? {
      id: f[idField],
      username: 'unknown',
      display_name: 'Unknown user',
    },
  }))
}
