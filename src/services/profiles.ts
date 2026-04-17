import { supabase } from '../lib/supabase'

export type Profile = {
  id: string
  username: string
  display_name: string
  bio: string
  visibility: 'public' | 'private'
  share_activity: 'public' | 'followers' | 'private'
  share_notes: 'public' | 'followers' | 'private'
  /** Default privacy for new posts. */
  share_posts: 'public' | 'followers' | 'private'
  /** Who can see the Posts section on this user's profile. */
  posts_page_privacy: 'public' | 'followers' | 'private'
  created_at: string
  updated_at: string
}

export type ProfileUpdate = Partial<
  Pick<
    Profile,
    | 'username'
    | 'display_name'
    | 'bio'
    | 'visibility'
    | 'share_activity'
    | 'share_notes'
    | 'share_posts'
    | 'posts_page_privacy'
  >
>

/** Fetch the current user's profile. Returns null if not found (e.g. not logged in). */
export async function getOwnProfile(): Promise<Profile | null> {
  // Get the session user ID so we can filter by exact row — relying on RLS
  // alone with .single() breaks when multiple public profiles exist (Supabase
  // would return all of them and .single() errors on >1 row).
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    // PGRST116 = no rows found (new user whose trigger hasn't fired yet)
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data as Profile
}

/** Fetch a profile by username. Returns null if not found or private. */
export async function getProfileByUsername(
  username: string,
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data as Profile
}

/** Check if a username is available (not already taken by another user). */
export async function isUsernameAvailable(
  username: string,
  currentUserId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .neq('id', currentUserId)
    .maybeSingle()

  if (error) throw error
  return data === null
}

/** Public profiles ordered by most recently joined — used for the Discover page. */
export async function listPublicProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Profile[]
}

/** Update the current user's profile. */
export async function updateProfile(updates: ProfileUpdate): Promise<Profile> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select('*')
    .single()

  if (error) throw error
  return data as Profile
}
