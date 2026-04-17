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
 * Load every completion for the current user. Cached in React Query so the
 * whole app can derive per-sefer / per-category counts from one query.
 */
export function useCompletions() {
  const { user } = useAuth()
  return useQuery({
    queryKey: COMPLETIONS_KEY,
    queryFn: listCompletions,
    enabled: Boolean(user),
    staleTime: 1000 * 30, // short — we invalidate on mutation anyway
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
 * Toggle a completion on/off. Optimistic — the UI updates immediately and
 * rolls back if the server rejects.
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
    onError: (_err, _vars, ctx) => {
      // Roll back optimistic update on failure.
      if (ctx?.previous) {
        queryClient.setQueryData(COMPLETIONS_KEY, ctx.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: COMPLETIONS_KEY })
    },
  })
}

/**
 * Bulk-toggle a group of refs on or off. Used for parent-check fan-out:
 * clicking the checkbox next to "Bereshit" inserts/removes all 50 perek rows.
 * Optimistic like useToggleCompletion.
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
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(COMPLETIONS_KEY, ctx.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: COMPLETIONS_KEY })
    },
  })
}
