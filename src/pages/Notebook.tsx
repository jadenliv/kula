import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useNotes } from '../hooks/useNotes'
import type { Note, NotePrivacy } from '../services/notes'
import { Spinner } from '../components/ui/Spinner'
import { TagPills, PrivacyIcon } from '../components/notes/NotesPanel'

// ── Export helpers ────────────────────────────────────────────────────────────

function formatExportDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function buildMarkdown(groups: Group[]): string {
  return groups
    .map((g) => {
      const noteLines = g.notes
        .map((n) => {
          const tagLine = n.tags.length > 0 ? `Tags: ${n.tags.join(', ')}\n` : ''
          return `## ${n.sefaria_ref} — ${formatExportDate(n.created_at)}\n${tagLine}\n${n.body}`
        })
        .join('\n\n---\n\n')
      return `# ${g.sefer}\n\n${noteLines}`
    })
    .join('\n\n\n')
}

function buildPlainText(groups: Group[]): string {
  return groups
    .map((g) => {
      const noteLines = g.notes
        .map((n) => {
          const tagLine = n.tags.length > 0 ? `Tags: ${n.tags.join(', ')}\n` : ''
          return `${n.sefaria_ref} — ${formatExportDate(n.created_at)}\n${tagLine}${n.body}`
        })
        .join('\n\n----------\n\n')
      return `=== ${g.sefer} ===\n\n${noteLines}`
    })
    .join('\n\n\n')
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function todaySlug(): string {
  return new Date().toISOString().slice(0, 10)
}

// ── Grouping + filtering ──────────────────────────────────────────────────────

type Group = { sefer: string; notes: Note[] }

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

function groupNotesBySefer(notes: Note[]): Group[] {
  const map = new Map<string, Note[]>()
  for (const note of notes) {
    const sefer = extractSeferFromRef(note.sefaria_ref)
    const list = map.get(sefer)
    if (list) list.push(note)
    else map.set(sefer, [note])
  }
  const groups: Group[] = Array.from(map.entries()).map(([sefer, ns]) => ({
    sefer,
    notes: [...ns].sort((a, b) =>
      a.sefaria_ref.localeCompare(b.sefaria_ref, undefined, { numeric: true }),
    ),
  }))
  groups.sort((a, b) => a.sefer.localeCompare(b.sefer))
  return groups
}

function matchesSearch(note: Note, query: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  return (
    note.body.toLowerCase().includes(q) ||
    note.sefaria_ref.toLowerCase().includes(q) ||
    note.tags.some((t) => t.toLowerCase().includes(q))
  )
}

function matchesTags(note: Note, activeTags: string[]): boolean {
  if (activeTags.length === 0) return true
  return activeTags.every((t) => note.tags.includes(t))
}

function matchesPrivacy(note: Note, filter: NotePrivacy | null): boolean {
  if (!filter) return true
  return note.privacy === filter
}

// ── Export dropdown ───────────────────────────────────────────────────────────

function ExportMenu({ groups }: { groups: Group[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleExport = (format: 'md' | 'txt') => {
    const slug = todaySlug()
    if (format === 'md') {
      downloadFile(buildMarkdown(groups), `kula-notebook-${slug}.md`, 'text/markdown')
    } else {
      downloadFile(buildPlainText(groups), `kula-notebook-${slug}.txt`, 'text/plain')
    }
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-sm text-kula-600 transition-colors hover:bg-[var(--surface-overlay)] dark:text-kula-400">
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 2v8M5 7l3 3 3-3M3 13h10" />
        </svg>
        Export
        <svg viewBox="0 0 12 12" className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 4l4 4 4-4" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-20 w-48 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xl">
          <button type="button" onClick={() => handleExport('md')}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-kula-700 transition-colors hover:bg-[var(--surface-raised)] dark:text-kula-300">
            <span className="font-mono text-xs text-kula-400">.md</span>
            Export as Markdown
          </button>
          <button type="button" onClick={() => handleExport('txt')}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-kula-700 transition-colors hover:bg-[var(--surface-raised)] dark:text-kula-300">
            <span className="font-mono text-xs text-kula-400">.txt</span>
            Export as plain text
          </button>
        </div>
      )}
    </div>
  )
}

// ── Notebook page ─────────────────────────────────────────────────────────────

const PRIVACY_FILTER_OPTIONS: { value: NotePrivacy | null; label: string }[] = [
  { value: null, label: 'All' },
  { value: 'private', label: 'Private' },
  { value: 'followers', label: 'Followers' },
  { value: 'public', label: 'Public' },
]

export default function Notebook() {
  const { data, isLoading, error } = useNotes()
  const [rawQuery, setRawQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [activeTags, setActiveTags] = useState<string[]>([])
  const [privacyFilter, setPrivacyFilter] = useState<NotePrivacy | null>(null)

  // 200ms debounce on search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(rawQuery), 200)
    return () => clearTimeout(timer)
  }, [rawQuery])

  const allNotes = data ?? []

  const allTags = useMemo(() => {
    const set = new Set<string>()
    for (const n of allNotes) for (const t of n.tags) set.add(t)
    return Array.from(set).sort()
  }, [allNotes])

  const filteredNotes = useMemo(
    () =>
      allNotes.filter(
        (n) =>
          matchesSearch(n, debouncedQuery) &&
          matchesTags(n, activeTags) &&
          matchesPrivacy(n, privacyFilter),
      ),
    [allNotes, debouncedQuery, activeTags, privacyFilter],
  )

  const groups = useMemo(() => groupNotesBySefer(filteredNotes), [filteredNotes])
  // Export always uses all notes — user is exporting their own data regardless of privacy
  const allGroups = useMemo(() => groupNotesBySefer(allNotes), [allNotes])

  const toggleTag = (tag: string) =>
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    )

  const isFiltered = debouncedQuery.trim() !== '' || activeTags.length > 0 || privacyFilter !== null

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl tracking-tight text-kula-900 dark:text-kula-50">Notebook</h2>
          <p className="mt-1 text-sm text-kula-500 dark:text-kula-400">
            Everything you've written, organised by where you wrote it.
          </p>
        </div>
        {allNotes.length > 0 && <ExportMenu groups={allGroups} />}
      </div>

      {/* Search bar */}
      <div className="relative">
        <svg viewBox="0 0 20 20" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-kula-400 dark:text-kula-600"
          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8.5" cy="8.5" r="5.5" /><path d="M15 15l3 3" />
        </svg>
        <input type="text" value={rawQuery} onChange={(e) => setRawQuery(e.target.value)}
          placeholder="Search notes, refs, tags…"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2 pl-9 pr-9 text-sm text-kula-900 placeholder:text-kula-400 transition-colors focus:border-kula-400 focus:outline-none dark:text-kula-100" />
        {rawQuery && (
          <button type="button" onClick={() => setRawQuery('')} aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-kula-400 hover:text-kula-700 dark:hover:text-kula-200">
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        )}
      </div>

      {/* Filter row: tags + privacy */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Privacy filter */}
        <div className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-1">
          {PRIVACY_FILTER_OPTIONS.map((opt) => (
            <button key={String(opt.value)} type="button"
              onClick={() => setPrivacyFilter(opt.value)}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                privacyFilter === opt.value
                  ? 'bg-[var(--surface)] text-kula-700 shadow-sm dark:text-kula-200'
                  : 'text-kula-400 hover:text-kula-600 dark:text-kula-600 dark:hover:text-kula-400'
              }`}>
              {opt.value && <PrivacyIcon privacy={opt.value} />}
              {opt.label}
            </button>
          ))}
        </div>

        {/* Tag filter pills */}
        {allTags.map((tag) => (
          <button key={tag} type="button" onClick={() => toggleTag(tag)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              activeTags.includes(tag)
                ? 'bg-kula-600 text-white dark:bg-kula-400 dark:text-kula-950'
                : 'bg-kula-500/10 text-kula-600 hover:bg-kula-500/20 dark:bg-kula-400/10 dark:text-kula-400 dark:hover:bg-kula-400/20'
            }`}>
            {tag}
          </button>
        ))}

        {/* Clear filters */}
        {(activeTags.length > 0 || privacyFilter !== null) && (
          <button type="button"
            onClick={() => { setActiveTags([]); setPrivacyFilter(null) }}
            className="rounded-full px-2.5 py-1 text-xs text-kula-400 underline-offset-2 hover:underline dark:text-kula-600">
            Clear filters
          </button>
        )}
      </div>

      {/* Loading / error */}
      {isLoading && (
        <div className="flex items-center gap-3 text-sm text-kula-600 dark:text-kula-400">
          <Spinner size="sm" /> Loading notes…
        </div>
      )}
      {error && (
        <p className="text-sm text-red-400">
          Failed to load notes: {error instanceof Error ? error.message : String(error)}
        </p>
      )}

      {/* Empty states */}
      {!isLoading && !error && allNotes.length === 0 && (
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-raised)] px-6 py-12 text-center">
          <p className="text-sm text-kula-500 dark:text-kula-400">
            No notes yet. Open any text from{' '}
            <Link to="/browse" className="font-medium text-kula-600 underline-offset-2 hover:underline dark:text-kula-300">Browse</Link>
            {' '}and tap the Notes button to write your first one.
          </p>
        </div>
      )}

      {!isLoading && !error && allNotes.length > 0 && isFiltered && groups.length === 0 && (
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-raised)] px-6 py-10 text-center">
          <p className="text-sm text-kula-500 dark:text-kula-400">
            No notes match
            {rawQuery ? ` "${rawQuery}"` : ''}
            {privacyFilter ? ` with visibility "${privacyFilter}"` : ''}
            {activeTags.length > 0
              ? ` with tag${activeTags.length > 1 ? 's' : ''} ${activeTags.map((t) => `"${t}"`).join(', ')}`
              : ''}.
          </p>
        </div>
      )}

      {/* Note groups */}
      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.sefer}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
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

// ── Note card ─────────────────────────────────────────────────────────────────

function NoteCard({ note }: { note: Note }) {
  return (
    <Link to={`/read/${encodeURIComponent(note.sefaria_ref)}?notes=open`}
      className="block rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-3 transition-colors hover:border-kula-400/60 hover:bg-[var(--surface-overlay)]">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-kula-700 dark:text-kula-300">
          {note.sefaria_ref}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          {/* Privacy indicator — quiet, just an icon with tooltip */}
          <span className="text-kula-300 dark:text-kula-700" title={
            note.privacy === 'private' ? 'Private' :
            note.privacy === 'followers' ? 'Followers only' :
            'Public'
          }>
            <PrivacyIcon privacy={note.privacy} className="text-kula-300 dark:text-kula-700" />
          </span>
          <time dateTime={note.created_at} className="text-xs text-kula-400 dark:text-kula-600">
            {formatDate(note.created_at)}
            {note.updated_at !== note.created_at && ' · edited'}
          </time>
        </div>
      </div>
      <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm text-kula-800 dark:text-kula-200">
        {note.body}
      </p>
      <TagPills tags={note.tags} />
    </Link>
  )
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
