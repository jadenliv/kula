import { Link } from 'react-router-dom'
import { useProfile } from '../../context/ProfileContext'
import {
  useFollowRequests,
  useFollowers,
  useApproveFollowRequest,
  useDenyFollowRequest,
  useRemoveFollower,
} from '../../hooks/useFollows'
import { Avatar } from '../../components/ui/Avatar'
import { Spinner } from '../../components/ui/Spinner'
import type { FollowWithProfile } from '../../services/follows'

export default function FollowRequests() {
  const { profile } = useProfile()
  const { data: requests, isLoading: requestsLoading } = useFollowRequests()
  const { data: followers, isLoading: followersLoading } = useFollowers(profile?.id)

  if (!profile) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="md" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-8">
      {/* Page header */}
      <div>
        <Link
          to="/settings"
          className="mb-4 flex items-center gap-1 text-xs text-kula-400 transition-colors hover:text-kula-700 dark:text-kula-600 dark:hover:text-kula-300"
        >
          ← Settings
        </Link>
        <h2 className="font-serif text-3xl tracking-tight text-kula-900 dark:text-kula-50">
          Followers
        </h2>
        <p className="mt-1 text-sm text-kula-500 dark:text-kula-400">
          Manage follow requests and your current followers.
        </p>
      </div>

      {/* Pending requests */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-kula-400 dark:text-kula-600">
          Pending requests
          {requests?.length ? (
            <span className="ml-2 rounded-full bg-kula-700 px-1.5 py-0.5 text-[10px] text-white dark:bg-kula-400 dark:text-kula-950">
              {requests.length}
            </span>
          ) : null}
        </h3>
        {requestsLoading ? (
          <div className="flex justify-center py-6"><Spinner size="sm" /></div>
        ) : !requests?.length ? (
          <p className="rounded-xl border border-dashed border-[var(--border)] py-8 text-center text-sm text-kula-400 dark:text-kula-600">
            No pending requests.
          </p>
        ) : (
          <div className="space-y-2">
            {requests.map((req) => (
              <RequestRow key={req.id} request={req} />
            ))}
          </div>
        )}
      </section>

      {/* Current followers */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-kula-400 dark:text-kula-600">
          Followers
          {followers?.length ? (
            <span className="ml-2 rounded-full bg-kula-100 px-1.5 py-0.5 text-[10px] text-kula-600 dark:bg-kula-800 dark:text-kula-400">
              {followers.length}
            </span>
          ) : null}
        </h3>
        {followersLoading ? (
          <div className="flex justify-center py-6"><Spinner size="sm" /></div>
        ) : !followers?.length ? (
          <p className="rounded-xl border border-dashed border-[var(--border)] py-8 text-center text-sm text-kula-400 dark:text-kula-600">
            No followers yet.
          </p>
        ) : (
          <div className="space-y-2">
            {followers.map((f) => (
              <FollowerRow key={f.id} follower={f} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

// ── Request row (pending) ─────────────────────────────────────────────────────

function RequestRow({ request }: { request: FollowWithProfile }) {
  const approve = useApproveFollowRequest()
  const deny = useDenyFollowRequest()
  const isPending = approve.isPending || deny.isPending

  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
      <Avatar profile={request.profile} size="sm" />
      <Link to={`/u/${request.profile.username}`} className="min-w-0 flex-1 group">
        <p className="truncate text-sm font-medium text-kula-800 transition-colors group-hover:text-kula-600 dark:text-kula-200 dark:group-hover:text-kula-300">
          {request.profile.display_name || request.profile.username}
        </p>
        <p className="truncate text-xs text-kula-400 dark:text-kula-600">
          @{request.profile.username}
        </p>
      </Link>

      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => deny.mutate({ followId: request.id })}
          disabled={isPending}
          className="rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-kula-500 transition-colors hover:border-kula-400 hover:text-kula-700 disabled:opacity-50 dark:text-kula-500 dark:hover:text-kula-300"
        >
          Decline
        </button>
        <button
          type="button"
          onClick={() => approve.mutate({ followId: request.id })}
          disabled={isPending}
          className="rounded-xl bg-kula-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-kula-800 disabled:opacity-50 dark:bg-kula-400 dark:text-kula-950 dark:hover:bg-kula-300"
        >
          Approve
        </button>
      </div>
    </div>
  )
}

// ── Follower row (accepted) ───────────────────────────────────────────────────

function FollowerRow({ follower }: { follower: FollowWithProfile }) {
  const remove = useRemoveFollower()

  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
      <Avatar profile={follower.profile} size="sm" />
      <Link to={`/u/${follower.profile.username}`} className="min-w-0 flex-1 group">
        <p className="truncate text-sm font-medium text-kula-800 transition-colors group-hover:text-kula-600 dark:text-kula-200 dark:group-hover:text-kula-300">
          {follower.profile.display_name || follower.profile.username}
        </p>
        <p className="truncate text-xs text-kula-400 dark:text-kula-600">
          @{follower.profile.username}
        </p>
      </Link>

      <button
        type="button"
        onClick={() => remove.mutate({ followerUserId: follower.follower_user_id })}
        disabled={remove.isPending}
        className="shrink-0 rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-kula-500 transition-colors hover:border-kula-400 hover:text-kula-700 disabled:opacity-50 dark:text-kula-500 dark:hover:text-kula-300"
      >
        Remove
      </button>
    </div>
  )
}
