// ── Supabase table setup ─────────────────────────────────────────────────────
// Run this SQL once in your Supabase SQL editor:
//
// create table public.user_custom_sefarim (
//   id uuid primary key default gen_random_uuid(),
//   user_id uuid references auth.users(id) on delete cascade not null,
//   title_en text not null,
//   title_he text,
//   sefaria_ref text,
//   structure_type text not null default 'flat'
//     check (structure_type in ('flat', 'nested')),
//   section_label text not null default 'Perek',
//   chapter_count int,
//   created_at timestamptz not null default now()
// );
// alter table public.user_custom_sefarim enable row level security;
// create policy "Users manage own custom sefarim" on public.user_custom_sefarim
//   for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
//
// create table public.user_custom_sections (
//   id uuid primary key default gen_random_uuid(),
//   sefer_id uuid references public.user_custom_sefarim(id) on delete cascade not null,
//   parent_id uuid references public.user_custom_sections(id) on delete cascade,
//   title text not null,
//   sort_order int not null default 0
// );
// alter table public.user_custom_sections enable row level security;
// create policy "Users manage own custom sections" on public.user_custom_sections
//   for all using (
//     auth.uid() = (select user_id from public.user_custom_sefarim where id = sefer_id)
//   ) with check (
//     auth.uid() = (select user_id from public.user_custom_sefarim where id = sefer_id)
//   );
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../lib/supabase'

export type CustomSeferStructure = 'flat' | 'nested'

export type UserCustomSefer = {
  id: string
  user_id: string
  title_en: string
  title_he: string | null
  /** If set, the Sefaria canonical ref for the sefer (e.g. "Mesilat Yesharim"). */
  sefaria_ref: string | null
  structure_type: CustomSeferStructure
  /** Human label for a single section, e.g. "Perek", "Siman", "Chapter". */
  section_label: string
  /** For flat structure: total number of sections. */
  chapter_count: number | null
  created_at: string
}

export type UserCustomSection = {
  id: string
  sefer_id: string
  parent_id: string | null
  title: string
  sort_order: number
}

// ── Sefarim CRUD ──────────────────────────────────────────────────────────────

export async function listCustomSefarim(): Promise<UserCustomSefer[]> {
  const { data, error } = await supabase
    .from('user_custom_sefarim')
    .select('*')
    .order('title_en', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function createCustomSefer(params: {
  titleEn: string
  titleHe: string | null
  sefariaRef: string | null
  structureType: CustomSeferStructure
  sectionLabel: string
  chapterCount: number | null
}): Promise<UserCustomSefer> {
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id
  if (!userId) throw new Error('Not signed in')

  const { data, error } = await supabase
    .from('user_custom_sefarim')
    .insert({
      user_id: userId,
      title_en: params.titleEn,
      title_he: params.titleHe,
      sefaria_ref: params.sefariaRef,
      structure_type: params.structureType,
      section_label: params.sectionLabel,
      chapter_count: params.chapterCount,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCustomSefer(
  id: string,
  params: {
    titleEn?: string
    titleHe?: string | null
    sefariaRef?: string | null
    sectionLabel?: string
    chapterCount?: number | null
  },
): Promise<void> {
  const updates: Record<string, unknown> = {}
  if (params.titleEn !== undefined) updates.title_en = params.titleEn
  if (params.titleHe !== undefined) updates.title_he = params.titleHe
  if (params.sefariaRef !== undefined) updates.sefaria_ref = params.sefariaRef
  if (params.sectionLabel !== undefined) updates.section_label = params.sectionLabel
  if (params.chapterCount !== undefined) updates.chapter_count = params.chapterCount
  const { error } = await supabase.from('user_custom_sefarim').update(updates).eq('id', id)
  if (error) throw error
}

export async function deleteCustomSefer(id: string): Promise<void> {
  const { error } = await supabase.from('user_custom_sefarim').delete().eq('id', id)
  if (error) throw error
}

// ── Sections CRUD (nested structure) ─────────────────────────────────────────

export async function listCustomSections(seferId: string): Promise<UserCustomSection[]> {
  const { data, error } = await supabase
    .from('user_custom_sections')
    .select('*')
    .eq('sefer_id', seferId)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function createCustomSection(params: {
  seferId: string
  parentId: string | null
  title: string
  sortOrder: number
}): Promise<UserCustomSection> {
  const { data, error } = await supabase
    .from('user_custom_sections')
    .insert({
      sefer_id: params.seferId,
      parent_id: params.parentId,
      title: params.title,
      sort_order: params.sortOrder,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCustomSection(id: string): Promise<void> {
  const { error } = await supabase.from('user_custom_sections').delete().eq('id', id)
  if (error) throw error
}

// ── Ref helpers ───────────────────────────────────────────────────────────────
//
// Custom sefarim reuse the same `completions` table as built-in sefarim.
// We prefix refs with "custom:" so they never collide with Sefaria refs.

/** Completion ref for a flat-structure chapter (1-based). */
export function flatRef(seferId: string, chapterNum: number): string {
  return `custom:${seferId}:${chapterNum}`
}

/** Completion ref for a nested-structure leaf section. */
export function nestedRef(seferId: string, sectionId: string): string {
  return `custom:${seferId}:${sectionId}`
}

/** All refs for a flat sefer, in order. */
export function allFlatRefs(seferId: string, chapterCount: number): string[] {
  return Array.from({ length: chapterCount }, (_, i) => flatRef(seferId, i + 1))
}
