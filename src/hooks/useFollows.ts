import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  approveFollowRequest,
  denyFollowRequest,
  followUser,
  getFollowCounts,
  getFollowStatus,
  listFollowRequests,
  listFollowers,
  listFollowing,
  removeFollower,
  unfollowUser,
  type Follow,
} from '../services/follows'
import { useAuth } from '../context/AuthContext'

// ── Query keys ────────────────────────────────────────────────────────────────

const followStatusKey = (targetId: string) => ['follows', 'status', targetId] as const
const followersKey = (userId: string) => ['follows', 'followers', userId] as const
const followingKey = (userId: string) => ['follows', 'following', userId] as const
const followCountsKey = (userId: string) => ['follows', 'counts', userId] as const
const followRequestsKey = ['follows', 'requests'] as const

// ── Queries ───────────────────────────────────────────────────────────────────

/** Follow relationship from the current user to a target (null = not following). */
export function useFollowStatus(targetUserId: string | undefined) {
  const { user } = useAuth()
  return useQuery({
    queryKey: followStatusKey(targetUserId ?? ''),
    queryFn: () => getFollowStatus(targetUserId!),
    enabled: Boolean(user) && Boolean(targetUserId),
    staleTime: 1000 * 30,
  })
}

export function useFollowers(userId: string | undefined) {
  return useQuery({
    queryKey: followersKey(userId ?? ''),
    queryFn: () => listFollowers(userId!),
    enabled: Boolean(userId),
    staleTime: 1000 * 30,
  })
}

export function useFollowing(userId: string | undefined) {
  return useQuery({
    queryKey: followingKey(userId ?? ''),
    queryFn: () => listFollowing(userId!),
    enabled: Boolean(userId),
    staleTime: 1000 * 30,
  })
}

export function useFollowCounts(userId: string | undefined) {
  return useQuery({
    queryKey: followCountsKey(userId ?? ''),
    queryFn: () => getFollowCounts(userId!),
    enabled: Boolean(userId),
    staleTime: 1000 * 30,
  })
}

export function useFollowRequests() {
  const { user } = useAuth()
  return useQuery({
    queryKey: followRequestsKey,
    queryFn: listFollowRequests,
    enabled: Boolean(user),
    staleTime: 1000 * 30,
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useFollowUser(targetUserId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => followUser(targetUserId),

    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: followStatusKey(targetUserId) })
      const previous = queryClient.getQueryData<Follow | null>(followStatusKey(targetUserId))
      // Optimistic: show as pending immediately (will be corrected by onSuccess)
      queryClient.setQueryData<Follow | null>(followStatusKey(targetUserId), {
        id: 'optimistic',
        follower_user_id: 'optimistic',
        followed_user_id: targetUserId,
        status: 'pending',
        created_at: new Date().toISOString(),
        accepted_at: null,
      })
      return { previous }
    },

    onError: (_err, _vars, ctx) => {
      queryClient.setQueryData(followStatusKey(targetUserId), ctx?.previous)
    },

    onSuccess: (data) => {
      queryClient.setQueryData(followStatusKey(targetUserId), data)
      void queryClient.invalidateQueries({ queryKey: followCountsKey(targetUserId) })
    },
  })
}

export function useUnfollowUser(targetUserId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => unfollowUser(targetUserId),

    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: followStatusKey(targetUserId) })
      const previous = queryClient.getQueryData<Follow | null>(followStatusKey(targetUserId))
      queryClient.setQueryData<Follow | null>(followStatusKey(targetUserId), null)
      return { previous }
    },

    onError: (_err, _vars, ctx) => {
      queryClient.setQueryData(followStatusKey(targetUserId), ctx?.previous)
    },

    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: followCountsKey(targetUserId) })
      void queryClient.invalidateQueries({ queryKey: ['follows', 'followers'] })
    },
  })
}

export function useApproveFollowRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ followId }: { followId: string }) => approveFollowRequest(followId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: followRequestsKey })
      void queryClient.invalidateQueries({ queryKey: ['follows', 'counts'] })
    },
  })
}

export function useDenyFollowRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ followId }: { followId: string }) => denyFollowRequest(followId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: followRequestsKey })
    },
  })
}

export function useRemoveFollower() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ followerUserId }: { followerUserId: string }) =>
      removeFollower(followerUserId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['follows'] })
    },
  })
}
