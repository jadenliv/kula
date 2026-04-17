import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { listPublicProfiles } from '../services/profiles'
import { useProfile } from '../context/ProfileContext'
import { Avatar } from '../components/ui/Avatar'
import { FollowButton } from '../components/profile/FollowButton'
import { Spinner } from '../components/ui/Spinner'

export default function Discover() {
  const { profile: ownProfile } = useProfile()
  const { data: profiles, isLoading } = useQuery({
    queryKey: ['discover', 'profiles'],
    queryFn: listPublicProfiles,
    staleTime: 1000 * 60 * 5,
  })

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h2 className="font-serif text-3xl tracking-tight text-kula-900 dark:text-kula-50">
          Discover
        </h2>
        <p className="mt-1 text-sm text-kula-500 dark:text-kula-400">
          People learning on Kula.
        </p>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12"><Spinner size="md" /></div>
      )}

      {!isLoading && !profiles?.length && (
        <p className="py-12 text-center text-sm text-kula-400 dark:text-kula-600">
          No public profiles yet.
        </p>
      )}

      {profiles && profiles.length > 0 && (
        <div className="space-y-2">
          {profiles
            // Hide yourself from the discover list
            .filter((p) => p.id !== ownProfile?.id)
            .map((profile) => (
              <div
                key={profile.id}
                className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
              >
                <Link to={`/u/${profile.username}`} className="shrink-0" tabIndex={-1}>
                  <Avatar profile={profile} size="md" />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/u/${profile.username}`}
                    className="block text-sm font-medium text-kula-800 transition-colors hover:text-kula-600 dark:text-kula-200 dark:hover:text-kula-300"
                  >
                    {profile.display_name || profile.username}
                  </Link>
                  <p className="text-xs text-kula-400 dark:text-kula-600">
                    @{profile.username}
                  </p>
                  {profile.bio && (
                    <p className="mt-1 line-clamp-2 text-xs text-kula-600 dark:text-kula-400">
                      {profile.bio}
                    </p>
                  )}
                </div>
                {ownProfile && (
                  <FollowButton targetUserId={profile.id} />
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
