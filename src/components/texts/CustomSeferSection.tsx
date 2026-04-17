import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useCustomSefarim,
  useCustomSections,
  useDeleteCustomSefer,
  useDeleteCustomSection,
} from '../../hooks/useCustomSefarim'
import {
  useCompletedRefSet,
  useToggleCompletion,
  useToggleRefsBulk,
} from '../../hooks/useCompletions'
import {
  allFlatRefs,
  flatRef,
  nestedRef,
  type UserCustomSefer,
  type UserCustomSection,
} from '../../services/customSefarim'
import { Checkbox } from './Checkbox'
import { MarkRangeModal } from './MarkRangeModal'
import { AddCustomSeferModal } from './AddCustomSeferModal'
import type { CatalogNode } from '../../data/catalog'

// Build a mock CatalogNode tree from a flat sefer so MarkRangeModal can use it
function flatSeferToCatalogNode(sefer: UserCustomSefer): CatalogNode {
  const count = sefer.chapter_count ?? 0
  return {
    english: sefer.title_en,
    hebrew: sefer.title_he ?? undefined,
    children: Array.from({ length: count }, (_, i) => ({
      english: `${sefer.section_label} ${i + 1}`,
      ref: flatRef(sefer.id, i + 1),
    })),
  }
}

function nestedSeferToCatalogNode(
  sefer: UserCustomSefer,
  sections: UserCustomSection[],
): CatalogNode {
  // One level deep for MVP
  return {
    english: sefer.title_en,
    hebrew: sefer.title_he ?? undefined,
    children: sections.map((s) => ({
      english: s.title,
      ref: nestedRef(sefer.id, s.id),
    })),
  }
}

// ── Flat sefer row ────────────────────────────────────────────────────────────

function FlatSeferRow({
  sefer,
  onEdit,
  onDelete,
}: {
  sefer: UserCustomSefer
  onEdit: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const [rangeModalOpen, setRangeModalOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const completedRefs = useCompletedRefSet()
  const toggleBulk = useToggleRefsBulk()
  const toggle = useToggleCompletion()
  const navigate = useNavigate()

  const count = sefer.chapter_count ?? 0
  const allRefs = useMemo(() => allFlatRefs(sefer.id, count), [sefer.id, count])
  const completed = allRefs.filter((r) => completedRefs.has(r)).length
  const percent = count > 0 ? Math.round((completed / count) * 100) : null

  const checkState = completed === 0 ? 'none' : completed >= count ? 'all' : 'some'

  const handleBulk = () => {
    if (count === 0) return
    toggleBulk.mutate({ refs: allRefs, action: checkState === 'all' ? 'remove' : 'add' })
  }

  const catalogNode = useMemo(() => flatSeferToCatalogNode(sefer), [sefer])

  return (
    <div>
      <div className="group flex items-center gap-2 rounded px-2 hover:bg-kula-50 dark:hover:bg-kula-900/50">
        <Checkbox state={checkState} onToggle={handleBulk} label={`Mark all of ${sefer.title_en}`} disabled={count === 0} />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-center gap-2 py-2 text-left text-sm md:py-1.5"
        >
          <span className="w-3 shrink-0 text-kula-400 dark:text-kula-600">{open ? '▾' : '▸'}</span>
          <span className="flex-1 font-medium text-kula-900 dark:text-kula-50">
            {sefer.title_en}
            {sefer.title_he && (
              <span className="ml-2 font-['Heebo'] text-xs font-normal text-kula-500" dir="rtl">
                {sefer.title_he}
              </span>
            )}
          </span>
          {percent !== null && (
            <span className="shrink-0 text-xs tabular-nums text-kula-400 dark:text-kula-600">
              {completed}/{count} · {percent}%
            </span>
          )}
        </button>

        {/* Range button */}
        {count > 0 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setRangeModalOpen(true) }}
            className="hidden shrink-0 rounded-lg px-2 py-1 text-xs text-kula-400 transition-colors hover:bg-kula-100 hover:text-kula-700 group-hover:block dark:text-kula-600 dark:hover:bg-kula-800/40 dark:hover:text-kula-300"
          >
            Range…
          </button>
        )}

        {/* Three-dot menu */}
        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v) }}
            className="rounded-lg p-1.5 text-kula-300 hover:bg-[var(--surface-raised)] hover:text-kula-600 dark:text-kula-700 dark:hover:text-kula-300"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
              <circle cx="10" cy="4.5" r="1.25" /><circle cx="10" cy="10" r="1.25" /><circle cx="10" cy="15.5" r="1.25" />
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 z-10 min-w-32 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xl">
              <button type="button" onClick={() => { setMenuOpen(false); onEdit() }} className="block w-full px-3.5 py-2.5 text-left text-sm text-kula-700 hover:bg-[var(--surface-raised)] dark:text-kula-300">Edit</button>
              <div className="border-t border-[var(--border)]" />
              <button type="button" onClick={() => { setMenuOpen(false); onDelete() }} className="block w-full px-3.5 py-2.5 text-left text-sm text-red-400 hover:bg-[var(--surface-raised)]">Delete</button>
            </div>
          )}
        </div>
      </div>

      {open && (
        <div className="flex flex-col pl-4">
          {Array.from({ length: count }, (_, i) => {
            const ref = flatRef(sefer.id, i + 1)
            const isChecked = completedRefs.has(ref)
            const sefUrl = sefer.sefaria_ref
              ? `https://www.sefaria.org/${encodeURIComponent(sefer.sefaria_ref)}.${i + 1}?lang=bi`
              : null
            return (
              <div key={ref} className="group flex items-center gap-2 rounded text-sm hover:bg-kula-50 dark:hover:bg-kula-900/50" style={{ paddingLeft: '0.5rem' }}>
                <Checkbox
                  state={isChecked ? 'all' : 'none'}
                  onToggle={() => toggle.mutate({ ref, currentlyChecked: isChecked })}
                  label={isChecked ? `Unmark ${sefer.section_label} ${i + 1}` : `Mark ${sefer.section_label} ${i + 1} complete`}
                />
                <button
                  type="button"
                  onClick={() => navigate(`/read/${encodeURIComponent(ref)}`)}
                  className={`flex-1 rounded px-1 py-2 text-left md:py-1 ${isChecked ? 'text-kula-400 line-through dark:text-kula-600' : 'text-kula-600 hover:text-kula-900 dark:text-kula-400 dark:hover:text-kula-100'}`}
                >
                  {sefer.section_label} {i + 1}
                </button>
                {sefUrl && (
                  <a href={sefUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="hidden shrink-0 rounded px-1.5 py-0.5 text-xs text-kula-400 hover:bg-kula-100 hover:text-kula-600 group-hover:block dark:text-kula-600 dark:hover:bg-kula-800/40 dark:hover:text-kula-300" title="Open in Sefaria">↗</a>
                )}
              </div>
            )
          })}
        </div>
      )}

      {rangeModalOpen && (
        <MarkRangeModal groupNode={catalogNode} onClose={() => setRangeModalOpen(false)} />
      )}
    </div>
  )
}

// ── Nested sefer row ──────────────────────────────────────────────────────────

function NestedSeferRow({
  sefer,
  onEdit,
  onDelete,
}: {
  sefer: UserCustomSefer
  onEdit: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const [rangeModalOpen, setRangeModalOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { data: sections = [] } = useCustomSections(sefer.id)
  const deleteSection = useDeleteCustomSection(sefer.id)
  const completedRefs = useCompletedRefSet()
  const toggleBulk = useToggleRefsBulk()
  const toggle = useToggleCompletion()
  const navigate = useNavigate()

  const allRefs = useMemo(
    () => sections.map((s) => nestedRef(sefer.id, s.id)),
    [sections, sefer.id],
  )
  const completed = allRefs.filter((r) => completedRefs.has(r)).length
  const total = allRefs.length
  const percent = total > 0 ? Math.round((completed / total) * 100) : null
  const checkState = completed === 0 ? 'none' : completed >= total ? 'all' : 'some'

  const catalogNode = useMemo(() => nestedSeferToCatalogNode(sefer, sections), [sefer, sections])

  return (
    <div>
      <div className="group flex items-center gap-2 rounded px-2 hover:bg-kula-50 dark:hover:bg-kula-900/50">
        <Checkbox state={checkState} onToggle={() => toggleBulk.mutate({ refs: allRefs, action: checkState === 'all' ? 'remove' : 'add' })} label={`Mark all of ${sefer.title_en}`} disabled={total === 0} />
        <button type="button" onClick={() => setOpen((v) => !v)} className="flex flex-1 items-center gap-2 py-2 text-left text-sm md:py-1.5">
          <span className="w-3 shrink-0 text-kula-400 dark:text-kula-600">{open ? '▾' : '▸'}</span>
          <span className="flex-1 font-medium text-kula-900 dark:text-kula-50">
            {sefer.title_en}
            {sefer.title_he && (
              <span className="ml-2 font-['Heebo'] text-xs font-normal text-kula-500" dir="rtl">{sefer.title_he}</span>
            )}
          </span>
          {percent !== null && (
            <span className="shrink-0 text-xs tabular-nums text-kula-400 dark:text-kula-600">{completed}/{total} · {percent}%</span>
          )}
        </button>
        {total > 0 && (
          <button type="button" onClick={(e) => { e.stopPropagation(); setRangeModalOpen(true) }} className="hidden shrink-0 rounded-lg px-2 py-1 text-xs text-kula-400 transition-colors hover:bg-kula-100 hover:text-kula-700 group-hover:block dark:text-kula-600 dark:hover:bg-kula-800/40 dark:hover:text-kula-300">
            Range…
          </button>
        )}
        <div ref={menuRef} className="relative shrink-0">
          <button type="button" onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v) }} className="rounded-lg p-1.5 text-kula-300 hover:bg-[var(--surface-raised)] hover:text-kula-600 dark:text-kula-700 dark:hover:text-kula-300">
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor"><circle cx="10" cy="4.5" r="1.25" /><circle cx="10" cy="10" r="1.25" /><circle cx="10" cy="15.5" r="1.25" /></svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 z-10 min-w-32 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xl">
              <button type="button" onClick={() => { setMenuOpen(false); onEdit() }} className="block w-full px-3.5 py-2.5 text-left text-sm text-kula-700 hover:bg-[var(--surface-raised)] dark:text-kula-300">Edit</button>
              <div className="border-t border-[var(--border)]" />
              <button type="button" onClick={() => { setMenuOpen(false); onDelete() }} className="block w-full px-3.5 py-2.5 text-left text-sm text-red-400 hover:bg-[var(--surface-raised)]">Delete</button>
            </div>
          )}
        </div>
      </div>

      {open && sections.length > 0 && (
        <div className="flex flex-col pl-4">
          {sections.map((s) => {
            const ref = nestedRef(sefer.id, s.id)
            const isChecked = completedRefs.has(ref)
            return (
              <div key={ref} className="group flex items-center gap-2 rounded text-sm hover:bg-kula-50 dark:hover:bg-kula-900/50" style={{ paddingLeft: '0.5rem' }}>
                <Checkbox state={isChecked ? 'all' : 'none'} onToggle={() => toggle.mutate({ ref, currentlyChecked: isChecked })} label={s.title} />
                <button type="button" onClick={() => navigate(`/read/${encodeURIComponent(ref)}`)} className={`flex-1 rounded px-1 py-2 text-left md:py-1 ${isChecked ? 'text-kula-400 line-through dark:text-kula-600' : 'text-kula-600 hover:text-kula-900 dark:text-kula-400 dark:hover:text-kula-100'}`}>
                  {s.title}
                </button>
                <button type="button" onClick={() => { if (confirm(`Remove "${s.title}"?`)) deleteSection.mutate(s.id) }} className="hidden rounded p-1 text-kula-300 hover:text-red-400 group-hover:block dark:text-kula-700">
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4l8 8M12 4L4 12" /></svg>
                </button>
              </div>
            )
          })}
        </div>
      )}

      {rangeModalOpen && (
        <MarkRangeModal groupNode={catalogNode} onClose={() => setRangeModalOpen(false)} />
      )}
    </div>
  )
}

// ── Top-level "My Sefarim" section ────────────────────────────────────────────

export function CustomSeferSection() {
  const { data: sefarim = [], isLoading } = useCustomSefarim()
  const deleteSefer = useDeleteCustomSefer()
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editingSefer, setEditingSefer] = useState<UserCustomSefer | null>(null)

  const handleDelete = (sefer: UserCustomSefer) => {
    // eslint-disable-next-line no-alert
    if (confirm(`Delete "${sefer.title_en}"? This will remove all progress on it.`)) {
      deleteSefer.mutate(sefer.id)
    }
  }

  return (
    <div>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 md:p-4">
        {/* Section header */}
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-kula-400 dark:text-kula-600">
            My Sefarim
          </h3>
        </div>

        {isLoading ? (
          <p className="py-3 text-sm text-kula-400 dark:text-kula-600">Loading…</p>
        ) : sefarim.length === 0 ? (
          <p className="py-2 text-sm text-kula-400 dark:text-kula-600">
            No custom sefarim yet.
          </p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {sefarim.map((sefer) =>
              sefer.structure_type === 'flat' ? (
                <FlatSeferRow
                  key={sefer.id}
                  sefer={sefer}
                  onEdit={() => setEditingSefer(sefer)}
                  onDelete={() => handleDelete(sefer)}
                />
              ) : (
                <NestedSeferRow
                  key={sefer.id}
                  sefer={sefer}
                  onEdit={() => setEditingSefer(sefer)}
                  onDelete={() => handleDelete(sefer)}
                />
              ),
            )}
          </div>
        )}

        {/* Add sefer button */}
        <button
          type="button"
          onClick={() => setAddModalOpen(true)}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-kula-300/60 py-2.5 text-sm text-kula-500 transition-colors hover:border-kula-400 hover:text-kula-700 dark:border-kula-700/60 dark:text-kula-500 dark:hover:border-kula-600 dark:hover:text-kula-300"
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 2v12M2 8h12" /></svg>
          Add a sefer
        </button>
      </div>

      {addModalOpen && (
        <AddCustomSeferModal onClose={() => setAddModalOpen(false)} />
      )}
      {editingSefer && (
        <AddCustomSeferModal editing={editingSefer} onClose={() => setEditingSefer(null)} />
      )}
    </div>
  )
}
