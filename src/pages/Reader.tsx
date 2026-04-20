import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import * as Sentry from '@sentry/react'
import { useNotesForRef } from '../hooks/useNotes'
import { sefariaUrl } from '../data/catalog'
import { NotesPanel } from '../components/notes/NotesPanel'

/**
 * Stub reader — the tracker is not an in-app text viewer.
 *
 * All real text rendering happens in Sefaria (opens in a new tab via
 * sefariaUrl). This page exists so that:
 *   1. The notes drawer slides in when navigating to /read/:ref?notes=open
 *      (e.g. clicking a note on the Notebook page or the ✎ shortcut in the
 *      catalog tree).
 *   2. Users can open the text in Sefaria's bilingual view in one click.
 */
export default function Reader() {
  const { ref } = useParams<{ ref: string }>()
  const decodedRef = ref ? decodeURIComponent(ref) : null

  const notes = useNotesForRef(decodedRef)
  const [searchParams, setSearchParams] = useSearchParams()
  const [panelOpen, setPanelOpen] = useState(false)

  // Auto-open the notes panel when arriving via /read/:ref?notes=open
  // (e.g. clicking a note on the Notebook page).
  useEffect(() => {
    if (searchParams.get('notes') === 'open') {
      setPanelOpen(true)
      // Strip the param so the panel state isn't re-applied on every nav.
      const next = new URLSearchParams(searchParams)
      next.delete('notes')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams])

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Navigation */}
      <Link
        to="/browse"
        className="inline-block text-sm text-kula-500 transition-colors hover:text-kula-700 dark:text-kula-400 dark:hover:text-kula-200"
      >
        ← Back to browse
      </Link>

      {/* Title + actions */}
      <div className="space-y-4">
        <h2 className="font-serif text-3xl tracking-tight text-kula-900 dark:text-kula-50">
          {decodedRef ?? '…'}
        </h2>

        <div className="flex flex-wrap items-center gap-3">
          {/* Open bilingual text in Sefaria */}
          {decodedRef && (
            <a
              href={sefariaUrl(decodedRef)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-kula-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-kula-800 dark:bg-kula-400 dark:text-kula-950 dark:hover:bg-kula-300"
            >
              Open in Sefaria ↗
            </a>
          )}

          {/* Notes drawer toggle */}
          {decodedRef && (
            <button
              type="button"
              onClick={() => setPanelOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-kula-700 transition-colors hover:border-kula-400 hover:text-kula-600 dark:text-kula-300 dark:hover:border-kula-400 dark:hover:text-kula-200"
            >
              <svg
                viewBox="0 0 20 20"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 4h12v12H7l-3 3V4z" />
              </svg>
              Notes
              {notes.length > 0 && (
                <span className="rounded-full bg-kula-500/15 px-2 py-0.5 text-xs font-medium text-kula-600 dark:bg-kula-400/20 dark:text-kula-300">
                  {notes.length}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Hint text */}
      <p className="text-sm text-kula-500 dark:text-kula-400">
        Click{' '}
        <span className="font-medium text-kula-700 dark:text-kula-300">
          Open in Sefaria
        </span>{' '}
        to read the full bilingual text, or use the Notes button to record your
        thoughts here.
      </p>

      {/* Notes panel — wrapped in its own error boundary; it's the note editor */}
      {decodedRef && (
        <Sentry.ErrorBoundary fallback={<></>}>
          <NotesPanel
            refId={decodedRef}
            open={panelOpen}
            onClose={() => setPanelOpen(false)}
          />
        </Sentry.ErrorBoundary>
      )}
    </div>
  )
}
