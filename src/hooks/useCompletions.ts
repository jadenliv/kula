import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import {
  addCompletion,
  addCompletionsBulk,
  listCompletions,
  removeCompletion,
  removeCompletionsBulk,
  type Completion,
} from '../services/completions'
import { useAuth } from '../context/AuthContext'

const COMPLETIONS_KEY = ['completions'] as const

/**
 * Load every completion for the current user. Cached in React Query.
 *
 * refetchOnWindowFocus is disabled because on mobile, switching apps and back
 * would fire a refetch that can wipe out freshly-applied optimistic updates.
 * We control all writes ourselves, so we don't need background polling.
 */
export function useCompletions() {
  const { user } = useAuth()
  return useQuery({
    queryKey: COMPLETIONS_KEY,
    queryFn: listCompletions,
    enabled: Boolean(user),
    staleTime: 1000 * 60 * 5, // 5 min — we invalidate manually on error only
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}

/**
 * Memoized Set of completed refs for O(1) lookups in tree rows.
 */
export function useCompletedRefSet(): Set<string> {
  const { data } = useCompletions()
  return useMemo(() => {
    const set = new Set<string>()
    for (const c of data ?? []) set.add(c.sefaria_ref)
    return set
  }, [data])
}

/**
 * Toggle a single completion on/off. Optimistic — the UI updates immediately.
 *
 * KEY DESIGN: we do NOT invalidate/refetch on success. The optimistic data
 * is authoritative. A refetch on success can return stale server data (the
 * write may not have propagated yet) causing the checkbox to flicker back.
 * On error we roll back the optimistic state AND refetch to re-sync with
 * the true server state.
 */
export function useToggleCompletion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      ref,
      currentlyChecked,
    }: {
      ref: string
      currentlyChecked: boolean
    }) => {
      if (currentlyChecked) {
        await removeCompletion(ref)
      } else {
        await addCompletion(ref)
      }
    },

    onMutate: async ({ ref, currentlyChecked }) => {
      // Cancel any in-flight fetches so they don't clobber our optimistic update.
      await queryClient.cancelQueries({ queryKey: COMPLETIONS_KEY })
      const previous =
        queryClient.getQueryData<Completion[]>(COMPLETIONS_KEY) ?? []

      const next: Completion[] = currentlyChecked
        ? previous.filter((c) => c.sefaria_ref !== ref)
        : [
            {
              id: `optimistic-${ref}`,
              user_id: 'optimistic',
              sefaria_ref: ref,
              learning_track_id: null,
              completed_at: new Date().toISOString(),
            },
            ...previous,
          ]

      queryClient.setQueryData(COMPLETIONS_KEY, next)
      return { previous }
    },

    onSuccess: (_data, { ref, currentlyChecked }) => {
      // Write confirmed. Clean up the optimistic ID so it no longer looks
      // temporary — but keep the data as-is (no refetch needed).
      if (!currentlyChecked) {
        queryClient.setQueryData<Completion[]>(COMPLETIONS_KEY, (old) =>
          old?.map((c) =>
            c.id === `optimistic-${ref}` ? { ...c, id: `confirmed-${ref}` } : c,
          ) ?? [],
        )
      }
    },

    onError: (_err, _vars, ctx) => {
      // Roll back the optimistic update and refetch true server state.
      if (ctx?.previous) {
        queryClient.setQueryData(COMPLETIONS_KEY, ctx.previous)
      }
      void queryClient.invalidateQueries({ queryKey: COMPLETIONS_KEY })
    },
  })
}

/**
 * Bulk-toggle a group of refs on or off. Used for parent-check fan-out
 * (clicking the checkbox next to "Bereshit" marks all 50 perakim).
 *
 * Same no-refetch-on-success strategy as useToggleCompletion.
 */
export function useToggleRefsBulk() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      refs,
      action,
    }: {
      refs: string[]
      action: 'add' | 'remove'
    }) => {
      if (action === 'add') {
        await addCompletionsBulk(refs)
      } else {
        await removeCompletionsBulk(refs)
      }
    },

    onMutate: async ({ refs, action }) => {
      await queryClient.cancelQueries({ queryKey: COMPLETIONS_KEY })
      const previous =
        queryClient.getQueryData<Completion[]>(COMPLETIONS_KEY) ?? []

      let next: Completion[]
      if (action === 'add') {
        const existing = new Set(previous.map((c) => c.sefaria_ref))
        const newRows: Completion[] = refs
          .filter((r) => !existing.has(r))
          .map((r) => ({
            id: `optimistic-${r}`,
            user_id: 'optimistic',
            sefaria_ref: r,
            learning_track_id: null,
            completed_at: new Date().toISOString(),
          }))
        next = [...newRows, ...previous]
      } else {
        const toRemove = new Set(refs)
        next = previous.filter((c) => !toRemove.has(c.sefaria_ref))
      }

      queryClient.setQueryData(COMPLETIONS_KEY, next)
      return { previous }
    },

    onSuccess: (_data, { refs, action }) => {
      // Confirm all optimistic rows by replacing their temporary IDs.
      if (action === 'add') {
        const refSet = new Set(refs)
        queryClient.setQueryData<Completion[]>(COMPLETIONS_KEY, (old) =>
          old?.map((c) =>
            c.id.startsWith('optimistic-') && refSet.has(c.sefaria_ref)
              ? { ...c, id: `confirmed-${c.sefaria_ref}` }
              : c,
          ) ?? [],
        )
      }
    },

    onError: (_err, _vars, ctx) => {
      // Roll back and re-sync from server.
      if (ctx?.previous) {
        queryClient.setQueryData(COMPLETIONS_KEY, ctx.previous)
      }
      void queryClient.invalidateQueries({ queryKey: COMPLETIONS_KEY })
    },
  })
}
