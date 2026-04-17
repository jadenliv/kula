/**
 * ProfileContext — makes the current user's profile available app-wide without
 * each component calling useOwnProfile() independently (which would create
 * multiple query subscriptions and waterfalls in the component tree).
 *
 * Components that only need to read the profile (e.g. Avatar in the nav) just
 * call useProfile(). Components that need to mutate should call useOwnProfile()
 * and useUpdateProfile() from useProfile.ts directly.
 */

import {
  createContext,
  useContext,
  type ReactNode,
} from 'react'
import { useOwnProfile } from '../hooks/useProfile'
import type { Profile } from '../services/profiles'

type ProfileState = {
  profile: Profile | null | undefined
  isLoading: boolean
}

const ProfileContext = createContext<ProfileState | undefined>(undefined)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { data: profile, isLoading } = useOwnProfile()

  return (
    <ProfileContext.Provider value={{ profile: profile ?? null, isLoading }}>
      {children}
    </ProfileContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProfile(): ProfileState {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile must be used inside ProfileProvider')
  return ctx
}
