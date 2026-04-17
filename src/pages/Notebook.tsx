import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useNotes } from '../hooks/useNotes'
import type { Note } from '../services/notes'
import { Spinner } from '../components/ui/Spinner'

/**
 * Notebook page — every note the user has written, grouped by sefer.
 * Sefer name is derived from the ref by stripping the trailing section
 * address; within each sefer notes are sorted by ref (natural order so
 * "Genesis 10" comes after "Genesis 2", and Talmud "2b" after "2a").
 */
export default function Notebook() {
  const { data, isLoading, error } = useNotes()

  const groups = useMemo(() => groupNotesBySefer(data ?? []), [data])

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="font-serif text-3xl tracking-tight text-kula-900 dark:text-kula-50">
          Notebook
        </h2>
        <p className="mt-1 text-sm text-kula-500 dark:text-kula-400">
          Everything you've written, organized by where you wrote it. Click a
          note to jump back to the text.
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center gap-3 text-sm text-kula-600 dark:text-kula-400">
          <Spinner size="sm" /> Loading notes…
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400">
          Failed to load notes:{' '}
          {error instanceof Error ? error.message : String(error)}
        </p>
      )}

      {!isLoading && !error && groups.length === 0 && (
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-raised)] px-6 py-12 text-center">
          <p className="text-sm text-kula-500 dark:text-kula-400">
            No notes yet. Open any text from{' '}
            <Link
              to="/browse"
              className="font-medium text-kula-600 underline-offset-2 hover:underline dark:text-kula-300"
            >
              Browse
            </Link>{' '}
            and tap the Notes button to write your first one.
          </p>
        </div>
      )}

      <div className="space-y-6">
        {groups.map((group) => (
          <section
            key={group.sefer}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm"
          >
            <h3 className="mb-3 font-serif text-xl text-kula-900 dark:text-kula-100">
              {group.sefer}
              <span className="ml-2 text-xs font-normal text-kula-400 dark:text-kula-600">
                {group.notes.length} note{group.notes.length === 1 ? '' : 's'}
              </span>
            </h3>
            <div className="space-y-3">
              {group.notes.map((note) => (
                <NoteCard key={note.id} note={note} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

function NoteCard({ note }: { note: Note }) {
  return (
    <Link
      to={`/read/${encodeURIComponent(note.sefaria_ref)}?notes=open`}
      className="block rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-3 transition-colors hover:border-kula-400/60 hover:bg-[var(--surface-overlay)]"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-kula-700 dark:text-kula-300">
          {note.sefaria_ref}
        </span>
        <time
          dateTime={note.created_at}
          className="shrink-0 text-xs text-kula-400 dark:text-kula-600"
        >
          {formatDate(note.created_at)}
          {note.updated_at !== note.created_at && ' · edited'}
        </time>
      </div>
      <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm text-kula-800 dark:text-kula-200">
        {note.body}
      </p>
    </Link>
  )
}

type Group = {
  sefer: string
  notes: Note[]
}

function groupNotesBySefer(notes: Note[]): Group[] {
  const map = new Map<string, Note[]>()
  for (const note of notes) {
    const sefer = extractSeferFromRef(note.sefaria_ref)
    const list = map.get(sefer)
    if (list) list.push(note)
    else map.set(sefer, [note])
  }
  // Sort each group's notes by ref using natural numeric ordering so
  // "Genesis 2" precedes "Genesis 10" and "Berakhot 2a" precedes "2b".
  const groups: Group[] = Array.from(map.entries()).map(([sefer, ns]) => ({
    sefer,
    notes: [...ns].sort((a, b) =>
      a.sefaria_ref.localeCompare(b.sefaria_ref, undefined, { numeric: true }),
    ),
  }))
  // Sort groups alphabetically by sefer name.
  groups.sort((a, b) => a.sefer.localeCompare(b.sefer))
  return groups
}

/**
 * Best-effort sefer extractor. Sefaria refs follow patterns like:
 *   "Genesis 5", "Berakhot 2a", "I Samuel 3",
 *   "Mishneh Torah, Fundamentals of the Torah, 1"
 * We find the rightmost whitespace-separated token that contains a digit
 * and treat everything before it as the sefer path. Strips a trailing
 * comma so complex-schema refs come out clean.
 */
function extractSeferFromRef(ref: string): string {
  const parts = ref.split(/\s+/)
  for (let i = parts.length - 1; i >= 0; i--) {
    if (/\d/.test(parts[i])) {
      const sefer = parts.slice(0, i).join(' ').replace(/,\s*$/, '').trim()
      return sefer || ref
    }
  }
  return ref
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  })
}
