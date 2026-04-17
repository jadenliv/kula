// Notes service — all reads/writes for public.notes.
// RLS makes user_id lookups implicit on reads. On writes we still send
// user_id explicitly because the column is NOT NULL; the RLS check
// (auth.uid() = user_id) ensures it can only ever be the current user.
//
// ── Migrations ───────────────────────────────────────────────────────────────
// Run in Supabase SQL Editor (see bottom of file for full migration SQL).
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../lib/supabase'

export type NotePrivacy = 'private' | 'followers' | 'public'

export type Note = {
  id: string
  user_id: string
  sefaria_ref: string
  body: string
  /** Free-form tag strings, e.g. ["kashya", "chiddush"]. */
  tags: string[]
  /** Who can see this note. Defaults to 'private'. */
  privacy: NotePrivacy
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
  // Normalise columns that may be null on rows written before migrations ran.
  return (data ?? []).map((n) => ({
    ...n,
    tags: n.tags ?? [],
    privacy: (n.privacy ?? 'private') as NotePrivacy,
  }))
}

/**
 * Validate that a note privacy value is compatible with the user's profile
 * visibility. A public note cannot exist on a private profile — enforce this
 * at the API layer before hitting the DB trigger.
 */
async function assertPrivacyAllowed(privacy: NotePrivacy): Promise<void> {
  if (privacy !== 'public') return
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { data } = await supabase
    .from('profiles')
    .select('visibility')
    .eq('id', user.id)
    .single()
  if (data?.visibility === 'private') {
    throw new Error(
      'Your profile is set to private, so notes cannot be set to public. ' +
      'Change your profile visibility first, or set this note to followers or private.',
    )
  }
}

/** Add a note attached to a Sefaria ref. */
export async function addNote(
  sefariaRef: string,
  body: string,
  tags: string[] = [],
  privacy: NotePrivacy = 'private',
): Promise<Note> {
  await assertPrivacyAllowed(privacy)

  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id
  if (!userId) throw new Error('Not signed in')

  const { data, error } = await supabase
    .from('notes')
    .insert({ user_id: userId, sefaria_ref: sefariaRef, body, tags, privacy })
    .select()
    .single()
  if (error) throw error
  return { ...data, tags: data.tags ?? [], privacy: data.privacy ?? 'private' }
}

/** Replace a note's body, tags, and/or privacy. updated_at is bumped by the trigger. */
export async function updateNote(
  id: string,
  body: string,
  tags?: string[],
  privacy?: NotePrivacy,
): Promise<Note> {
  if (privacy !== undefined) await assertPrivacyAllowed(privacy)

  const patch: Record<string, unknown> = { body }
  if (tags !== undefined) patch.tags = tags
  if (privacy !== undefined) patch.privacy = privacy

  const { data, error } = await supabase
    .from('notes')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return { ...data, tags: data.tags ?? [], privacy: data.privacy ?? 'private' }
}

/** Delete a note by id. */
export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase.from('notes').delete().eq('id', id)
  if (error) throw error
}

/*
 * ── SQL migration — run once in Supabase SQL Editor ──────────────────────────
 *
 * -- 1. Add privacy column; all existing notes become 'private' (hard constraint)
 * alter table public.notes
 *   add column if not exists privacy text not null default 'private'
 *   check (privacy in ('private', 'followers', 'public'));
 *
 * -- Belt-and-suspenders: force every existing row to private
 * update public.notes set privacy = 'private';
 *
 * -- 2. DB trigger: block public notes when the author's profile is private
 * create or replace function public.check_note_privacy()
 * returns trigger language plpgsql as $$
 * begin
 *   if new.privacy = 'public' then
 *     if exists (
 *       select 1 from public.profiles
 *       where id = new.user_id and visibility = 'private'
 *     ) then
 *       raise exception
 *         'Cannot set note to public when your profile is private.';
 *     end if;
 *   end if;
 *   return new;
 * end;
 * $$;
 *
 * drop trigger if exists notes_privacy_check on public.notes;
 * create trigger notes_privacy_check
 *   before insert or update on public.notes
 *   for each row execute procedure public.check_note_privacy();
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */
