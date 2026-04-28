import { useState, useRef, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSourceLookup } from '../hooks/useSourceLookup'
import { Spinner } from '../components/ui/Spinner'
import type { SourceHit } from '../services/sourceLookup'

// ---------------------------------------------------------------------------
// Example queries shown before the user has searched
// ---------------------------------------------------------------------------
const EXAMPLE_QUERIES = [
  'Where is the source for Shabbat candle lighting?',
  'Where does the Torah discuss honoring parents?',
  'Where is tzedakah discussed in the Rambam?',
  'Where is Kiddush on Shabbat morning sourced?',
  'Where does the Talmud discuss teshuvah?',
  'Where are the laws of lashon hara written?',
]

// ---------------------------------------------------------------------------
// Source card
// ---------------------------------------------------------------------------
function SourceCard({ source }: { source: SourceHit }) {
  const navigate = useNavigate()

  // Attempt to build an internal reader link from the ref.
  // If the ref contains commas (e.g. "Shulchan Arukh, OC 1:1") or is very long
  // it may not map cleanly — fall back to Sefaria.
  function openInReader() {
    navigate(`/read/${encodeURIComponent(source.ref)}`)
  }

  return (
    <div className="card-interactive flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      {/* Ref names */}
      <div>
        <p className="text-sm font-semibold leading-tight text-kula-800 dark:text-kula-100">
          {source.ref}
        </p>
        {source.heRef && (
          <p className="mt-0.5 text-xs text-kula-400 dark:text-kula-500" dir="rtl">
            {source.heRef}
          </p>
        )}
      </div>

      {/* English snippet */}
      {source.text && (
        <p className="line-clamp-4 text-sm leading-relaxed text-kula-700 dark:text-kula-300">
          "{source.text}{source.text.length >= 400 ? '…' : ''}"
        </p>
      )}

      {/* Hebrew snippet */}
      {source.heText && (
        <p
          className="line-clamp-2 text-xs leading-relaxed text-kula-400 dark:text-kula-500"
          dir="rtl"
          lang="he"
        >
          {source.heText}
        </p>
      )}

      {/* Actions */}
      <div className="mt-auto flex items-center gap-3 border-t border-[var(--border-subtle)] pt-3">
        <button
          type="button"
          onClick={openInReader}
          className="text-xs font-medium text-kula-500 transition-colors hover:text-kula-700 dark:text-kula-400 dark:hover:text-kula-200"
        >
          Open in Reader ↗
        </button>
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-kula-400 transition-colors hover:text-kula-600 dark:text-kula-500 dark:hover:text-kula-300"
        >
          Sefaria ↗
        </a>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Setup notice — shown when the function isn't deployed yet
// ---------------------------------------------------------------------------
function SetupNotice() {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 text-sm leading-relaxed text-kula-600 dark:text-kula-400">
      <p className="mb-3 font-semibold text-kula-800 dark:text-kula-200">
        One-time setup required
      </p>
      <ol className="list-decimal space-y-2 pl-4">
        <li>
          Add your Anthropic API key to Supabase:{' '}
          <span className="rounded bg-kula-500/10 px-1.5 py-0.5 font-mono text-xs">
            supabase secrets set ANTHROPIC_API_KEY=sk-ant-…
          </span>
        </li>
        <li>
          Deploy the edge function:{' '}
          <span className="rounded bg-kula-500/10 px-1.5 py-0.5 font-mono text-xs">
            supabase functions deploy source-lookup
          </span>
        </li>
        <li>Reload this page and search away.</li>
      </ol>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function Sources() {
  const { data, isLoading, error, lastQuery, search, clear } = useSourceLookup()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const showSetup = error?.includes('not deployed')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    search(query)
  }

  function runExample(q: string) {
    setQuery(q)
    search(q)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 md:space-y-8">

      {/* Header */}
      <div>
        <h2 className="font-serif text-2xl tracking-tight text-kula-900 dark:text-kula-50 md:text-3xl">
          מקורות{' '}
          <span className="font-sans text-lg font-normal text-kula-400 dark:text-kula-500">
            Sources
          </span>
        </h2>
        <p className="mt-1 text-sm text-kula-500 dark:text-kula-400">
          Ask where something is written — texts fetched live from Sefaria.
        </p>
      </div>

      {/* Search form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Where is Shabbat candle lighting discussed?"
          disabled={isLoading}
          className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-kula-900 placeholder-kula-400 transition-colors focus:border-kula-400 focus:outline-none dark:text-kula-100 dark:placeholder-kula-600"
        />
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="flex items-center gap-2 rounded-xl bg-kula-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-kula-500 disabled:opacity-40 dark:bg-kula-500 dark:hover:bg-kula-400"
        >
          {isLoading ? <Spinner size="sm" /> : (
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8.5" cy="8.5" r="5.5" />
              <path d="M17 17l-4-4" />
            </svg>
          )}
          {isLoading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {/* Example queries — shown before any search */}
      {!data && !isLoading && !error && (
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-kula-400 dark:text-kula-600">
            Try asking where to find
          </p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUERIES.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => runExample(q)}
                className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-kula-600 transition-colors hover:border-kula-400 hover:text-kula-700 dark:text-kula-400 dark:hover:border-kula-500 dark:hover:text-kula-300"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center gap-3 text-sm text-kula-500 dark:text-kula-400">
            <Spinner size="sm" />
            Identifying sources and fetching texts…
          </div>
          {/* Skeleton cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface)]"
                style={{ animationDelay: `${i * 80}ms` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="animate-fade-in space-y-4">
          {!showSetup && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-400">
              {error}
            </p>
          )}
          {showSetup && <SetupNotice />}
          <button
            type="button"
            onClick={clear}
            className="text-xs text-kula-400 hover:text-kula-600 dark:hover:text-kula-300"
          >
            ← Try a different query
          </button>
        </div>
      )}

      {/* Results */}
      {data && !isLoading && (
        <div className="animate-fade-in space-y-6">

          {/* Query echo + clear */}
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-kula-500 dark:text-kula-400">
              Results for{' '}
              <span className="font-medium text-kula-700 dark:text-kula-200">
                "{lastQuery}"
              </span>
            </p>
            <button
              type="button"
              onClick={() => { clear(); setQuery(''); inputRef.current?.focus() }}
              className="text-xs text-kula-400 transition-colors hover:text-kula-600 dark:hover:text-kula-300"
            >
              New search
            </button>
          </div>

          {/* Synthesis card */}
          <div className="rounded-xl border border-kula-400/30 bg-kula-400/5 p-5 dark:border-kula-400/20 dark:bg-kula-400/5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-kula-500 dark:text-kula-400">
              Summary
            </p>
            <p className="text-sm leading-relaxed text-kula-800 dark:text-kula-200">
              {data.synthesis}
            </p>
          </div>

          {/* Source cards */}
          {data.sources.length > 0 ? (
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-kula-400 dark:text-kula-600">
                {data.sources.length} source{data.sources.length !== 1 ? 's' : ''}
              </p>
              <div className="stagger-grid grid grid-cols-1 gap-3 sm:grid-cols-2">
                {data.sources.map((source) => (
                  <SourceCard key={source.ref} source={source} />
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm italic text-kula-400 dark:text-kula-600">
              Could not retrieve source texts from Sefaria for this query.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
