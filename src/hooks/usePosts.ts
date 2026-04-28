import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  adminDeletePost,
  addComment,
  createPost,
  deleteComment,
  deletePost,
  getLikeStatus,
  getPost,
  likePost,
  listAllPostsAdmin,
  listComments,
  listOwnPosts,
  listPostsForUser,
  unlikePost,
  updatePost,
  type AdminPost,
  type CreatePostInput,
  type Post,
  type PostComment,
  type UpdatePostInput,
} from '../services/posts'
import { useAuth } from '../context/AuthContext'

// ── Query keys ────────────────────────────────────────────────────────────────

const POSTS_KEY = ['posts'] as const
const postKey = (id: string) => ['posts', id] as const
const userPostsKey = (userId: string) => ['posts', 'user', userId] as const

// ── Queries ───────────────────────────────────────────────────────────────────

/** All non-deleted posts for the current user. */
export function useOwnPosts() {
  const { user } = useAuth()
  return useQuery({
    queryKey: POSTS_KEY,
    queryFn: listOwnPosts,
    enabled: Boolean(user),
    staleTime: 1000 * 30,
  })
}

/** Posts visible to the viewer on a user's profile page. */
export function usePostsForUser(userId: string | undefined) {
  return useQuery({
    queryKey: userPostsKey(userId ?? ''),
    queryFn: () => listPostsForUser(userId!),
    enabled: Boolean(userId),
    staleTime: 1000 * 30,
  })
}

/** Single post by id. */
export function usePost(id: string | undefined) {
  return useQuery({
    queryKey: postKey(id ?? ''),
    queryFn: () => getPost(id!),
    enabled: Boolean(id),
    staleTime: 1000 * 30,
    retry: false,
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreatePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreatePostInput) => createPost(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: POSTS_KEY })
    },
  })
}

export function useUpdatePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & UpdatePostInput) =>
      updatePost(id, input),

    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: postKey(id) })
      const previous = queryClient.getQueryData<Post>(postKey(id))
      if (previous) {
        queryClient.setQueryData<Post>(postKey(id), {
          ...previous,
          ...updates,
          title: updates.title ?? previous.title,
          updated_at: new Date().toISOString(),
        })
      }
      return { previous }
    },

    onError: (_err, { id }, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(postKey(id), ctx.previous)
      }
    },

    onSuccess: (data) => {
      queryClient.setQueryData(postKey(data.id), data)
      void queryClient.invalidateQueries({ queryKey: POSTS_KEY })
    },
  })
}

export function useDeletePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id }: { id: string }) => deletePost(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: POSTS_KEY })
    },
  })
}

// ── Like hooks ────────────────────────────────────────────────────────────────

const likeStatusKey = (postId: string) => ['posts', postId, 'likes'] as const

/** Fresh like count + liked state, used on the PostPage. */
export function useLikeStatus(postId: string | undefined) {
  return useQuery({
    queryKey: likeStatusKey(postId ?? ''),
    queryFn: () => getLikeStatus(postId!),
    enabled: Boolean(postId),
    staleTime: 1000 * 30,
  })
}

export function useLike(postId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ currentlyLiked }: { currentlyLiked: boolean }) =>
      currentlyLiked ? unlikePost(postId) : likePost(postId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: likeStatusKey(postId) })
    },
  })
}

// ── Comment hooks ─────────────────────────────────────────────────────────────

const commentsKey = (postId: string) => ['posts', postId, 'comments'] as const

export function useComments(postId: string | undefined) {
  return useQuery<PostComment[]>({
    queryKey: commentsKey(postId ?? ''),
    queryFn: () => listComments(postId!),
    enabled: Boolean(postId),
    staleTime: 1000 * 30,
  })
}

export function useAddComment(postId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: string) => addComment(postId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: commentsKey(postId) })
    },
  })
}

export function useDeleteComment(postId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteComment(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: commentsKey(postId) })
    },
  })
}

// ── Admin / moderator hooks ───────────────────────────────────────────────────

const ADMIN_POSTS_KEY = ['admin', 'posts'] as const

export function useAllPostsAdmin() {
  const { user } = useAuth()
  return useQuery<AdminPost[]>({
    queryKey: ADMIN_POSTS_KEY,
    queryFn: listAllPostsAdmin,
    enabled: Boolean(user),
    staleTime: 1000 * 30,
  })
}

export function useAdminDeletePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id }: { id: string }) => adminDeletePost(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_POSTS_KEY })
      void queryClient.invalidateQueries({ queryKey: POSTS_KEY })
    },
  })
}
