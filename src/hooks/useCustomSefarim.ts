import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listCustomSefarim,
  listCustomSections,
  createCustomSefer,
  updateCustomSefer,
  deleteCustomSefer,
  createCustomSection,
  deleteCustomSection,
  type UserCustomSefer,
} from '../services/customSefarim'
import { useAuth } from '../context/AuthContext'

export const CUSTOM_SEFARIM_KEY = ['custom-sefarim'] as const
export const customSectionsKey = (seferId: string) => ['custom-sections', seferId] as const

// ── Queries ───────────────────────────────────────────────────────────────────

export function useCustomSefarim() {
  const { user } = useAuth()
  return useQuery({
    queryKey: CUSTOM_SEFARIM_KEY,
    queryFn: listCustomSefarim,
    enabled: Boolean(user),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  })
}

export function useCustomSections(seferId: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: customSectionsKey(seferId),
    queryFn: () => listCustomSections(seferId),
    enabled: Boolean(user) && Boolean(seferId),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateCustomSefer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createCustomSefer,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: CUSTOM_SEFARIM_KEY }),
  })
}

export function useUpdateCustomSefer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...params
    }: {
      id: string
      titleEn?: string
      titleHe?: string | null
      sefariaRef?: string | null
      sectionLabel?: string
      chapterCount?: number | null
    }) => updateCustomSefer(id, params),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: CUSTOM_SEFARIM_KEY }),
  })
}

export function useDeleteCustomSefer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteCustomSefer,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: CUSTOM_SEFARIM_KEY })
      const previous = queryClient.getQueryData(CUSTOM_SEFARIM_KEY)
      queryClient.setQueryData(
        CUSTOM_SEFARIM_KEY,
        (old: UserCustomSefer[] | undefined) => old?.filter((s) => s.id !== id) ?? [],
      )
      return { previous }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(CUSTOM_SEFARIM_KEY, ctx.previous)
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: CUSTOM_SEFARIM_KEY }),
  })
}

export function useCreateCustomSection(seferId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createCustomSection,
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: customSectionsKey(seferId) }),
  })
}

export function useDeleteCustomSection(seferId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteCustomSection,
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: customSectionsKey(seferId) }),
  })
}
