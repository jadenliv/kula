import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { track } from '@vercel/analytics'
import {
  addUserSefer,
  listUserSefarim,
  removeUserSefer,
  updateUserSeferStatus,
} from '../services/userSefarim'
import { useAuth } from '../context/AuthContext'

export const USER_SEFARIM_KEY = ['user-sefarim'] as const

export function useUserSefarim() {
  const { user } = useAuth()
  return useQuery({
    queryKey: USER_SEFARIM_KEY,
    queryFn: listUserSefarim,
    enabled: Boolean(user),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  })
}

export function useAddUserSefer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: addUserSefer,
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: USER_SEFARIM_KEY })
      // Track: user added a sefer to their active learning list.
      // sefer_label_en is the human-readable title — not PII.
      track('sefer_added_active', { sefer_name: variables.seferLabelEn })
    },
  })
}

export function useUpdateUserSeferStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateUserSeferStatus,
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: USER_SEFARIM_KEY })
      const previous = queryClient.getQueryData(USER_SEFARIM_KEY)
      queryClient.setQueryData(
        USER_SEFARIM_KEY,
        (old: Awaited<ReturnType<typeof listUserSefarim>> | undefined) =>
          old?.map((s) => (s.id === id ? { ...s, status } : s)) ?? [],
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(USER_SEFARIM_KEY, ctx.previous)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: USER_SEFARIM_KEY })
    },
  })
}

export function useRemoveUserSefer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: removeUserSefer,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: USER_SEFARIM_KEY })
      const previous = queryClient.getQueryData(USER_SEFARIM_KEY)
      queryClient.setQueryData(
        USER_SEFARIM_KEY,
        (old: Awaited<ReturnType<typeof listUserSefarim>> | undefined) =>
          old?.filter((s) => s.id !== id) ?? [],
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(USER_SEFARIM_KEY, ctx.previous)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: USER_SEFARIM_KEY })
    },
  })
}
