import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { usePost, useUpdatePost } from '../../hooks/usePosts'
import { useProfile } from '../../context/ProfileContext'
import { useAuth } from '../../context/AuthContext'
import { PostForm } from '../../components/posts/PostForm'
import { Spinner } from '../../components/ui/Spinner'
import type { PostPrivacy } from '../../services/posts'

export default function EditPost() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: post, isLoading } = usePost(id)
  const update = useUpdatePost()
  const { profile } = useProfile()
  const [error, setError] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="md" />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="mx-auto max-w-2xl py-24 text-center">
        <p className="text-sm text-kula-500">Post not found.</p>
      </div>
    )
  }

  // Only the author may edit
  if (post.user_id !== user?.id) {
    return (
      <div className="mx-auto max-w-2xl py-24 text-center">
        <p className="text-sm text-kula-500">You can only edit your own posts.</p>
      </div>
    )
  }

  const postsPagePrivacy = (profile?.posts_page_privacy ?? 'public') as PostPrivacy
  const profileIsPrivate = profile?.visibility === 'private'

  const handleSubmit = ({
    title,
    body,
    privacy,
  }: {
    title: string
    body: string
    privacy: PostPrivacy
  }) => {
    setError(null)
    update.mutate(
      { id: post.id, title: title || undefined, body, privacy },
      {
        onSuccess: () => navigate(`/posts/${post.id}`),
        onError: (err) =>
          setError(err instanceof Error ? err.message : 'Failed to save.'),
      },
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <p className="mb-6 text-xs font-medium uppercase tracking-widest text-kula-400 dark:text-kula-600">
        Editing post
      </p>
      <PostForm
        initialTitle={post.title ?? ''}
        initialBody={post.body}
        initialPrivacy={post.privacy}
        postsPagePrivacy={postsPagePrivacy}
        profileIsPrivate={profileIsPrivate}
        submitLabel="Save changes"
        isPending={update.isPending}
        error={error}
        onSubmit={handleSubmit}
        onCancel={() => navigate(`/posts/${post.id}`)}
      />
    </div>
  )
}
