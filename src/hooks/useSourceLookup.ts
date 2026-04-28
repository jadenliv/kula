import { useState, useCallback } from 'react'
import { lookupSources, type SourceLookupResult } from '../services/sourceLookup'

export type SourceLookupState = {
  data: SourceLookupResult | null
  isLoading: boolean
  error: string | null
  lastQuery: string
  search: (query: string) => Promise<void>
  clear: () => void
}

export function useSourceLookup(): SourceLookupState {
  const [data, setData]         = useState<SourceLookupResult | null>(null)
  const [isLoading, setLoading] = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [lastQuery, setLastQuery] = useState('')

  const search = useCallback(async (query: string) => {
    const trimmed = query.trim()
    if (!trimmed) return

    setLoading(true)
    setError(null)
    setLastQuery(trimmed)
    setData(null)

    try {
      const result = await lookupSources(trimmed)
      setData(result)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      // Surface a friendly message for the "function not deployed yet" case
      setError(
        msg.includes('Failed to send') || msg.includes('fetch')
          ? 'Source lookup is not deployed yet. See setup instructions below.'
          : msg,
      )
    } finally {
      setLoading(false)
    }
  }, [])

  const clear = useCallback(() => {
    setData(null)
    setError(null)
    setLastQuery('')
  }, [])

  return { data, isLoading, error, lastQuery, search, clear }
}
