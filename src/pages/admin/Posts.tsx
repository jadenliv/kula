import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { isAdmin } from '../../lib/adminConfig'
import { useAllPostsAdmin, useAdminDeletePost } from '../../hooks/usePosts'
import { Spinner } from '../../components/ui/Spinner'
import type { AdminPost } from '../../services/posts'

export default function AdminPosts() {
  const { user } = useAuth()

  if (!isAdmin(user?.id)) {
    return (
      <div className="mx-auto max-w-lg py-24 text-center">
        <p className="text-sm text-kula-500 dark:text-kula-400">
          You don't have permission to view this page.{' '}
          <Link to="/today" className="text-kula-600 underline-offset-2 hover:underline dark:text-kula-300">
            Go home →
          </Link>
        </p>
      </div>
    )
  }

  return <PostsPage />
}

function PostsPage() {
  const [search, setSearch] = useState('')
  const { data: posts, isLoading } = useAllPostsAdmin()

  const visible = (posts ?? []).filter((p) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      (p.author_username ?? '').toLowerCase().includes(q) ||
      (p.title ?? '').toLowerCase().includes(q) ||
      p.body.toLowerCase().includes(q)
    )
  })

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-serif text-3xl tracking-tight text-kula-900 dark:text-kula-50">
            Posts
          </h2>
          <p className="mt-1 text-sm text-kula-500 dark:text-kula-400">
            All user posts · {posts?.length ?? '—'} total
          </p>
        </div>
        <Link
          to="/admin/reports"
          className="text-xs text-kula-400 transition-colors hover:text-kula-700 dark:text-kula-600 dark:hover:text-kula-300"
        >
          ← Reports
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <svg
          viewBox="0 0 20 20"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-kula-400 dark:text-kula-600"
          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <circle cx="8.5" cy="8.5" r="5.5" /><path d="M15 15l3 3" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by username, title, or body…"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2 pl-9 pr-3 text-sm text-kula-900 placeholder:text-kula-400 focus:border-kula-400 focus:outline-none dark:text-kula-100"
        />
      </div>

      {/* List */}
      {isLoading && (
        <div className="flex justify-center py-12"><Spinner size="md" /></div>
      )}

      {!isLoading && visible.length === 0 && (
        <p className="py-12 text-center text-sm text-kula-400 dark:text-kula-600">
          {search ? 'No posts match that search.' : 'No posts yet.'}
        </p>
      )}

      {!isLoading && visible.length > 0 && (
        <div className="space-y-3">
          {visible.map((post) => (
            <PostRow key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Post row ──────────────────────────────────────────────────────────────────

function PostRow({ post }: { post: AdminPost }) {
  const [confirming, setConfirming] = useState(false)
  const deletePost = useAdminDeletePost()

  const handleDelete = () => {
    deletePost.mutate(
      { id: post.id },
      { onSuccess: () => setConfirming(false) },
    )
  }

  const preview = post.body.length > 200 ? post.body.slice(0, 200) + '…' : post.body

  return (
    <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      {/* Meta row */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={`/u/${post.author_username ?? ''}`}
              className="text-sm font-medium text-kula-700 transition-colors hover:text-kula-500 dark:text-kula-300 dark:hover:text-kula-400"
            >
              @{post.author_username ?? 'unknown'}
            </Link>
            <PrivacyBadge privacy={post.privacy} />
            <time className="text-xs text-kula-400 dark:text-kula-600">
              {formatDate(post.created_at)}
            </time>
          </div>
          {post.title && (
            <p className="font-serif text-sm font-medium text-kula-800 dark:text-kula-200">
              {post.title}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          <Link
            to={`/posts/${post.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-kula-500 transition-colors hover:border-kula-400 hover:text-kula-700 dark:text-kula-500 dark:hover:text-kula-300"
          >
            View
          </Link>

          {confirming ? (
            <span className="flex items-center gap-2">
              <span className="text-xs text-red-500">Delete this post?</span>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deletePost.isPending}
                className="text-xs font-medium text-red-500 hover:text-red-600 disabled:opacity-50"
              >
                {deletePost.isPending ? 'Deleting…' : 'Yes'}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="text-xs text-kula-400 hover:text-kula-600 dark:hover:text-kula-300"
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="rounded-xl border border-red-300/50 px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:border-red-400 hover:bg-red-500/5 dark:border-red-500/30 dark:hover:border-red-400/50"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Body preview */}
      <p className="whitespace-pre-wrap text-sm text-kula-600 dark:text-kula-400">
        {preview}
      </p>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function PrivacyBadge({ privacy }: { privacy: string }) {
  const styles: Record<string, string> = {
    public: 'bg-green-500/10 text-green-700 dark:text-green-400',
    followers: 'bg-kula-500/10 text-kula-600 dark:text-kula-400',
    private: 'bg-kula-200/50 text-kula-500 dark:bg-kula-800/50 dark:text-kula-500',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles[privacy] ?? ''}`}>
      {privacy}
    </span>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}
