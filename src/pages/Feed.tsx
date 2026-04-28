import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useFeed } from '../hooks/useFeed'
import { useAuth } from '../context/AuthContext'
import { Avatar } from '../components/ui/Avatar'
import { Spinner } from '../components/ui/Spinner'
import { ReportButton } from '../components/profile/ReportButton'
import { PrivacyIcon } from '../components/notes/NotesPanel'
import { PostPrivacyIcon } from '../components/posts/PostCard'
import { likePost, unlikePost } from '../services/posts'
import type { FeedItem, FeedItemNote, FeedItemPost, FeedProfile } from '../services/feed'
import type { NotePrivacy } from '../services/notes'

export default function Feed() {
  const { data, isLoading } = useFeed()

  if (isLoading) {
    return <div className="flex justify-center py-24"><Spinner size="md" /></div>
  }

  const result = data ?? { items: [], hasFollows: false }

  // ── Empty state: no follows and no own content ────────────────────────────
  if (!result.hasFollows && result.items.length === 0) {
    return (
      <div className="mx-auto max-w-lg">
        <FeedHeader />
        <div className="mt-8 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-raised)] px-8 py-12 text-center">
          <p className="text-sm text-kula-600 dark:text-kula-400">
            Follow people to see what they are learning.
          </p>
          <p className="mt-1 text-sm text-kula-500 dark:text-kula-500">
            <Link
              to="/discover"
              className="font-medium text-kula-600 underline-offset-2 hover:underline dark:text-kula-300"
            >
              Try the Discover page →
            </Link>
          </p>
        </div>
      </div>
    )
  }

  // ── Empty state: has follows, but no content in the window ────────────────
  if (result.items.length === 0) {
    return (
      <div className="mx-auto max-w-lg">
        <FeedHeader />
        <div className="mt-8 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-raised)] px-8 py-12 text-center">
          <p className="text-sm text-kula-500 dark:text-kula-400">
            No activity from the people you follow in the last 7 days.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg">
      <FeedHeader />
      <div className="mt-6 space-y-3">
        {result.items.map((item) => (
          <FeedItemRow key={item.id} item={item} />
        ))}
      </div>
      <div className="py-10 text-center">
        <p className="text-xs text-kula-300 dark:text-kula-700">
          You're all caught up — showing the last 7 days.
        </p>
      </div>
    </div>
  )
}

// ── Feed header ───────────────────────────────────────────────────────────────

function FeedHeader() {
  return (
    <div className="flex items-baseline justify-between">
      <h2 className="font-serif text-3xl tracking-tight text-kula-900 dark:text-kula-50">
        Feed
      </h2>
      <Link
        to="/discover"
        className="text-xs text-kula-400 transition-colors hover:text-kula-700 dark:text-kula-600 dark:hover:text-kula-300"
      >
        Discover people →
      </Link>
    </div>
  )
}

// ── Item router ───────────────────────────────────────────────────────────────

function FeedItemRow({ item }: { item: FeedItem }) {
  switch (item.type) {
    case 'note': return <NoteItem item={item} />
    case 'post': return <PostItem item={item} />
  }
}

// ── Note item ─────────────────────────────────────────────────────────────────

const NOTE_TRUNCATE = 400

function NoteItem({ item }: { item: FeedItemNote }) {
  const [expanded, setExpanded] = useState(false)
  const { note, profile } = item
  const isTruncated = !expanded && note.body.length > NOTE_TRUNCATE
  const displayBody = isTruncated ? note.body.slice(0, NOTE_TRUNCATE) + '…' : note.body
  const name = profile.display_name || profile.username

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
        <ProfileAvatar profile={profile} />
        <div className="min-w-0 flex-1">
          <Link
            to={`/u/${profile.username}`}
            className="text-sm font-medium text-kula-800 transition-colors hover:text-kula-600 dark:text-kula-200 dark:hover:text-kula-300"
          >
            {name}
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-kula-400 dark:text-kula-600">
            <span>{note.sefaria_ref}</span>
            <span>·</span>
            <span className="flex items-center gap-0.5" title={
              note.privacy === 'public' ? 'Public' : 'Followers only'
            }>
              <PrivacyIcon privacy={note.privacy as NotePrivacy} />
            </span>
            <span>·</span>
            <time>{timeAgo(note.created_at)}</time>
          </div>
        </div>
        <ReportButton targetType="note" targetId={note.id} />
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        <p dir="auto" className="whitespace-pre-wrap text-sm text-kula-800 dark:text-kula-200">
          {displayBody}
        </p>
        {isTruncated && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="mt-2 text-xs text-kula-500 underline-offset-2 hover:underline dark:text-kula-400"
          >
            Read more
          </button>
        )}
        {note.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {note.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-kula-500/10 px-2 py-0.5 text-xs text-kula-600 dark:bg-kula-400/10 dark:text-kula-400"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Post item ─────────────────────────────────────────────────────────────────

const POST_PREVIEW_LENGTH = 300

function PostItem({ item }: { item: FeedItemPost }) {
  const { user } = useAuth()
  const { post, profile, engagement } = item
  const name = profile.display_name || profile.username
  const preview = post.body.length > POST_PREVIEW_LENGTH
    ? post.body.slice(0, POST_PREVIEW_LENGTH) + '…'
    : post.body

  // Local optimistic like state — initialised from the feed query engagement data
  const [liked, setLiked] = useState(engagement.likedByCurrentUser)
  const [likeCount, setLikeCount] = useState(engagement.likeCount)
  const [liking, setLiking] = useState(false)

  async function handleLike() {
    if (!user || liking) return
    const wasLiked = liked
    setLiking(true)
    setLiked(!wasLiked)
    setLikeCount(wasLiked ? likeCount - 1 : likeCount + 1)
    try {
      if (wasLiked) await unlikePost(post.id)
      else await likePost(post.id)
    } catch {
      // Revert on error
      setLiked(wasLiked)
      setLikeCount(likeCount)
    } finally {
      setLiking(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
        <ProfileAvatar profile={profile} />
        <div className="min-w-0 flex-1">
          <Link
            to={`/u/${profile.username}`}
            className="text-sm font-medium text-kula-800 transition-colors hover:text-kula-600 dark:text-kula-200 dark:hover:text-kula-300"
          >
            {name}
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-kula-400 dark:text-kula-600">
            <span className="flex items-center gap-0.5" title={
              post.privacy === 'public' ? 'Public' : 'Followers only'
            }>
              <PostPrivacyIcon privacy={post.privacy as 'public' | 'followers' | 'private'} />
            </span>
            <span>·</span>
            <time>{timeAgo(post.created_at)}</time>
          </div>
        </div>
        <ReportButton targetType="post" targetId={post.id} />
      </div>

      {/* Body */}
      <Link to={`/posts/${post.id}`} className="block px-4 py-3 hover:bg-[var(--surface-raised)] transition-colors">
        {post.title && (
          <p dir="auto" className="mb-1.5 font-serif text-base font-medium text-kula-900 dark:text-kula-50">
            {post.title}
          </p>
        )}
        <p dir="auto" className="whitespace-pre-wrap text-sm text-kula-700 dark:text-kula-300">
          {preview}
        </p>
        {post.body.length > POST_PREVIEW_LENGTH && (
          <span className="mt-1.5 block text-xs text-kula-500 underline-offset-2 hover:underline dark:text-kula-400">
            Read more →
          </span>
        )}
      </Link>

      {/* Engagement bar */}
      <div className="flex items-center gap-4 border-t border-[var(--border)] px-4 py-2">
        {/* Like button */}
        <button
          type="button"
          onClick={handleLike}
          disabled={!user || liking}
          className={`flex items-center gap-1.5 text-xs transition-colors disabled:opacity-40 ${
            liked
              ? 'text-kula-500 dark:text-kula-400'
              : 'text-kula-400 hover:text-kula-600 dark:text-kula-600 dark:hover:text-kula-400'
          }`}
          title={liked ? 'Unlike' : 'Like'}
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 17C10 17 2.5 12 2.5 7.5C2.5 5.01 4.51 3 7 3C8.37 3 9.6 3.67 10 4.5C10.4 3.67 11.63 3 13 3C15.49 3 17.5 5.01 17.5 7.5C17.5 12 10 17 10 17Z" />
          </svg>
          {likeCount > 0 && <span>{likeCount}</span>}
        </button>

        {/* Comment count — links to full post */}
        <Link
          to={`/posts/${post.id}`}
          className="flex items-center gap-1.5 text-xs text-kula-400 transition-colors hover:text-kula-600 dark:text-kula-600 dark:hover:text-kula-400"
          title="Comments"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h12a1 1 0 011 1v7a1 1 0 01-1 1H7l-3 3V5a1 1 0 011-1z" />
          </svg>
          {engagement.commentCount > 0 && <span>{engagement.commentCount}</span>}
        </Link>
      </div>
    </div>
  )
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function ProfileAvatar({ profile }: { profile: FeedProfile }) {
  return (
    <Link to={`/u/${profile.username}`} className="shrink-0" tabIndex={-1}>
      <Avatar profile={profile} size="sm" />
    </Link>
  )
}

// ── Time helpers ──────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
