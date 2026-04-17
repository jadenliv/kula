// ── Supabase table setup ────────────────────────────────────────────────────
// Run this SQL once in your Supabase SQL editor:
//
// create table public.user_sefarim (
//   id uuid primary key default gen_random_uuid(),
//   user_id uuid references auth.users(id) on delete cascade not null,
//   sefer_id text not null,
//   sefer_label_en text not null,
//   sefer_label_he text,
//   status text not null default 'active'
//     check (status in ('active', 'inactive', 'completed')),
//   added_at timestamptz not null default now(),
//   unique(user_id, sefer_id)
// );
// alter table public.user_sefarim enable row level security;
// create policy "Users manage own sefarim" on public.user_sefarim
//   for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
// ────────────────────────────────────────────────────────────────────────────

import { supabase } from '../lib/supabase'

export type SeferStatus = 'active' | 'inactive' | 'completed'

export type UserSefer = {
  id: string
  user_id: string
  /** The catalog node's English name — used to look up refs in the catalog. */
  sefer_id: string
  sefer_label_en: string
  sefer_label_he: string | null
  status: SeferStatus
  added_at: string
}

export async function listUserSefarim(): Promise<UserSefer[]> {
  const { data, error } = await supabase
    .from('user_sefarim')
    .select('*')
    .order('added_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function addUserSefer(params: {
  seferId: string
  seferLabelEn: string
  seferLabelHe: string | null
}): Promise<UserSefer> {
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id
  if (!userId) throw new Error('Not signed in')

  // Upsert so re-adding an inactive sefer just flips it back to active.
  const { data, error } = await supabase
    .from('user_sefarim')
    .upsert(
      {
        user_id: userId,
        sefer_id: params.seferId,
        sefer_label_en: params.seferLabelEn,
        sefer_label_he: params.seferLabelHe,
        status: 'active',
      },
      { onConflict: 'user_id,sefer_id' },
    )
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateUserSeferStatus(params: {
  id: string
  status: SeferStatus
}): Promise<void> {
  const { error } = await supabase
    .from('user_sefarim')
    .update({ status: params.status })
    .eq('id', params.id)
  if (error) throw error
}

export async function removeUserSefer(id: string): Promise<void> {
  const { error } = await supabase
    .from('user_sefarim')
    .delete()
    .eq('id', id)
  if (error) throw error
}
