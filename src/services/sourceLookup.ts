/**
 * Source lookup service — calls the `source-lookup` Supabase Edge Function.
 * The function verifies the user's JWT, hits Claude + Sefaria, and returns
 * a synthesis + real source texts.
 */

import { supabase } from '../lib/supabase'

export type SourceHit = {
  ref: string
  heRef: string
  text: string
  heText: string
  url: string
}

export type SourceLookupResult = {
  synthesis: string
  sources: SourceHit[]
}

export async function lookupSources(query: string): Promise<SourceLookupResult> {
  const { data, error } = await supabase.functions.invoke<SourceLookupResult>(
    'source-lookup',
    { body: { query } },
  )

  if (error) throw new Error(error.message ?? 'Source lookup failed')
  if (!data)  throw new Error('Empty response from source-lookup function')

  return data
}
