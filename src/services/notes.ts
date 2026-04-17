// Notes service — all reads/writes for public.notes.
// RLS makes user_id lookups implicit on reads. On writes we still send
// user_id explicitly because the column is NOT NULL; the RLS check
// (auth.uid() = user_id) ensures it can only ever be the current user.
//
// ── Tags migration ───────────────────────────────────────────────────────────
// Run once in Supabase SQL Editor:
//
//   alter table public.notes
//     add column if not exists tags text[] not null default '{}';
//
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../lib/supabase'

export type Note = {
  id: string
  user_id: string
  sefaria_ref: string
  body: string
  /** Free-form tag strings, e.g. ["kashya", "chiddush"]. */
  tags: string[]
  created_at: string
  updated_at: string
}

/** Every note for the signed-in user, newest first. */
export async function listNotes(): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  // Normalise: rows written before the tags column existed will have null.
  return (data ?? []).map((n) => ({ ...n, tags: n.tags ?? [] }))
}

/** Add a note attached to a Sefaria ref. */
export async function addNote(
  sefariaRef: string,
  body: string,
  tags: string[] = [],
): Promise<Note> {
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id
  if (!userId) throw new Error('Not signed in')

  const { data, error } = await supabase
    .from('notes')
    .insert({ user_id: userId, sefaria_ref: sefariaRef, body, tags })
    .select()
    .single()
  if (error) throw error
  return { ...data, tags: data.tags ?? [] }
}

/** Replace a note's body and/or tags. updated_at is bumped by the trigger. */
export async function updateNote(
  id: string,
  body: string,
  tags?: string[],
): Promise<Note> {
  const patch: Record<string, unknown> = { body }
  if (tags !== undefined) patch.tags = tags
  const { data, error } = await supabase
    .from('notes')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return { ...data, tags: data.tags ?? [] }
}

/** Delete a note by id. */
export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase.from('notes').delete().eq('id', id)
  if (error) throw error
}
