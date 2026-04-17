import { Link } from 'react-router-dom'
import type { Post, PostPrivacy } from '../../services/posts'
import { POST_PRIVACY_LABELS } from './PostPrivacySelector'

/** Privacy indicator icon — same SVGs as PostPrivacySelector, standalone. */
export function PostPrivacyIcon({
  privacy,
  className = '',
}: {
  privacy: PostPrivacy
  className?: string
}) {
  if (privacy === 'private') {
    return (
      <svg viewBox="0 0 16 16" className={`h-3 w-3 ${className}`} fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-label="Private">
        <rect x="3" y="7" width="10" height="7" rx="1.5" />
        <path d="M5 7V5a3 3 0 016 0v2" />
      </svg>
    )
  }
  if (privacy === 'followers') {
    return (
      <svg viewBox="0 0 16 16" className={`h-3 w-3 ${className}`} fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-label="Followers only">
        <circle cx="6" cy="5" r="2" />
        <path d="M2 13c0-2.21 1.79-4 4-4s4 1.79 4 4" />
        <circle cx="12" cy="5" r="1.5" />
        <path d="M14 13c0-1.66-1-3-2.5-3" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 16 16" className={`h-3 w-3 ${className}`} fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-label="Public">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 2c-1.5 2-2.5 3.8-2.5 6s1 4 2.5 6M8 2c1.5 2 2.5 3.8 2.5 6S9.5 12 8 14M2 8h12" />
    </svg>
  )
}

/** Strip markdown syntax for the preview snippet. */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/\n+/g, ' ')
    .trim()
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  })
}

type Props = {
  post: Post
  /** Show privacy indicator (e.g. on own profile). Default false. */
  showPrivacy?: boolean
}

export function PostCard({ post, showPrivacy = false }: Props) {
  const snippet = stripMarkdown(post.body).slice(0, 200)
  const truncated = stripMarkdown(post.body).length > 200

  return (
    <Link
      to={`/posts/${post.id}`}
      className="block rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4 transition-colors hover:border-kula-400/60 hover:bg-[var(--surface-overlay)]"
    >
      {post.title && (
        <h3 className="mb-1.5 font-serif text-lg font-medium leading-snug text-kula-900 dark:text-kula-50">
          {post.title}
        </h3>
      )}
      <p className="text-sm leading-relaxed text-kula-700 dark:text-kula-300">
        {snippet}
        {truncated && <span className="text-kula-400 dark:text-kula-600">…</span>}
      </p>
      <div className="mt-3 flex items-center gap-2 text-xs text-kula-400 dark:text-kula-600">
        <time dateTime={post.created_at}>{formatDate(post.created_at)}</time>
        {post.updated_at !== post.created_at && (
          <span>· edited</span>
        )}
        {showPrivacy && (
          <>
            <span>·</span>
            <span
              className="flex items-center gap-1"
              title={POST_PRIVACY_LABELS[post.privacy]}
            >
              <PostPrivacyIcon privacy={post.privacy} />
              {POST_PRIVACY_LABELS[post.privacy]}
            </span>
          </>
        )}
      </div>
    </Link>
  )
}
