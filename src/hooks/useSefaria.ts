import { useQuery } from '@tanstack/react-query'
import {
  fetchIndex,
  fetchIndexDetails,
  fetchText,
} from '../services/sefaria'

// Sefaria texts are immutable — cache them for a week before revalidation.
const LONG_STALE = 1000 * 60 * 60 * 24 * 7

export function useSefariaIndex() {
  return useQuery({
    queryKey: ['sefaria', 'index'] as const,
    queryFn: fetchIndex,
    staleTime: LONG_STALE,
  })
}

export function useSefariaIndexDetails(title: string | null) {
  return useQuery({
    queryKey: ['sefaria', 'index', title] as const,
    queryFn: () => fetchIndexDetails(title as string),
    enabled: Boolean(title),
    staleTime: LONG_STALE,
  })
}

export function useSefariaText(ref: string | null) {
  return useQuery({
    queryKey: ['sefaria', 'text', ref] as const,
    queryFn: () => fetchText(ref as string),
    enabled: Boolean(ref),
    staleTime: LONG_STALE,
  })
}
