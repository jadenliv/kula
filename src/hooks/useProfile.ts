import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getOwnProfile,
  getProfileByUsername,
  updateProfile,
  type Profile,
  type ProfileUpdate,
} from '../services/profiles'
import { useAuth } from '../context/AuthContext'

export const OWN_PROFILE_KEY = ['profile', 'own'] as const

/** Current user's profile. Enabled only when logged in. */
export function useOwnProfile() {
  const { user } = useAuth()
  return useQuery({
    queryKey: OWN_PROFILE_KEY,
    queryFn: getOwnProfile,
    enabled: Boolean(user),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/** Any user's profile by username, for the public /u/:username page. */
export function useProfileByUsername(username: string | undefined) {
  return useQuery({
    queryKey: ['profile', 'username', username],
    queryFn: () => getProfileByUsername(username!),
    enabled: Boolean(username),
    staleTime: 1000 * 60 * 2,
  })
}

/** Update the current user's profile fields. Optimistic — UI updates immediately. */
export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (updates: ProfileUpdate) => updateProfile(updates),

    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: OWN_PROFILE_KEY })
      const previous = queryClient.getQueryData<Profile>(OWN_PROFILE_KEY)
      if (previous) {
        queryClient.setQueryData<Profile>(OWN_PROFILE_KEY, {
          ...previous,
          ...updates,
        })
      }
      return { previous }
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(OWN_PROFILE_KEY, ctx.previous)
      }
    },

    onSuccess: (data) => {
      // Replace optimistic data with confirmed server data
      queryClient.setQueryData(OWN_PROFILE_KEY, data)
      // Also invalidate the by-username cache in case username changed
      void queryClient.invalidateQueries({ queryKey: ['profile', 'username'] })
    },
  })
}
