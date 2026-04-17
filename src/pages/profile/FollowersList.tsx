import { Link, useParams } from 'react-router-dom'
import { useProfileByUsername } from '../../hooks/useProfile'
import { useProfile } from '../../context/ProfileContext'
import {
  useFollowCounts,
  useFollowers,
  useFollowing,
  useFollowStatus,
  useRemoveFollower,
} from '../../hooks/useFollows'
import { Avatar } from '../../components/ui/Avatar'
import { FollowButton } from '../../components/profile/FollowButton'
import { Spinner } from '../../components/ui/Spinner'
import type { FollowProfile } from '../../services/follows'

// ── Followers list (/u/:username/followers) ────────────────────────────────────

export default function FollowersList() {
  const { username } = useParams<{ username: string }>()
  const { data: profile, isLoading: profileLoading } = useProfileByUsername(username)
  const { profile: ownProfile } = useProfile()
  const { data: followStatus } = useFollowStatus(profile?.id)
  const { data: counts } = useFollowCounts(profile?.id)
  const { data: followers, isLoading } = useFollowers(profile?.id)

  if (profileLoading) {
    return <div className="flex justify-center py-24"><Spinner size="md" /></div>
  }
  if (!profile) return <NotFound />

  const isOwner = ownProfile?.id === profile.id
  const isAcceptedFollower = followStatus?.status === 'accepted'
  const isPrivate = profile.visibility === 'private'

  // Followers list is visible to: owner + accepted followers (if private) + everyone (if public)
  if (isPrivate && !isOwner && !isAcceptedFollower) {
    return (
      <div className="mx-auto max-w-lg py-12 text-center">
        <p className="text-sm text-kula-500 dark:text-kula-400">This profile is private.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <PageHeader profile={profile} tab="followers" counts={counts} />
      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner size="sm" /></div>
      ) : !followers?.length ? (
        <p className="py-8 text-center text-sm text-kula-400 dark:text-kula-600">
          No followers yet.
        </p>
      ) : (
        <div className="space-y-2">
          {followers.map((f) => (
            <UserRow
              key={f.id}
              profile={f.profile}
              ownProfileId={ownProfile?.id}
              isOwner={isOwner}
              followId={f.id}
              followerUserId={f.follower_user_id}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Following list (/u/:username/following) ────────────────────────────────────

export function FollowingList() {
  const { username } = useParams<{ username: string }>()
  const { data: profile, isLoading: profileLoading } = useProfileByUsername(username)
  const { profile: ownProfile } = useProfile()
  const { data: followStatus } = useFollowStatus(profile?.id)
  const { data: counts } = useFollowCounts(profile?.id)
  const { data: followingList, isLoading } = useFollowing(profile?.id)

  if (profileLoading) {
    return <div className="flex justify-center py-24"><Spinner size="md" /></div>
  }
  if (!profile) return <NotFound />

  const isOwner = ownProfile?.id === profile.id
  const isAcceptedFollower = followStatus?.status === 'accepted'
  const isPrivate = profile.visibility === 'private'

  if (isPrivate && !isOwner && !isAcceptedFollower) {
    return (
      <div className="mx-auto max-w-lg py-12 text-center">
        <p className="text-sm text-kula-500 dark:text-kula-400">This profile is private.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <PageHeader profile={profile} tab="following" counts={counts} />
      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner size="sm" /></div>
      ) : !followingList?.length ? (
        <p className="py-8 text-center text-sm text-kula-400 dark:text-kula-600">
          Not following anyone yet.
        </p>
      ) : (
        <div className="space-y-2">
          {followingList.map((f) => (
            <UserRow
              key={f.id}
              profile={f.profile}
              ownProfileId={ownProfile?.id}
              isOwner={false}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Shared components ──────────────────────────────────────────────────────────

function PageHeader({
  profile,
  tab,
  counts,
}: {
  profile: { id: string; username: string; display_name: string }
  tab: 'followers' | 'following'
  counts: { followers: number; following: number } | undefined
}) {
  return (
    <div className="space-y-3">
      <Link
        to={`/u/${profile.username}`}
        className="flex items-center gap-1 text-xs text-kula-400 transition-colors hover:text-kula-700 dark:text-kula-600 dark:hover:text-kula-300"
      >
        ← {profile.display_name || profile.username}
      </Link>

      <div className="flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-1">
        <Link
          to={`/u/${profile.username}/followers`}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors ${
            tab === 'followers'
              ? 'bg-[var(--surface)] text-kula-700 shadow-sm dark:text-kula-200'
              : 'text-kula-500 hover:text-kula-700 dark:text-kula-500 dark:hover:text-kula-300'
          }`}
        >
          Followers
          {counts != null && (
            <span className="rounded-full bg-kula-100 px-1.5 py-0.5 text-xs font-medium text-kula-600 dark:bg-kula-800 dark:text-kula-400">
              {counts.followers}
            </span>
          )}
        </Link>
        <Link
          to={`/u/${profile.username}/following`}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors ${
            tab === 'following'
              ? 'bg-[var(--surface)] text-kula-700 shadow-sm dark:text-kula-200'
              : 'text-kula-500 hover:text-kula-700 dark:text-kula-500 dark:hover:text-kula-300'
          }`}
        >
          Following
          {counts != null && (
            <span className="rounded-full bg-kula-100 px-1.5 py-0.5 text-xs font-medium text-kula-600 dark:bg-kula-800 dark:text-kula-400">
              {counts.following}
            </span>
          )}
        </Link>
      </div>
    </div>
  )
}

function UserRow({
  profile,
  ownProfileId,
  isOwner,
  followId: _followId,
  followerUserId,
}: {
  profile: FollowProfile
  ownProfileId: string | undefined
  /** True when the viewer is the profile page owner (can remove followers). */
  isOwner: boolean
  followId?: string
  followerUserId?: string
}) {
  const remove = useRemoveFollower()
  const isSelf = ownProfileId === profile.id

  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
      <Avatar profile={profile} size="sm" />
      <Link to={`/u/${profile.username}`} className="min-w-0 flex-1 group">
        <p className="truncate text-sm font-medium text-kula-800 transition-colors group-hover:text-kula-600 dark:text-kula-200 dark:group-hover:text-kula-300">
          {profile.display_name || profile.username}
        </p>
        <p className="truncate text-xs text-kula-400 dark:text-kula-600">
          @{profile.username}
        </p>
      </Link>

      {/* Owner of this followers list: can remove any follower */}
      {isOwner && followerUserId && (
        <button
          type="button"
          onClick={() => remove.mutate({ followerUserId })}
          disabled={remove.isPending}
          className="shrink-0 rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-kula-500 transition-colors hover:border-kula-400 hover:text-kula-700 disabled:opacity-50 dark:text-kula-500 dark:hover:text-kula-300"
        >
          Remove
        </button>
      )}

      {/* Non-owner viewers can follow people they see in the list */}
      {!isOwner && !isSelf && ownProfileId && (
        <FollowButton targetUserId={profile.id} />
      )}
    </div>
  )
}

function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-24 text-center">
      <p className="text-sm text-kula-500 dark:text-kula-400">
        This profile doesn't exist.{' '}
        <Link to="/today" className="text-kula-600 underline-offset-2 hover:underline dark:text-kula-300">
          Go home →
        </Link>
      </p>
    </div>
  )
}
