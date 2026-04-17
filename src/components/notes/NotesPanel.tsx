import { useEffect, useMemo, useRef, useState } from 'react'
import {
  useAddNote,
  useDeleteNote,
  useNotes,
  useNotesForRef,
  useUpdateNote,
} from '../../hooks/useNotes'
import type { Note } from '../../services/notes'
import { Spinner } from '../ui/Spinner'

type Props = {
  refId: string
  open: boolean
  onClose: () => void
}

// ── Tag input ─────────────────────────────────────────────────────────────────

function TagInput({
  tags,
  onChange,
  allTags,
}: {
  tags: string[]
  onChange: (tags: string[]) => void
  allTags: string[]
}) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const suggestions = useMemo(() => {
    if (!input.trim()) return []
    const q = input.toLowerCase()
    return allTags.filter(
      (t) => t.toLowerCase().startsWith(q) && !tags.includes(t),
    ).slice(0, 5)
  }, [input, allTags, tags])

  const addTag = (raw: string) => {
    const tag = raw.trim().toLowerCase()
    if (!tag || tags.includes(tag)) { setInput(''); return }
    onChange([...tags, tag])
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input)
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  return (
    <div className="mt-2">
      <div
        className="flex flex-wrap items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 py-1.5 transition-colors focus-within:border-kula-400"
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full bg-kula-500/10 px-2 py-0.5 text-xs font-medium text-kula-600 dark:bg-kula-400/10 dark:text-kula-400"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(tags.filter((t) => t !== tag)) }}
              className="rounded-full text-kula-400 hover:text-kula-700 dark:hover:text-kula-200"
              aria-label={`Remove tag ${tag}`}
            >
              <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M2 2l8 8M10 2L2 10" />
              </svg>
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? 'Add tags…' : ''}
          className="min-w-16 flex-1 bg-transparent text-xs text-kula-900 placeholder:text-kula-400 focus:outline-none dark:text-kula-100"
        />
      </div>
      {/* Autocomplete suggestions */}
      {suggestions.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-kula-500 hover:border-kula-400 hover:text-kula-700 dark:text-kula-500 dark:hover:text-kula-300"
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <p className="mt-1 text-xs text-kula-400 dark:text-kula-600">Enter or comma to add a tag</p>
    </div>
  )
}

// ── Tag pills (read-only) ─────────────────────────────────────────────────────

export function TagPills({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded-full bg-kula-500/10 px-2 py-0.5 text-xs font-medium text-kula-600 dark:bg-kula-400/10 dark:text-kula-400"
        >
          {tag}
        </span>
      ))}
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function NotesPanel({ refId, open, onClose }: Props) {
  const notes = useNotesForRef(refId)
  const { data: allNotes = [] } = useNotes()
  const addNote = useAddNote()
  const [draft, setDraft] = useState('')
  const [draftTags, setDraftTags] = useState<string[]>([])
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // Collect all unique tags the user has ever used for autocomplete
  const allTags = useMemo(() => {
    const set = new Set<string>()
    for (const n of allNotes) for (const t of n.tags) set.add(t)
    return Array.from(set).sort()
  }, [allNotes])

  useEffect(() => {
    if (open && textareaRef.current) textareaRef.current.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const handleSubmit = () => {
    const body = draft.trim()
    if (!body) return
    addNote.mutate(
      { ref: refId, body, tags: draftTags },
      { onSuccess: () => { setDraft(''); setDraftTags([]) } },
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-kula-950/50 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Drawer */}
      <aside
        role="dialog"
        aria-label={`Notes on ${refId}`}
        aria-hidden={!open}
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-[var(--border)] bg-[var(--surface)] shadow-2xl transition-transform duration-200 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-kula-500">
              Notes on
            </p>
            <h3 className="font-serif text-lg text-kula-900 dark:text-kula-50">{refId}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notes"
            className="rounded-lg p-1.5 text-kula-400 transition-colors hover:bg-[var(--surface-raised)] hover:text-kula-700 dark:hover:text-kula-200"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </header>

        <div className="flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
          {notes.length === 0 ? (
            <p className="py-8 text-center text-sm text-kula-500">
              No notes yet. Write your first thought below.
            </p>
          ) : (
            notes.map((note) => (
              <NoteRow key={note.id} note={note} allTags={allTags} />
            ))
          )}
        </div>

        <footer className="border-t border-[var(--border)] px-4 py-3">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
            placeholder="Add a note…"
            className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-2.5 text-sm text-kula-900 placeholder:text-kula-400 transition-colors focus:border-kula-400 focus:outline-none dark:text-kula-100 dark:placeholder:text-kula-600"
          />
          <TagInput tags={draftTags} onChange={setDraftTags} allTags={allTags} />
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-xs text-kula-400">⌘/Ctrl + Enter to save</span>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!draft.trim() || addNote.isPending}
              className="rounded-lg bg-kula-700 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-kula-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-kula-400 dark:text-kula-950 dark:hover:bg-kula-300"
            >
              {addNote.isPending ? 'Saving…' : 'Add note'}
            </button>
          </div>
        </footer>
      </aside>
    </>
  )
}

// ── Note row ──────────────────────────────────────────────────────────────────

function NoteRow({ note, allTags }: { note: Note; allTags: string[] }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(note.body)
  const [editTags, setEditTags] = useState<string[]>(note.tags)
  const update = useUpdateNote()
  const remove = useDeleteNote()

  const isOptimistic = note.id.startsWith('optimistic-')

  const handleSave = () => {
    const body = draft.trim()
    if (!body) { setEditing(false); setDraft(note.body); return }
    update.mutate(
      { id: note.id, body, tags: editTags },
      { onSuccess: () => setEditing(false) },
    )
  }

  const handleCancel = () => {
    setDraft(note.body)
    setEditTags(note.tags)
    setEditing(false)
  }

  return (
    <article className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3">
      {editing ? (
        <>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--app-bg)] p-2 text-sm text-kula-900 focus:border-kula-400 focus:outline-none dark:text-kula-100"
          />
          <TagInput tags={editTags} onChange={setEditTags} allTags={allTags} />
          <div className="mt-2 flex justify-end gap-2 text-xs">
            <button type="button" onClick={handleCancel} className="rounded-lg px-2 py-1 text-kula-500 hover:text-kula-800 dark:hover:text-kula-200">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={update.isPending}
              className="rounded-lg bg-kula-700 px-2 py-1 text-white hover:bg-kula-800 disabled:opacity-40 dark:bg-kula-400 dark:text-kula-950 dark:hover:bg-kula-300"
            >
              {update.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="whitespace-pre-wrap text-sm text-kula-800 dark:text-kula-200">
            {note.body}
          </p>
          <TagPills tags={note.tags} />
          <div className="mt-2 flex items-center justify-between text-xs text-kula-500">
            <time dateTime={note.created_at}>
              {formatTimestamp(note.created_at)}
              {note.updated_at !== note.created_at && ' · edited'}
              {isOptimistic && (
                <span className="ml-2 inline-flex items-center gap-1">
                  <Spinner size="sm" /> saving
                </span>
              )}
            </time>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setEditTags(note.tags); setEditing(true) }}
                disabled={isOptimistic}
                className="hover:text-kula-700 disabled:opacity-40 dark:hover:text-kula-300"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => remove.mutate({ id: note.id })}
                disabled={isOptimistic}
                className="hover:text-red-500 disabled:opacity-40"
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}
    </article>
  )
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  if (sameDay) return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  })
}
