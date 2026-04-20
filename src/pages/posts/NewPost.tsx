import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { track } from '@vercel/analytics'
import { useCreatePost } from '../../hooks/usePosts'
import { useProfile } from '../../context/ProfileContext'
import { PostForm } from '../../components/posts/PostForm'
import type { PostPrivacy } from '../../services/posts'

export default function NewPost() {
  const navigate = useNavigate()
  const create = useCreatePost()
  const { profile } = useProfile()
  const [error, setError] = useState<string | null>(null)

  const postsPagePrivacy = (profile?.posts_page_privacy ?? 'public') as PostPrivacy
  const profileIsPrivate = profile?.visibility === 'private'

  // Default: use share_posts, capped by postsPagePrivacy
  const LEVEL: Record<PostPrivacy, number> = { public: 0, followers: 1, private: 2 }
  const sharePosts = (profile?.share_posts ?? 'public') as PostPrivacy
  const defaultPrivacy: PostPrivacy =
    LEVEL[sharePosts] < LEVEL[postsPagePrivacy] ? postsPagePrivacy : sharePosts

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
    create.mutate(
      { title: title || undefined, body, privacy },
      {
        onSuccess: (post) => {
          // Track: post published. privacy_level is behavioral signal, not PII.
          track('post_created', { privacy_level: privacy })
          navigate(`/posts/${post.id}`)
        },
        onError: (err) =>
          setError(
            err instanceof Error
              ? err.message
              : (err as { message?: string })?.message ?? 'Failed to publish.',
          ),
      },
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <PostForm
        initialPrivacy={defaultPrivacy}
        postsPagePrivacy={postsPagePrivacy}
        profileIsPrivate={profileIsPrivate}
        submitLabel="Publish"
        isPending={create.isPending}
        error={error}
        onSubmit={handleSubmit}
        onCancel={() => navigate(-1)}
      />
    </div>
  )
}
