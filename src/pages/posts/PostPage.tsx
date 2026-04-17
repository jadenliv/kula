import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { usePost, useDeletePost } from '../../hooks/usePosts'
import { useAuth } from '../../context/AuthContext'
import { MarkdownBody } from '../../components/posts/MarkdownBody'
import { PostPrivacyIcon } from '../../components/posts/PostCard'
import { POST_PRIVACY_LABELS } from '../../components/posts/PostPrivacySelector'
import { ReportButton } from '../../components/profile/ReportButton'
import { Spinner } from '../../components/ui/Spinner'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function PostPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: post, isLoading } = usePost(id)
  const deletePost = useDeletePost()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="md" />
      </div>
    )
  }

  // ── Not found / inaccessible ──────────────────────────────────────────────

  if (!post) {
    return (
      <div className="mx-auto max-w-2xl py-24 text-center">
        <p className="text-sm text-kula-500 dark:text-kula-400">
          This post doesn't exist, or it's only visible to the author's followers.
        </p>
        <Link
          to="/"
          className="mt-3 inline-block text-sm text-kula-600 underline-offset-2 hover:underline dark:text-kula-300"
        >
          Go home →
        </Link>
      </div>
    )
  }

  // ── Followers-only gate (post returned but viewer isn't author) ───────────
  // RLS currently only returns followers posts to the author, so this branch
  // is a safety net for when the follow graph is added and RLS is relaxed.

  const isAuthor = user?.id === post.user_id

  if (post.privacy === 'followers' && !isAuthor) {
    return (
      <div className="mx-auto max-w-2xl py-24 text-center">
        <p className="text-sm text-kula-500 dark:text-kula-400">
          This post is only visible to the author's followers.
        </p>
        {!user && (
          <Link
            to="/signin"
            className="mt-3 inline-block text-sm text-kula-600 underline-offset-2 hover:underline dark:text-kula-300"
          >
            Sign in →
          </Link>
        )}
      </div>
    )
  }

  // ── Delete flow ───────────────────────────────────────────────────────────

  const handleDelete = () => {
    setDeleteError(null)
    deletePost.mutate(
      { id: post.id },
      {
        onSuccess: () => navigate('/today'),
        onError: (err) =>
          setDeleteError(err instanceof Error ? err.message : 'Failed to delete.'),
      },
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {/* Header meta */}
      <div className="mb-8 space-y-1">
        {post.title && (
          <h1 className="font-serif text-3xl font-medium leading-tight tracking-tight text-kula-900 dark:text-kula-50 md:text-4xl">
            {post.title}
          </h1>
        )}
        <div className="flex flex-wrap items-center gap-2 text-sm text-kula-400 dark:text-kula-600">
          <time dateTime={post.created_at}>{formatDate(post.created_at)}</time>
          {post.updated_at !== post.created_at && <span>· edited</span>}
          <span>·</span>
          <span className="flex items-center gap-1" title={POST_PRIVACY_LABELS[post.privacy]}>
            <PostPrivacyIcon privacy={post.privacy} />
            {POST_PRIVACY_LABELS[post.privacy]}
          </span>
          {!isAuthor && (
            <>
              <span>·</span>
              <ReportButton targetType="post" targetId={post.id} />
            </>
          )}
          {isAuthor && (
            <>
              <span>·</span>
              <Link
                to={`/posts/${post.id}/edit`}
                className="text-kula-500 transition-colors hover:text-kula-700 dark:text-kula-500 dark:hover:text-kula-300"
              >
                Edit
              </Link>
              <span>·</span>
              {confirmDelete ? (
                <span className="inline-flex items-center gap-2">
                  <span className="text-red-500">Delete this post?</span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deletePost.isPending}
                    className="font-medium text-red-500 hover:text-red-600"
                  >
                    {deletePost.isPending ? 'Deleting…' : 'Yes, delete'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="text-kula-400 hover:text-kula-600"
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="text-kula-500 transition-colors hover:text-red-500 dark:text-kula-500"
                >
                  Delete
                </button>
              )}
            </>
          )}
        </div>
        {deleteError && (
          <p className="text-sm text-red-500">{deleteError}</p>
        )}
      </div>

      {/* Body */}
      <MarkdownBody
        body={post.body}
        className="text-kula-800 dark:text-kula-200"
      />
    </div>
  )
}
