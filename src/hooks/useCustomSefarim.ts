import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listCustomSefarim,
  listCustomSections,
  createCustomSefer,
  updateCustomSefer,
  deleteCustomSefer,
  createCustomSection,
  deleteCustomSection,
  parseCustomRef,
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

// ── Custom ref label helpers ──────────────────────────────────────────────────

/**
 * Given a raw custom ref string (e.g. "custom:{uuid}:3"), returns the sefer
 * it belongs to, or null if it's not a custom ref or the sefer hasn't loaded.
 */
export function useCustomRefSefer(ref: string | null): UserCustomSefer | null {
  const { data: sefarim = [] } = useCustomSefarim()
  return useMemo(() => {
    if (!ref) return null
    const parsed = parseCustomRef(ref)
    if (!parsed) return null
    return sefarim.find((s) => s.id === parsed.seferId) ?? null
  }, [ref, sefarim])
}

/**
 * Converts a raw custom ref into a human-readable label, e.g.:
 *   flat:   "custom:{uuid}:3"  →  "Mesilat Yesharim · Perek 3"
 *   nested: "custom:{uuid}:{sectionId}" → "My Sefer · Introduction"
 *
 * Returns null while data is loading or if the ref is not a custom ref.
 */
export function useCustomRefLabel(ref: string | null): string | null {
  const sefer = useCustomRefSefer(ref)
  const parsed = ref ? parseCustomRef(ref) : null

  // Only fetch sections for nested sefarim — skip the query for flat ones
  const { data: sections = [] } = useCustomSections(
    sefer?.structure_type === 'nested' ? (parsed?.seferId ?? '') : '',
  )

  return useMemo(() => {
    if (!sefer || !parsed) return null
    if (sefer.structure_type === 'flat') {
      const n = parseInt(parsed.key, 10)
      return isNaN(n) ? sefer.title_en : `${sefer.title_en} · ${sefer.section_label} ${n}`
    }
    // Nested: look up the section title by id
    const section = sections.find((s) => s.id === parsed.key)
    return section ? `${sefer.title_en} · ${section.title}` : sefer.title_en
  }, [sefer, parsed, sections])
}

export function useDeleteCustomSection(seferId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteCustomSection,
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: customSectionsKey(seferId) }),
  })
}
