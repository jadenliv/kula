// Sefaria API service layer. No key required. All components go through
// these functions (never fetch directly) so we have one place to handle
// URL encoding, errors, and future caching tweaks.
//
// Texts are effectively immutable, so React Query is configured with long
// stale times in src/hooks/useSefaria.ts.

import type {
  SefariaIndexDetails,
  SefariaIndexEntry,
  SefariaText,
} from '../types/sefaria'

const BASE_URL = 'https://www.sefaria.org/api'

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Sefaria API ${res.status}: ${res.statusText} (${url})`)
  }
  return (await res.json()) as T
}

/** Full Sefaria table of contents — categories and sefarim. */
export function fetchIndex(): Promise<SefariaIndexEntry[]> {
  return getJson<SefariaIndexEntry[]>(`${BASE_URL}/index/`)
}

/** Structural details for a single sefer, including its schema. */
export function fetchIndexDetails(title: string): Promise<SefariaIndexDetails> {
  return getJson<SefariaIndexDetails>(
    `${BASE_URL}/index/${encodeURIComponent(title)}`,
  )
}

/** Hebrew + English text for a reference like "Genesis 1" or "Berakhot 2a". */
export function fetchText(ref: string): Promise<SefariaText> {
  return getJson<SefariaText>(`${BASE_URL}/texts/${encodeURIComponent(ref)}`)
}
