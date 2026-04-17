// Completions service layer — all reads/writes for public.completions.
// RLS on the table ensures users can only see/touch their own rows, so we
// don't need to pass user_id explicitly to reads.

import { supabase } from '../lib/supabase'

export type Completion = {
  id: string
  user_id: string
  sefaria_ref: string
  learning_track_id: string | null
  completed_at: string
}

/** Fetch every completion for the signed-in user. */
export async function listCompletions(): Promise<Completion[]> {
  const { data, error } = await supabase
    .from('completions')
    .select('*')
    .order('completed_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/** Mark a Sefaria ref complete. Idempotent — a repeat insert is a no-op. */
export async function addCompletion(
  sefariaRef: string,
  learningTrackId: string | null = null,
): Promise<void> {
  // Supabase needs user_id because it's a required column, but RLS enforces
  // that user_id must equal auth.uid() — so we read it from the current session.
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id
  if (!userId) throw new Error('Not signed in')

  // ignoreDuplicates: true — if the row already exists just skip it.
  // We don't call .select() here because some RLS configurations return 0
  // rows on the upsert SELECT phase even when the write succeeded, which
  // would make .single() throw and roll back the optimistic update.
  const { error } = await supabase
    .from('completions')
    .upsert(
      {
        user_id: userId,
        sefaria_ref: sefariaRef,
        learning_track_id: learningTrackId,
      },
      { onConflict: 'user_id,sefaria_ref', ignoreDuplicates: true },
    )
  if (error) throw error
}

/** Remove a completion by ref. No-op if it wasn't there. */
export async function removeCompletion(sefariaRef: string): Promise<void> {
  const { error } = await supabase
    .from('completions')
    .delete()
    .eq('sefaria_ref', sefariaRef)
  if (error) throw error
}

// Supabase/PostgREST can't handle thousands of rows in a single request —
// large upserts time out and large .in() clauses blow the URL limit.
// We chunk everything to stay well within limits.
const CHUNK_SIZE = 100

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

/** Bulk add — used by parent-check fan-out (e.g. "mark all of Bereshit"). */
export async function addCompletionsBulk(
  sefariaRefs: string[],
): Promise<void> {
  if (sefariaRefs.length === 0) return
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id
  if (!userId) throw new Error('Not signed in')

  // Run chunks sequentially to avoid hammering the DB.
  for (const batch of chunk(sefariaRefs, CHUNK_SIZE)) {
    const rows = batch.map((ref) => ({ user_id: userId, sefaria_ref: ref }))
    const { error } = await supabase
      .from('completions')
      .upsert(rows, { onConflict: 'user_id,sefaria_ref', ignoreDuplicates: true })
    if (error) throw error
  }
}

/** Bulk remove — used when unchecking a parent row. */
export async function removeCompletionsBulk(
  sefariaRefs: string[],
): Promise<void> {
  if (sefariaRefs.length === 0) return

  // .in() becomes a query-param list — chunking avoids URL-length limits.
  for (const batch of chunk(sefariaRefs, CHUNK_SIZE)) {
    const { error } = await supabase
      .from('completions')
      .delete()
      .in('sefaria_ref', batch)
    if (error) throw error
  }
}
