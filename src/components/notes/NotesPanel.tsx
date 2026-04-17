import { useEffect, useRef, useState } from 'react'
import {
  useAddNote,
  useDeleteNote,
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

export function NotesPanel({ refId, open, onClose }: Props) {
  const notes = useNotesForRef(refId)
  const addNote = useAddNote()
  const [draft, setDraft] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (open && textareaRef.current) textareaRef.current.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const handleSubmit = () => {
    const body = draft.trim()
    if (!body) return
    addNote.mutate({ ref: refId, body }, { onSuccess: () => setDraft('') })
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
            notes.map((note) => <NoteRow key={note.id} note={note} />)
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

function NoteRow({ note }: { note: Note }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(note.body)
  const update = useUpdateNote()
  const remove = useDeleteNote()

  const isOptimistic = note.id.startsWith('optimistic-')

  const handleSave = () => {
    const body = draft.trim()
    if (!body || body === note.body) {
      setEditing(false)
      setDraft(note.body)
      return
    }
    update.mutate({ id: note.id, body }, { onSuccess: () => setEditing(false) })
  }

  const handleCancel = () => {
    setDraft(note.body)
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
          <div className="mt-2 flex justify-end gap-2 text-xs">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg px-2 py-1 text-kula-500 hover:text-kula-800 dark:hover:text-kula-200"
            >
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
                onClick={() => setEditing(true)}
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
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  }
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  })
}
