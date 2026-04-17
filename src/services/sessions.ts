// ── Supabase table setup ────────────────────────────────────────────────────
// Run this SQL once in your Supabase SQL editor:
//
// create table public.learning_sessions (
//   id uuid primary key default gen_random_uuid(),
//   user_id uuid references auth.users(id) on delete cascade not null,
//   sefer_ref text,
//   sefer_label text,
//   started_at timestamptz not null default now(),
//   ended_at timestamptz,
//   duration_seconds integer,
//   notes text,
//   created_at timestamptz not null default now()
// );
// alter table public.learning_sessions enable row level security;
// create policy "Users manage own sessions" on public.learning_sessions
//   for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
// ────────────────────────────────────────────────────────────────────────────

import { supabase } from '../lib/supabase'

export type LearningSession = {
  id: string
  user_id: string
  sefer_ref: string | null
  sefer_label: string | null
  started_at: string
  ended_at: string | null
  duration_seconds: number | null
  notes: string | null
  created_at: string
}

export async function listSessions(): Promise<LearningSession[]> {
  const { data, error } = await supabase
    .from('learning_sessions')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(200)
  if (error) throw error
  return data ?? []
}

export async function getActiveSession(): Promise<LearningSession | null> {
  const { data, error } = await supabase
    .from('learning_sessions')
    .select('*')
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function startSession(params: {
  seferRef: string | null
  seferLabel: string | null
}): Promise<LearningSession> {
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id
  if (!userId) throw new Error('Not signed in')

  const { data, error } = await supabase
    .from('learning_sessions')
    .insert({
      user_id: userId,
      sefer_ref: params.seferRef,
      sefer_label: params.seferLabel,
      started_at: new Date().toISOString(),
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function endSession(params: {
  id: string
  startedAt: string
  notes: string | null
}): Promise<LearningSession> {
  const endedAt = new Date().toISOString()
  const durationSeconds = Math.round(
    (new Date(endedAt).getTime() - new Date(params.startedAt).getTime()) / 1000,
  )

  const { data, error } = await supabase
    .from('learning_sessions')
    .update({
      ended_at: endedAt,
      duration_seconds: durationSeconds,
      notes: params.notes || null,
    })
    .eq('id', params.id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteSession(id: string): Promise<void> {
  const { error } = await supabase
    .from('learning_sessions')
    .delete()
    .eq('id', id)
  if (error) throw error
}
