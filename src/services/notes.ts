// Notes service — all reads/writes for public.notes.
// RLS makes user_id lookups implicit on reads. On writes we still send
// user_id explicitly because the column is NOT NULL; the RLS check
// (auth.uid() = user_id) ensures it can only ever be the current user.

import { supabase } from '../lib/supabase'

export type Note = {
  id: string
  user_id: string
  sefaria_ref: string
  body: string
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
  return data ?? []
}

/** Add a note attached to a Sefaria ref. Body is plain text. */
export async function addNote(
  sefariaRef: string,
  body: string,
): Promise<Note> {
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id
  if (!userId) throw new Error('Not signed in')

  const { data, error } = await supabase
    .from('notes')
    .insert({
      user_id: userId,
      sefaria_ref: sefariaRef,
      body,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

/** Replace a note's body. updated_at is bumped by the trigger. */
export async function updateNote(id: string, body: string): Promise<Note> {
  const { data, error } = await supabase
    .from('notes')
    .update({ body })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Delete a note by id. */
export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase.from('notes').delete().eq('id', id)
  if (error) throw error
}
