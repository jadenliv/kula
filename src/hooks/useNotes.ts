import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addNote,
  deleteNote,
  listNotes,
  updateNote,
  type Note,
} from '../services/notes'
import { useAuth } from '../context/AuthContext'

const NOTES_KEY = ['notes'] as const

/**
 * Single source of truth for the user's notes. The whole app derives its
 * views (per-ref panel, /notebook page grouping, future tree markers) from
 * this one cached query, so they all stay in sync after a mutation.
 */
export function useNotes() {
  const { user } = useAuth()
  return useQuery({
    queryKey: NOTES_KEY,
    queryFn: listNotes,
    enabled: Boolean(user),
    staleTime: 1000 * 30,
  })
}

/** Notes for one ref, ordered newest first. Memoized for stable identity. */
export function useNotesForRef(ref: string | null): Note[] {
  const { data } = useNotes()
  return useMemo(() => {
    if (!ref || !data) return []
    return data.filter((n) => n.sefaria_ref === ref)
  }, [data, ref])
}

/**
 * Add a new note. Optimistic — the panel shows the note immediately and
 * rolls back if the insert fails. We use a temp id prefixed with
 * "optimistic-" so the UI can render it like any other note; on success
 * the cache is invalidated and the real id replaces it.
 */
export function useAddNote() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: ({ ref, body }: { ref: string; body: string }) =>
      addNote(ref, body),
    onMutate: async ({ ref, body }) => {
      await queryClient.cancelQueries({ queryKey: NOTES_KEY })
      const previous = queryClient.getQueryData<Note[]>(NOTES_KEY) ?? []
      const now = new Date().toISOString()
      const optimistic: Note = {
        id: `optimistic-${now}-${Math.random().toString(36).slice(2, 8)}`,
        user_id: user?.id ?? 'optimistic',
        sefaria_ref: ref,
        body,
        created_at: now,
        updated_at: now,
      }
      queryClient.setQueryData<Note[]>(NOTES_KEY, [optimistic, ...previous])
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(NOTES_KEY, ctx.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: NOTES_KEY })
    },
  })
}

/** Update a note's body. Optimistic. */
export function useUpdateNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) =>
      updateNote(id, body),
    onMutate: async ({ id, body }) => {
      await queryClient.cancelQueries({ queryKey: NOTES_KEY })
      const previous = queryClient.getQueryData<Note[]>(NOTES_KEY) ?? []
      const now = new Date().toISOString()
      const next = previous.map((n) =>
        n.id === id ? { ...n, body, updated_at: now } : n,
      )
      queryClient.setQueryData<Note[]>(NOTES_KEY, next)
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(NOTES_KEY, ctx.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: NOTES_KEY })
    },
  })
}

/** Delete a note. Optimistic. */
export function useDeleteNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id }: { id: string }) => deleteNote(id),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: NOTES_KEY })
      const previous = queryClient.getQueryData<Note[]>(NOTES_KEY) ?? []
      queryClient.setQueryData<Note[]>(
        NOTES_KEY,
        previous.filter((n) => n.id !== id),
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(NOTES_KEY, ctx.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: NOTES_KEY })
    },
  })
}
