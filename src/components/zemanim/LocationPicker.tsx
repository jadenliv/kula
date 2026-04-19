import { useState, useEffect, useRef } from 'react'
import { useLocation, type LocationData } from '../../context/LocationContext'
import { searchPlaces, reverseGeocode } from '../../services/geocoding'

type Props = {
  onClose: () => void
}

type SearchResult = {
  label: string
  shortLabel: string
  lat: number
  lng: number
}

export function LocationPicker({ onClose }: Props) {
  const { location, isDetecting, detectionError, setManualLocation, redetect } =
    useLocation()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [selecting, setSelecting] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Focus the input when the picker opens
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Debounced search — fire 400 ms after the user stops typing
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!query.trim()) {
      setResults([])
      setSearchError(null)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      setSearchError(null)
      try {
        const found = await searchPlaces(query)
        setResults(found)
        if (found.length === 0) setSearchError('No results found. Try a different search.')
      } catch {
        setSearchError('Search failed. Check your connection and try again.')
      } finally {
        setSearching(false)
      }
    }, 400)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  /** User clicked a result — resolve timezone then save. */
  const handleSelectResult = async (result: SearchResult) => {
    setSelecting(true)
    try {
      const { label, tzid } = await reverseGeocode(result.lat, result.lng)
      const loc: LocationData = {
        lat: result.lat,
        lng: result.lng,
        label,
        tzid,
      }
      setManualLocation(loc)
      onClose()
    } catch {
      // If reverse geocode fails, still save with the Nominatim short label
      const loc: LocationData = {
        lat: result.lat,
        lng: result.lng,
        label: result.shortLabel,
        tzid: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }
      setManualLocation(loc)
      onClose()
    } finally {
      setSelecting(false)
    }
  }

  const handleRedetect = () => {
    redetect()
    onClose()
  }

  return (
    <div className="w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xl">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-kula-900 dark:text-kula-100">
          Set location
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="text-kula-400 hover:text-kula-700 dark:hover:text-kula-200"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* Current location display */}
      {location && (
        <p className="mb-3 text-xs text-kula-500 dark:text-kula-500">
          Now:{' '}
          <span className="font-medium text-kula-800 dark:text-kula-200">
            {location.label}
          </span>
        </p>
      )}

      {/* Search input */}
      <div className="relative mb-2">
        <svg
          viewBox="0 0 20 20"
          className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-kula-400 dark:text-kula-600"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
            clipRule="evenodd"
          />
        </svg>
        <input
          ref={inputRef}
          type="text"
          dir="auto"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="City, neighborhood, or zip code"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] py-2 pl-8 pr-3 text-xs text-kula-900 placeholder:text-kula-400 focus:border-kula-400 focus:outline-none dark:text-kula-100 dark:placeholder:text-kula-600"
        />
        {searching && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-kula-400 dark:text-kula-600">
            Searching…
          </span>
        )}
      </div>

      {/* Search results */}
      {results.length > 0 && (
        <ul className="mb-3 max-h-52 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface-raised)]">
          {results.map((r, i) => (
            <li key={i}>
              <button
                type="button"
                disabled={selecting}
                onClick={() => handleSelectResult(r)}
                className="w-full px-3 py-2 text-left transition-colors hover:bg-[var(--surface-overlay)] disabled:opacity-50"
              >
                <span className="block text-xs font-medium text-kula-800 dark:text-kula-200">
                  {r.shortLabel}
                </span>
                <span className="block truncate text-[10px] text-kula-400 dark:text-kula-600">
                  {r.label}
                </span>
              </button>
              {i < results.length - 1 && (
                <hr className="border-[var(--border)]" />
              )}
            </li>
          ))}
        </ul>
      )}

      {/* No results / error */}
      {searchError && !searching && (
        <p className="mb-3 text-xs text-kula-400 dark:text-kula-600">{searchError}</p>
      )}

      {selecting && (
        <p className="mb-3 text-xs text-kula-400 dark:text-kula-600">Saving location…</p>
      )}

      {/* Divider */}
      <div className="my-3 flex items-center gap-2">
        <hr className="flex-1 border-[var(--border)]" />
        <span className="text-[10px] text-kula-400 dark:text-kula-600">or</span>
        <hr className="flex-1 border-[var(--border)]" />
      </div>

      {/* Re-detect */}
      <button
        type="button"
        onClick={handleRedetect}
        disabled={isDetecting}
        className="w-full rounded-lg border border-[var(--border)] py-1.5 text-xs text-kula-700 transition-colors hover:border-kula-400 hover:text-kula-500 disabled:opacity-50 dark:text-kula-300 dark:hover:text-kula-300"
      >
        {isDetecting ? 'Detecting…' : '⟳ Use my current location'}
      </button>

      {detectionError && (
        <p className="mt-2 text-xs text-red-500">{detectionError}</p>
      )}
    </div>
  )
}
