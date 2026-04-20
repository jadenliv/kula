import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { track } from '@vercel/analytics'
import {
  addCompletion,
  addCompletionsBulk,
  listCompletions,
  removeCompletion,
  removeCompletionsBulk,
  type Completion,
} from '../services/completions'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

/**
 * Derive the sefer name from a Sefaria ref by stripping the trailing
 * address component (e.g. "Genesis 1:1" → "Genesis",
 * "Berakhot 2a" → "Berakhot", "Mishnah Berakhot 1:1" → "Mishnah Berakhot").
 * Used only for analytics — no need for perfect accuracy.
 */
function seferNameFromRef(ref: string): string {
  const parts = ref.split(' ')
  return parts.length > 1 ? parts.slice(0, -1).join(' ') : ref
}

const COMPLETIONS_KEY = ['completions'] as const

// ── Debounced re-sync ─────────────────────────────────────────────────────────
// After every write (success or error), we schedule a single re-fetch from the
// DB 1.5 seconds later. Multiple rapid mutations collapse into one re-fetch.
// This guarantees the cache eventually reflects true DB state without causing
// the "flicker-back" that an immediate refetch can produce.

let _syncTimer: ReturnType<typeof setTimeout> | null = null

function scheduleSyncWithDb(queryClient: QueryClient) {
  if (_syncTimer) clearTimeout(_syncTimer)
  _syncTimer = setTimeout(() => {
    void queryClient.invalidateQueries({ queryKey: COMPLETIONS_KEY })
    _syncTimer = null
  }, 1500)
}

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
 * A debounced re-sync with the DB fires 1.5 s after the last write to confirm
 * the true server state without causing immediate flicker.
 */
export function useToggleCompletion() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

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
      // Read AFTER cancel so we always build on the latest cache state.
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
      if (!currentlyChecked) {
        queryClient.setQueryData<Completion[]>(COMPLETIONS_KEY, (old) =>
          old?.map((c) =>
            c.id === `optimistic-${ref}` ? { ...c, id: `confirmed-${ref}` } : c,
          ) ?? [],
        )
        // Track: user marked a section as learned for the first time.
        // ref is the Sefaria reference (e.g. "Berakhot 2a") — not PII.
        track('section_marked_learned', {
          sefer_name: seferNameFromRef(ref),
          section_reference: ref,
        })
      }
      scheduleSyncWithDb(queryClient)
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(COMPLETIONS_KEY, ctx.previous)
      }
      void queryClient.invalidateQueries({ queryKey: COMPLETIONS_KEY })
      showToast('Could not save — check your connection and try again.')
    },
  })
}

/**
 * Bulk-toggle a group of refs on or off. Used for parent-check fan-out
 * (clicking the checkbox next to "Bereshit" marks all 50 perakim).
 */
export function useToggleRefsBulk() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

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
      scheduleSyncWithDb(queryClient)
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(COMPLETIONS_KEY, ctx.previous)
      }
      void queryClient.invalidateQueries({ queryKey: COMPLETIONS_KEY })
      showToast('Could not save — check your connection and try again.')
    },
  })
}
