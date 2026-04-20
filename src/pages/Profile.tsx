import { useParams, Link } from 'react-router-dom'
import { useProfileByUsername } from '../hooks/useProfile'
import { useProfile } from '../context/ProfileContext'
import { useCompletions } from '../hooks/useCompletions'
import { usePostsForUser } from '../hooks/usePosts'
import { useFollowStatus, useFollowCounts } from '../hooks/useFollows'
import { Avatar } from '../components/ui/Avatar'
import { PostCard } from '../components/posts/PostCard'
import { FollowButton } from '../components/profile/FollowButton'
import { ReportButton } from '../components/profile/ReportButton'
import { Spinner } from '../components/ui/Spinner'
import { POSTS_ENABLED } from '../lib/featureFlags'
import type { PostPrivacy } from '../services/posts'
import type { Follow } from '../services/follows'

export default function Profile() {
  const { username } = useParams<{ username: string }>()
  const { data: profile, isLoading, error } = useProfileByUsername(username)
  const { profile: ownProfile } = useProfile()

  // These hooks are called unconditionally — they're no-ops when profile.id is undefined.
  const { data: followStatus } = useFollowStatus(profile?.id)
  const { data: counts } = useFollowCounts(profile?.id)

  const isOwner = ownProfile != null && profile != null && ownProfile.id === profile.id
  const isAcceptedFollower = followStatus?.status === 'accepted'
  const isPrivate = profile?.visibility === 'private'

  if (isLoading) {
    return <div className="flex justify-center py-24"><Spinner size="md" /></div>
  }

  if (error || !profile) {
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

  // Private profile gate: non-owner, non-accepted-follower sees a minimal view
  // with a follow button so they can request access.
  if (isPrivate && !isOwner && !isAcceptedFollower) {
    return (
      <div className="mx-auto max-w-lg space-y-6 py-12">
        <ProfileHeader
          profile={profile}
          isOwner={false}
          followStatus={followStatus}
          counts={counts}
        />
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-raised)] px-6 py-10 text-center">
          <p className="mb-4 text-sm text-kula-500 dark:text-kula-400">
            {followStatus?.status === 'pending'
              ? 'Your follow request is pending approval.'
              : 'This profile is private. Follow to request access.'}
          </p>
          {ownProfile && !isOwner && (
            <FollowButton
              targetUserId={profile.id}
              targetVisibility={profile.visibility as 'public' | 'private'}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-10 py-6">
      <ProfileHeader
        profile={profile}
        isOwner={isOwner}
        followStatus={followStatus}
        counts={counts}
      />

      {/* Progress stats — owner only */}
      {isOwner && <StatsSection />}

      {/* Posts section — visible based on posts_page_privacy + follow status */}
      {POSTS_ENABLED && (
        <PostsSection
          profileId={profile.id}
          isOwner={isOwner}
          isAcceptedFollower={isAcceptedFollower}
          postsPagePrivacy={(profile.posts_page_privacy ?? 'public') as PostPrivacy}
        />
      )}
    </div>
  )
}

// ── Profile header ────────────────────────────────────────────────────────────

type ProfileData = {
  id: string
  username: string
  display_name: string
  bio: string
  visibility: string
  share_activity: string
  share_notes: string
  share_posts: string
  posts_page_privacy: string
  created_at: string
  updated_at: string
}

function ProfileHeader({
  profile,
  isOwner,
  followStatus,
  counts,
}: {
  profile: ProfileData
  isOwner: boolean
  followStatus: Follow | null | undefined
  counts: { followers: number; following: number } | undefined
}) {
  const { profile: ownProfile } = useProfile()
  const showFollowButton = !isOwner && ownProfile != null

  return (
    <header className="space-y-4">
      <div className="flex items-start gap-4">
        <Avatar profile={profile} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-2xl tracking-tight text-kula-900 dark:text-kula-50">
            {profile.display_name || profile.username}
          </h1>
          <p className="text-sm text-kula-400 dark:text-kula-600">@{profile.username}</p>
          {profile.bio && (
            <p dir="auto" className="mt-2 text-sm text-kula-700 dark:text-kula-300">{profile.bio}</p>
          )}
        </div>

        {/* Actions column */}
        <div className="flex shrink-0 flex-col items-end gap-2">
          {isOwner ? (
            <Link
              to="/settings"
              className="rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-kula-500 transition-colors hover:border-kula-400 hover:text-kula-700 dark:text-kula-500 dark:hover:text-kula-300"
            >
              Edit profile
            </Link>
          ) : (
            showFollowButton && (
              <FollowButton
                targetUserId={profile.id}
                targetVisibility={profile.visibility as 'public' | 'private'}
              />
            )
          )}
          {!isOwner && ownProfile && (
            <ReportButton targetType="user" targetId={profile.id} />
          )}
        </div>
      </div>

      {/* Follow counts */}
      {counts != null && (profile.visibility === 'public' || isOwner || followStatus?.status === 'accepted') && (
        <div className="flex gap-4">
          <Link
            to={`/u/${profile.username}/followers`}
            className="text-sm text-kula-500 transition-colors hover:text-kula-700 dark:text-kula-400 dark:hover:text-kula-200"
          >
            <span className="font-semibold text-kula-800 dark:text-kula-100">{counts.followers}</span>
            {' '}followers
          </Link>
          <Link
            to={`/u/${profile.username}/following`}
            className="text-sm text-kula-500 transition-colors hover:text-kula-700 dark:text-kula-400 dark:hover:text-kula-200"
          >
            <span className="font-semibold text-kula-800 dark:text-kula-100">{counts.following}</span>
            {' '}following
          </Link>
        </div>
      )}
    </header>
  )
}

// ── Stats ─────────────────────────────────────────────────────────────────────

function StatsSection() {
  const { data: completions } = useCompletions()
  const totalCompleted = completions
    ? completions.filter((c) => !c.sefaria_ref.startsWith('custom:')).length
    : null

  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-kula-400 dark:text-kula-600">
        Progress
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Sections learned" value={totalCompleted ?? '—'} />
        <StatCard label="Notes written" value="—" />
      </div>
      <p className="mt-3 text-center text-xs text-kula-400 dark:text-kula-600">
        Detailed stats on your{' '}
        <Link to="/dashboard" className="text-kula-500 underline-offset-2 hover:underline dark:text-kula-400">
          Dashboard
        </Link>
      </p>
    </section>
  )
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-center">
      <p className="font-serif text-2xl font-medium text-kula-800 dark:text-kula-200">{value}</p>
      <p className="mt-1 text-xs text-kula-500 dark:text-kula-400">{label}</p>
    </div>
  )
}

// ── Posts section ─────────────────────────────────────────────────────────────

const PRIVACY_LEVEL: Record<PostPrivacy, number> = { public: 0, followers: 1, private: 2 }

function PostsSection({
  profileId,
  isOwner,
  isAcceptedFollower,
  postsPagePrivacy,
}: {
  profileId: string
  isOwner: boolean
  isAcceptedFollower: boolean
  postsPagePrivacy: PostPrivacy
}) {
  const { data: posts, isLoading } = usePostsForUser(profileId)

  // Visibility rules for the entire section:
  // - owner: always visible
  // - accepted follower: visible if postsPagePrivacy ≤ followers
  // - public: visible if postsPagePrivacy === 'public'
  // - everyone else: hidden
  if (!isOwner) {
    if (postsPagePrivacy === 'private') return null
    if (postsPagePrivacy === 'followers' && !isAcceptedFollower) return null
  }

  if (isLoading) return null

  const allPosts = posts ?? []

  // Individual post visibility:
  // - owner: see all own posts
  // - accepted follower: see public + followers posts
  // - public visitor: see only public posts
  const displayPosts = isOwner
    ? allPosts
    : allPosts.filter((p) => {
        const postLevel = PRIVACY_LEVEL[p.privacy as PostPrivacy] ?? 0
        const viewerMaxLevel = isAcceptedFollower ? PRIVACY_LEVEL.followers : PRIVACY_LEVEL.public
        return postLevel <= viewerMaxLevel
      })

  if (displayPosts.length === 0 && !isOwner) return null

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-kula-400 dark:text-kula-600">
          Posts
        </h2>
        {isOwner && (
          <Link
            to="/posts/new"
            className="text-xs text-kula-500 underline-offset-2 hover:underline dark:text-kula-400"
          >
            New post →
          </Link>
        )}
      </div>

      {displayPosts.length === 0 ? (
        <p className="text-sm text-kula-400 dark:text-kula-600">
          {isOwner && (
            <Link to="/posts/new" className="text-kula-500 underline-offset-2 hover:underline dark:text-kula-400">
              Write your first post →
            </Link>
          )}
        </p>
      ) : (
        <div className="space-y-3">
          {displayPosts.map((post) => (
            <PostCard key={post.id} post={post} showPrivacy={isOwner} />
          ))}
        </div>
      )}
    </section>
  )
}
