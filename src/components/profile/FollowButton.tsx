import { useState } from 'react'
import { track } from '@vercel/analytics'
import { useFollowStatus, useFollowUser, useUnfollowUser } from '../../hooks/useFollows'

type Props = {
  targetUserId: string
  /** Optional: the target profile's visibility setting. Used for analytics only. */
  targetVisibility?: 'public' | 'private'
}

export function FollowButton({ targetUserId, targetVisibility }: Props) {
  const { data: followStatus, isLoading } = useFollowStatus(targetUserId)
  const follow = useFollowUser(targetUserId)
  const unfollow = useUnfollowUser(targetUserId)
  const [hovering, setHovering] = useState(false)

  if (isLoading) return null

  const isPending = follow.isPending || unfollow.isPending

  // ── Not following ─────────────────────────────────────────────────────────
  if (!followStatus) {
    return (
      <button
        type="button"
        onClick={() => {
          follow.mutate()
          // Track: follow initiated. target_profile_visibility tells us whether
          // users prefer public or private follows — not PII.
          track('follow_created', {
            target_profile_visibility: targetVisibility ?? 'public',
          })
        }}
        disabled={isPending}
        className="rounded-xl bg-kula-700 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-kula-800 disabled:opacity-50 dark:bg-kula-400 dark:text-kula-950 dark:hover:bg-kula-300"
      >
        Follow
      </button>
    )
  }

  // ── Pending approval ──────────────────────────────────────────────────────
  if (followStatus.status === 'pending') {
    return (
      <button
        type="button"
        disabled
        className="cursor-default rounded-xl border border-[var(--border)] px-4 py-1.5 text-sm font-medium text-kula-500 dark:text-kula-500"
      >
        Requested
      </button>
    )
  }

  // ── Accepted follower — show "Following", hover to "Unfollow" ─────────────
  return (
    <button
      type="button"
      onClick={() => unfollow.mutate()}
      disabled={isPending}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={`min-w-[7rem] rounded-xl border px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
        hovering
          ? 'border-red-400/50 bg-red-500/10 text-red-500 dark:border-red-500/40 dark:text-red-400'
          : 'border-[var(--border)] text-kula-600 hover:border-kula-400 dark:text-kula-400'
      }`}
    >
      {hovering ? 'Unfollow' : 'Following'}
    </button>
  )
}
