import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { usePost, useDeletePost, useAdminDeletePost, useLikeStatus, useLike, useComments, useAddComment, useDeleteComment } from '../../hooks/usePosts'
import { useAuth } from '../../context/AuthContext'
import { isAdmin } from '../../lib/adminConfig'
import { MarkdownBody } from '../../components/posts/MarkdownBody'
import { PostPrivacyIcon } from '../../components/posts/PostCard'
import { POST_PRIVACY_LABELS } from '../../components/posts/PostPrivacySelector'
import { ReportButton } from '../../components/profile/ReportButton'
import { Avatar } from '../../components/ui/Avatar'
import { Spinner } from '../../components/ui/Spinner'
import type { PostComment } from '../../services/posts'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

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

export default function PostPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: post, isLoading } = usePost(id)
  const deletePost = useDeletePost()
  const adminDelete = useAdminDeletePost()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmAdminDelete, setConfirmAdminDelete] = useState(false)
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
  const isModerator = isAdmin(user?.id) && !isAuthor

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
          {isModerator && (
            <>
              <span>·</span>
              {confirmAdminDelete ? (
                <span className="inline-flex items-center gap-2">
                  <span className="text-red-500">Remove this post?</span>
                  <button
                    type="button"
                    onClick={() => adminDelete.mutate({ id: post.id }, { onSuccess: () => navigate('/admin/posts') })}
                    disabled={adminDelete.isPending}
                    className="font-medium text-red-500 hover:text-red-600"
                  >
                    {adminDelete.isPending ? 'Removing…' : 'Yes, remove'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmAdminDelete(false)}
                    className="text-kula-400 hover:text-kula-600"
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmAdminDelete(true)}
                  className="text-red-400 transition-colors hover:text-red-500"
                  title="Moderator: remove this post"
                >
                  Remove (mod)
                </button>
              )}
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

      {/* Like + comment count bar */}
      <LikeBar postId={post.id} />

      {/* Comments */}
      <CommentsSection postId={post.id} currentUserId={user?.id} />
    </div>
  )
}

// ── Like bar ──────────────────────────────────────────────────────────────────

function LikeBar({ postId }: { postId: string }) {
  const { user } = useAuth()
  const { data: likeStatus } = useLikeStatus(postId)
  const likeMutation = useLike(postId)
  const { data: comments } = useComments(postId)

  const liked = likeStatus?.liked ?? false
  const likeCount = likeStatus?.likeCount ?? 0
  const commentCount = comments?.length ?? 0

  function handleLike() {
    if (!user) return
    likeMutation.mutate({ currentlyLiked: liked })
  }

  return (
    <div className="mt-8 flex items-center gap-5 border-t border-[var(--border)] pt-4">
      <button
        type="button"
        onClick={handleLike}
        disabled={!user || likeMutation.isPending}
        className={`flex items-center gap-2 text-sm transition-colors disabled:opacity-40 ${
          liked
            ? 'text-kula-500 dark:text-kula-400'
            : 'text-kula-400 hover:text-kula-600 dark:text-kula-600 dark:hover:text-kula-400'
        }`}
      >
        <svg viewBox="0 0 20 20" className="h-5 w-5" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 17C10 17 2.5 12 2.5 7.5C2.5 5.01 4.51 3 7 3C8.37 3 9.6 3.67 10 4.5C10.4 3.67 11.63 3 13 3C15.49 3 17.5 5.01 17.5 7.5C17.5 12 10 17 10 17Z" />
        </svg>
        <span>{likeCount > 0 ? likeCount : ''} {liked ? 'Liked' : 'Like'}</span>
      </button>

      <span className="flex items-center gap-2 text-sm text-kula-400 dark:text-kula-600">
        <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h12a1 1 0 011 1v7a1 1 0 01-1 1H7l-3 3V5a1 1 0 011-1z" />
        </svg>
        <span>{commentCount} {commentCount === 1 ? 'comment' : 'comments'}</span>
      </span>
    </div>
  )
}

// ── Comments section ──────────────────────────────────────────────────────────

function CommentsSection({
  postId,
  currentUserId,
}: {
  postId: string
  currentUserId: string | undefined
}) {
  const { data: comments, isLoading } = useComments(postId)
  const addComment = useAddComment(postId)
  const deleteComment = useDeleteComment(postId)
  const [body, setBody] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setSubmitError(null)
    addComment.mutate(body.trim(), {
      onSuccess: () => setBody(''),
      onError: (err) =>
        setSubmitError(err instanceof Error ? err.message : 'Failed to post comment.'),
    })
  }

  return (
    <div className="mt-8 space-y-5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-kula-400 dark:text-kula-600">
        Comments
      </h3>

      {/* Comment list */}
      {isLoading ? (
        <div className="flex justify-center py-6"><Spinner size="sm" /></div>
      ) : (comments ?? []).length === 0 ? (
        <p className="text-sm text-kula-400 dark:text-kula-600">
          No comments yet. Be the first.
        </p>
      ) : (
        <div className="space-y-4">
          {(comments ?? []).map((comment) => (
            <CommentRow
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              onDelete={(id) => deleteComment.mutate(id)}
            />
          ))}
        </div>
      )}

      {/* Comment input */}
      {currentUserId && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add a comment…"
            rows={3}
            maxLength={1000}
            className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-kula-900 placeholder-kula-400 transition-colors focus:border-kula-400 focus:outline-none dark:text-kula-100 dark:placeholder-kula-600"
          />
          {submitError && (
            <p className="text-xs text-red-500">{submitError}</p>
          )}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!body.trim() || addComment.isPending}
              className="rounded-xl bg-kula-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-kula-500 disabled:opacity-40 dark:bg-kula-500 dark:hover:bg-kula-400"
            >
              {addComment.isPending ? 'Posting…' : 'Post'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

// ── Single comment row ────────────────────────────────────────────────────────

function CommentRow({
  comment,
  currentUserId,
  onDelete,
}: {
  comment: PostComment
  currentUserId: string | undefined
  onDelete: (id: string) => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const isOwn = comment.user_id === currentUserId
  const name = comment.profile?.display_name || comment.profile?.username || 'Unknown'

  return (
    <div className="flex gap-3">
      <Link to={comment.profile ? `/u/${comment.profile.username}` : '#'} className="shrink-0 mt-0.5">
        <Avatar profile={comment.profile} size="xs" />
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <Link
            to={comment.profile ? `/u/${comment.profile.username}` : '#'}
            className="text-xs font-medium text-kula-800 hover:text-kula-600 dark:text-kula-200 dark:hover:text-kula-300"
          >
            {name}
          </Link>
          <time className="text-[10px] text-kula-400 dark:text-kula-600">
            {timeAgo(comment.created_at)}
          </time>
          {isOwn && (
            confirmDelete ? (
              <span className="ml-auto flex items-center gap-1.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => { onDelete(comment.id); setConfirmDelete(false) }}
                  className="text-red-500 hover:text-red-600"
                >
                  Delete
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
                className="ml-auto text-[10px] text-kula-400 hover:text-red-400 transition-colors"
              >
                Delete
              </button>
            )
          )}
        </div>
        <p className="mt-0.5 text-sm text-kula-700 dark:text-kula-300 whitespace-pre-wrap">
          {comment.body}
        </p>
      </div>
    </div>
  )
}
