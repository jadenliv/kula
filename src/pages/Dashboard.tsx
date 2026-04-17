import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LearningTimer } from '../components/timer/LearningTimer'
import { useSessions, useDeleteSession } from '../hooks/useSessions'
import { useUserSefarim, useAddUserSefer, useUpdateUserSeferStatus, useRemoveUserSefer } from '../hooks/useUserSefarim'
import { useCompletions } from '../hooks/useCompletions'
import { useNotes } from '../hooks/useNotes'
import { useTimer } from '../context/TimerContext'
import { Spinner } from '../components/ui/Spinner'
import type { LearningSession } from '../services/sessions'
import type { UserSefer } from '../services/userSefarim'
import { getPickerItems, getPickerTree, refsForSefer, type PickerItem, type PickerTreeNode } from '../lib/catalogUtils'
import type { Completion } from '../services/completions'

// ── Time formatting ──────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (seconds < 60) return '< 1m'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h${m > 0 ? ` ${m}m` : ''}`
  return `${m}m`
}

function formatSessionDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterday = today - 86400000
  const sessionDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  if (sessionDay === today) return 'Today'
  if (sessionDay === yesterday) return 'Yesterday'
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

function formatNoteDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const today = startOfDay(now)
  const noteDay = startOfDay(d)
  if (noteDay === today) return 'Today'
  if (noteDay === today - 86400000) return 'Yesterday'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// ── Time stat calculations (no streak) ──────────────────────────────────────

type TimeStats = {
  todaySeconds: number
  weekSeconds: number
  totalSeconds: number
  totalSessions: number
}

function calcTimeStats(sessions: LearningSession[]): TimeStats {
  const completed = sessions.filter((s) => s.ended_at && s.duration_seconds)
  const now = new Date()
  const todayStart = startOfDay(now)
  const weekStart = todayStart - 6 * 86400000

  let todaySeconds = 0
  let weekSeconds = 0
  let totalSeconds = 0

  for (const s of completed) {
    const dur = s.duration_seconds!
    const t = new Date(s.started_at).getTime()
    totalSeconds += dur
    if (t >= todayStart) todaySeconds += dur
    if (t >= weekStart) weekSeconds += dur
  }

  return { todaySeconds, weekSeconds, totalSeconds, totalSessions: completed.length }
}

type SessionGroup = { dateLabel: string; sessions: LearningSession[] }

function groupSessionsByDate(sessions: LearningSession[]): SessionGroup[] {
  const groups = new Map<string, LearningSession[]>()
  for (const s of sessions) {
    if (!s.ended_at) continue
    const label = formatSessionDate(s.started_at)
    const list = groups.get(label)
    if (list) list.push(s)
    else groups.set(label, [s])
  }
  return Array.from(groups.entries()).map(([dateLabel, sessions]) => ({ dateLabel, sessions }))
}

// ── Sefer progress calculation ───────────────────────────────────────────────

type SeferProgress = {
  total: number
  completed: number
  lastRef: string | null
}

function calcSeferProgress(
  seferId: string,
  completions: Completion[],
): SeferProgress {
  const allRefs = refsForSefer(seferId)
  if (allRefs.length === 0) return { total: 0, completed: 0, lastRef: null }

  const refSet = new Set(allRefs)
  let completedCount = 0
  let lastRef: string | null = null

  // completions are ordered newest first — first match is the latest completed
  for (const c of completions) {
    if (refSet.has(c.sefaria_ref)) {
      completedCount++
      if (!lastRef) lastRef = c.sefaria_ref
    }
  }

  return { total: allRefs.length, completed: completedCount, lastRef }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEFER PICKER
// ═══════════════════════════════════════════════════════════════════════════════

// ── Picker tree row (recursive accordion) ────────────────────────────────────

type AddHandler = (node: { english: string; hebrew?: string; totalRefs: number }) => void

function PickerTreeRow({
  node,
  depth,
  existingIds,
  onAdd,
  pending,
}: {
  node: PickerTreeNode
  depth: number
  existingIds: Set<string>
  onAdd: AddHandler
  pending: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const hasChildren = node.children.length > 0
  const alreadyAdded = existingIds.has(node.english)

  return (
    <div>
      <div
        className="group flex items-center gap-1 pr-2 transition-colors hover:bg-[var(--surface-raised)]"
        style={{ paddingLeft: `${depth * 1.25 + 0.75}rem` }}
      >
        {/* Expand / collapse chevron — only shown when there are children */}
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? 'Collapse' : 'Expand'}
            className="flex h-8 w-6 shrink-0 items-center justify-center rounded text-kula-400 hover:text-kula-700 dark:hover:text-kula-200"
          >
            <svg
              viewBox="0 0 16 16"
              className={`h-3 w-3 transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 3l6 5-6 5" />
            </svg>
          </button>
        ) : (
          <span className="w-6 shrink-0" />
        )}

        {/* Name — clicking expands if there are children */}
        <div
          className={`flex min-w-0 flex-1 py-2.5 ${hasChildren ? 'cursor-pointer' : ''}`}
          onClick={hasChildren ? () => setExpanded((v) => !v) : undefined}
        >
          <span className="min-w-0">
            <span className={`block text-sm ${alreadyAdded ? 'text-kula-400 dark:text-kula-600' : 'font-medium text-kula-800 dark:text-kula-200'}`}>
              {node.english}
            </span>
            {node.hebrew && (
              <span className="block text-xs text-kula-400 dark:text-kula-500" dir="rtl">
                {node.hebrew}
              </span>
            )}
          </span>
        </div>

        {/* Add button — explicit "+" or checkmark */}
        <button
          type="button"
          disabled={alreadyAdded || pending}
          onClick={() => onAdd(node)}
          aria-label={alreadyAdded ? 'Already added' : `Add ${node.english}`}
          className="ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-default"
          style={alreadyAdded
            ? { color: 'var(--color-kula-400)' }
            : undefined}
        >
          {alreadyAdded ? (
            // Checkmark
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-kula-400 dark:text-kula-600" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 8l4 4 6-7" />
            </svg>
          ) : (
            // Plus
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-kula-400 transition-colors group-hover:text-kula-700 dark:group-hover:text-kula-300" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M8 2v12M2 8h12" />
            </svg>
          )}
        </button>
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <PickerTreeRow
              key={child.english}
              node={child}
              depth={depth + 1}
              existingIds={existingIds}
              onAdd={onAdd}
              pending={pending}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Flat search result row ────────────────────────────────────────────────────

function PickerFlatRow({
  item,
  alreadyAdded,
  onAdd,
  pending,
}: {
  item: PickerItem
  alreadyAdded: boolean
  onAdd: (item: PickerItem) => void
  pending: boolean
}) {
  return (
    <li className="group flex items-center gap-1 pr-2 transition-colors hover:bg-[var(--surface-raised)]">
      <div className="min-w-0 flex-1 px-4 py-2.5">
        <span className={`block text-sm ${alreadyAdded ? 'text-kula-400 dark:text-kula-600' : 'font-medium text-kula-800 dark:text-kula-200'}`}>
          {item.english}
        </span>
        {item.hebrew && (
          <span className="block text-xs text-kula-400 dark:text-kula-500" dir="rtl">
            {item.hebrew}
          </span>
        )}
      </div>
      <button
        type="button"
        disabled={alreadyAdded || pending}
        onClick={() => onAdd(item)}
        aria-label={alreadyAdded ? 'Already added' : `Add ${item.english}`}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-default"
      >
        {alreadyAdded ? (
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-kula-400 dark:text-kula-600" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8l4 4 6-7" />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-kula-400 transition-colors group-hover:text-kula-700 dark:group-hover:text-kula-300" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M8 2v12M2 8h12" />
          </svg>
        )}
      </button>
    </li>
  )
}

// ── Picker modal ──────────────────────────────────────────────────────────────

function SeferPicker({
  onClose,
  existingIds,
}: {
  onClose: () => void
  existingIds: Set<string>
}) {
  const [query, setQuery] = useState('')
  const addSefer = useAddUserSefer()

  // For search: flat list
  const allItems = useMemo(() => getPickerItems(), [])
  // For browse: tree
  const tree = useMemo(() => getPickerTree(), [])

  const filtered = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return allItems.filter(
      (item) =>
        item.english.toLowerCase().includes(q) ||
        (item.hebrew ?? '').toLowerCase().includes(q),
    )
  }, [query, allItems])

  const handleAddFlat = (item: PickerItem) => {
    if (existingIds.has(item.english)) return
    addSefer.mutate(
      { seferId: item.english, seferLabelEn: item.english, seferLabelHe: item.hebrew ?? null },
      { onSuccess: onClose },
    )
  }

  const handleAddTree = (node: { english: string; hebrew?: string }) => {
    if (existingIds.has(node.english)) return
    addSefer.mutate(
      { seferId: node.english, seferLabelEn: node.english, seferLabelHe: node.hebrew ?? null },
      { onSuccess: onClose },
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <p className="font-medium text-kula-900 dark:text-kula-50">Add a sefer</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-kula-400 hover:bg-[var(--surface-raised)] hover:text-kula-700 dark:hover:text-kula-200"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 4l12 12M16 4L4 16" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-[var(--border)] px-4 py-2.5">
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sefarim…"
            className="w-full bg-transparent text-sm text-kula-900 placeholder:text-kula-400 focus:outline-none dark:text-kula-50"
          />
        </div>

        {/* Content */}
        <div className="overflow-y-auto">
          {query.trim() ? (
            // ── Flat search results ──
            filtered.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-kula-400 dark:text-kula-600">
                No results for "{query}"
              </p>
            ) : (
              <ul>
                {filtered.map((item) => (
                  <PickerFlatRow
                    key={item.english}
                    item={item}
                    alreadyAdded={existingIds.has(item.english)}
                    onAdd={handleAddFlat}
                    pending={addSefer.isPending}
                  />
                ))}
              </ul>
            )
          ) : (
            // ── Accordion tree browse ──
            <div className="py-1">
              {tree.map((topNode) => (
                <PickerTreeRow
                  key={topNode.english}
                  node={topNode}
                  depth={0}
                  existingIds={existingIds}
                  onAdd={handleAddTree}
                  pending={addSefer.isPending}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEFER ROW (Currently Learning)
// ═══════════════════════════════════════════════════════════════════════════════

function SeferRow({
  sefer,
  completions,
}: {
  sefer: UserSefer
  completions: Completion[]
}) {
  const updateStatus = useUpdateUserSeferStatus()
  const removeSefer = useRemoveUserSefer()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const progress = useMemo(
    () => calcSeferProgress(sefer.sefer_id, completions),
    [sefer.sefer_id, completions],
  )
  const pct = progress.total > 0
    ? Math.round((progress.completed / progress.total) * 100)
    : 0

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  return (
    <div className="group flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:border-kula-300/60 dark:hover:border-kula-700/60">
      {/* Clickable main area → Browse */}
      <button
        type="button"
        onClick={() => navigate('/browse')}
        className="min-w-0 flex-1 text-left"
      >
        {/* Name row */}
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-sm font-semibold text-kula-900 dark:text-kula-100">
            {sefer.sefer_label_en}
          </span>
          {sefer.sefer_label_he && (
            <span className="font-['Heebo'] text-xs text-kula-500 dark:text-kula-500" dir="rtl">
              {sefer.sefer_label_he}
            </span>
          )}
        </div>

        {/* Last learned */}
        {progress.lastRef ? (
          <p className="mt-0.5 text-xs text-kula-500 dark:text-kula-400">
            Last learned:{' '}
            <span className="font-medium text-kula-700 dark:text-kula-300">
              {progress.lastRef}
            </span>
          </p>
        ) : (
          <p className="mt-0.5 text-xs italic text-kula-400 dark:text-kula-600">
            Nothing marked yet
          </p>
        )}

        {/* Progress bar */}
        {progress.total > 0 && (
          <div className="mt-2.5">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="tabular-nums text-kula-500 dark:text-kula-400">
                {progress.completed.toLocaleString()} /{' '}
                {progress.total.toLocaleString()} · {pct}%
              </span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--surface-raised)]">
              <div
                className="h-full rounded-full bg-kula-500 transition-all duration-500 dark:bg-kula-400"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}
      </button>

      {/* Three-dot menu */}
      <div ref={menuRef} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="rounded-lg p-1.5 text-kula-300 transition-colors hover:bg-[var(--surface-raised)] hover:text-kula-600 dark:text-kula-700 dark:hover:text-kula-300"
          aria-label="Options"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
            <circle cx="10" cy="4.5" r="1.25" />
            <circle cx="10" cy="10" r="1.25" />
            <circle cx="10" cy="15.5" r="1.25" />
          </svg>
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-8 z-10 min-w-36 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xl">
            {sefer.status !== 'inactive' && (
              <button
                type="button"
                onClick={() => {
                  updateStatus.mutate({ id: sefer.id, status: 'inactive' })
                  setMenuOpen(false)
                }}
                className="block w-full px-3.5 py-2.5 text-left text-sm text-kula-700 transition-colors hover:bg-[var(--surface-raised)] dark:text-kula-300"
              >
                Mark inactive
              </button>
            )}
            {sefer.status !== 'completed' && (
              <button
                type="button"
                onClick={() => {
                  updateStatus.mutate({ id: sefer.id, status: 'completed' })
                  setMenuOpen(false)
                }}
                className="block w-full px-3.5 py-2.5 text-left text-sm text-kula-700 transition-colors hover:bg-[var(--surface-raised)] dark:text-kula-300"
              >
                Mark completed
              </button>
            )}
            {sefer.status !== 'active' && (
              <button
                type="button"
                onClick={() => {
                  updateStatus.mutate({ id: sefer.id, status: 'active' })
                  setMenuOpen(false)
                }}
                className="block w-full px-3.5 py-2.5 text-left text-sm text-kula-700 transition-colors hover:bg-[var(--surface-raised)] dark:text-kula-300"
              >
                Mark active
              </button>
            )}
            <div className="border-t border-[var(--border)]" />
            <button
              type="button"
              onClick={() => {
                removeSefer.mutate(sefer.id)
                setMenuOpen(false)
              }}
              className="block w-full px-3.5 py-2.5 text-left text-sm text-red-400 transition-colors hover:bg-[var(--surface-raised)]"
            >
              Remove
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CURRENTLY LEARNING SECTION
// ═══════════════════════════════════════════════════════════════════════════════

function CurrentlyLearningSection() {
  const { data: userSefarim, isLoading } = useUserSefarim()
  const { data: completions = [] } = useCompletions()
  const [pickerOpen, setPickerOpen] = useState(false)

  const activeSefarim = useMemo(
    () => (userSefarim ?? []).filter((s) => s.status === 'active'),
    [userSefarim],
  )

  const existingIds = useMemo(
    () => new Set((userSefarim ?? []).map((s) => s.sefer_id)),
    [userSefarim],
  )

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl tracking-tight text-kula-900 dark:text-kula-50 md:text-3xl">
            Currently Learning
          </h2>
          <p className="mt-0.5 text-sm text-kula-500 dark:text-kula-400">
            Sefarim you are actively working through.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-kula-700 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-kula-800 dark:bg-kula-400 dark:text-kula-950 dark:hover:bg-kula-300"
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M8 2v12M2 8h12" />
          </svg>
          Add sefer
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-3 text-sm text-kula-500">
          <Spinner size="sm" /> Loading…
        </div>
      ) : activeSefarim.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] px-6 py-10 text-center">
          <p className="text-sm text-kula-500 dark:text-kula-400">
            No sefarim marked as currently learning.
          </p>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="mt-3 text-sm font-medium text-kula-600 underline-offset-2 hover:underline dark:text-kula-400"
          >
            Add one to see it here →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {activeSefarim.map((sefer) => (
            <SeferRow key={sefer.id} sefer={sefer} completions={completions} />
          ))}
        </div>
      )}

      {pickerOpen && (
        <SeferPicker onClose={() => setPickerOpen(false)} existingIds={existingIds} />
      )}
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// RECENT NOTES SECTION
// ═══════════════════════════════════════════════════════════════════════════════

function RecentNotesSection() {
  const { data: allNotes, isLoading } = useNotes()

  const recentNotes = useMemo(
    () => (allNotes ?? []).slice(0, 5),
    [allNotes],
  )

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-serif text-xl tracking-tight text-kula-900 dark:text-kula-100">
          Recent Notes
        </h3>
        {(allNotes?.length ?? 0) > 5 && (
          <Link
            to="/notebook"
            className="text-xs font-medium text-kula-500 hover:text-kula-700 dark:text-kula-500 dark:hover:text-kula-300"
          >
            View all →
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-3 text-sm text-kula-500">
          <Spinner size="sm" /> Loading…
        </div>
      ) : recentNotes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] px-6 py-8 text-center">
          <p className="text-sm text-kula-400 dark:text-kula-600">
            No notes yet. Write your first note from any section in{' '}
            <Link to="/browse" className="font-medium text-kula-600 underline-offset-2 hover:underline dark:text-kula-400">
              Browse
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {recentNotes.map((note) => (
            <Link
              key={note.id}
              to={`/read/${encodeURIComponent(note.sefaria_ref)}?notes=open`}
              className="flex items-start justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3.5 transition-colors hover:border-kula-300/60 hover:bg-[var(--surface-overlay)] dark:hover:border-kula-700/60"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-kula-600 dark:text-kula-400">
                  {note.sefaria_ref}
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-kula-800 dark:text-kula-200">
                  {note.body.slice(0, 120)}{note.body.length > 120 ? '…' : ''}
                </p>
              </div>
              <time className="shrink-0 text-xs text-kula-400 dark:text-kula-600">
                {formatNoteDate(note.created_at)}
              </time>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIME TRACKING SECTION (collapsible)
// ═══════════════════════════════════════════════════════════════════════════════

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-kula-400 dark:text-kula-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold tabular-nums text-kula-800 dark:text-kula-100">
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-kula-400 dark:text-kula-600">{sub}</p>}
    </div>
  )
}

function SessionRow({ session }: { session: LearningSession }) {
  const deleteSession = useDeleteSession()
  const [expanded, setExpanded] = useState(false)

  const duration = session.duration_seconds ? formatDuration(session.duration_seconds) : null
  const time = new Date(session.started_at).toLocaleTimeString(undefined, {
    hour: 'numeric', minute: '2-digit',
  })

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-kula-800 dark:text-kula-200">
              {session.sefer_label ?? 'General learning'}
            </span>
            {duration && (
              <span className="rounded-full bg-kula-500/10 px-2 py-0.5 text-xs font-medium text-kula-500 dark:bg-kula-400/10 dark:text-kula-400">
                {duration}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-kula-400 dark:text-kula-600">{time}</p>
          {session.notes && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-1.5 text-left text-xs text-kula-500 hover:text-kula-700 dark:hover:text-kula-300"
            >
              {expanded ? (
                <span className="whitespace-pre-wrap text-kula-700 dark:text-kula-300">
                  {session.notes}
                </span>
              ) : (
                <span className="line-clamp-1 italic">{session.notes}</span>
              )}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => deleteSession.mutate(session.id)}
          disabled={deleteSession.isPending}
          aria-label="Delete session"
          className="shrink-0 rounded-lg p-1.5 text-kula-300 transition-colors hover:bg-[var(--surface-overlay)] hover:text-red-400 disabled:opacity-40 dark:text-kula-700"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 5l10 10M15 5L5 15" />
          </svg>
        </button>
      </div>
    </div>
  )
}

function TimeTrackingSection() {
  const { data: sessions, isLoading } = useSessions()
  const { activeSession, elapsedSeconds } = useTimer()
  const hasExpandedRef = useRef(false)

  const hasSessions = (sessions ?? []).some((s) => s.ended_at)
  const [open, setOpen] = useState(false)

  // Auto-expand once data loads if there are past sessions
  useEffect(() => {
    if (!hasExpandedRef.current && sessions && hasSessions) {
      setOpen(true)
      hasExpandedRef.current = true
    }
  }, [sessions, hasSessions])

  const stats = useMemo(() => calcTimeStats(sessions ?? []), [sessions])
  const groups = useMemo(() => groupSessionsByDate(sessions ?? []), [sessions])

  return (
    <section>
      {/* Collapsible header — visually muted to signal secondary importance */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3 text-left transition-colors hover:bg-[var(--surface-overlay)]"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-kula-600 dark:text-kula-400">
            Time Tracking
          </span>
          {activeSession && (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-kula-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-kula-500 dark:bg-kula-400" />
            </span>
          )}
          {activeSession && (
            <span className="font-mono text-xs tabular-nums text-kula-500 dark:text-kula-400">
              {formatDuration(elapsedSeconds)} running
            </span>
          )}
        </div>
        <svg
          viewBox="0 0 16 16"
          className={`h-4 w-4 text-kula-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 6l5 5 5-5" />
        </svg>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          {/* Clock in/out widget */}
          <LearningTimer />

          {/* Stat tiles */}
          <div className="grid grid-cols-3 gap-3">
            <StatTile
              label="Today"
              value={formatDuration(stats.todaySeconds + (activeSession ? elapsedSeconds : 0))}
            />
            <StatTile
              label="This Week"
              value={formatDuration(stats.weekSeconds + (activeSession ? elapsedSeconds : 0))}
            />
            <StatTile
              label="All Time"
              value={formatDuration(stats.totalSeconds + (activeSession ? elapsedSeconds : 0))}
              sub={`${stats.totalSessions} session${stats.totalSessions === 1 ? '' : 's'}`}
            />
          </div>

          {/* Session log */}
          {isLoading ? (
            <div className="flex items-center gap-3 text-sm text-kula-500">
              <Spinner size="sm" /> Loading sessions…
            </div>
          ) : groups.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border)] px-6 py-8 text-center">
              <p className="text-sm text-kula-400 dark:text-kula-600">
                No sessions yet. Clock in above to start tracking.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {groups.map((group) => (
                <div key={group.dateLabel}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-kula-400 dark:text-kula-600">
                    {group.dateLabel}
                  </p>
                  <div className="space-y-2">
                    {group.sessions.map((s) => (
                      <SessionRow key={s.id} session={s} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function Dashboard() {
  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <CurrentlyLearningSection />
      <RecentNotesSection />
      <TimeTrackingSection />
    </div>
  )
}
