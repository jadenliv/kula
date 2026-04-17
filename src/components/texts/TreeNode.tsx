import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  isCategory,
  type SefariaIndexCategory,
  type SefariaIndexEntry,
  type SefariaIndexSefer,
} from '../../types/sefaria'
import { useSefariaIndexDetails } from '../../hooks/useSefaria'
import { buildSectionRefs, type SectionRef } from './buildSectionRefs'
import {
  useCompletedRefSet,
  useToggleCompletion,
  useToggleRefsBulk,
} from '../../hooks/useCompletions'
import { getSeferPerekRefs } from '../../data/tanakhCounts'
import { Checkbox, type CheckState } from './Checkbox'
import { Spinner } from '../ui/Spinner'

type Props = {
  entry: SefariaIndexEntry
  depth: number
}

/**
 * Recursive tree node. Renders either a category (folder) or a sefer
 * (lazy-loads its index schema on first expand).
 *
 * Tanakh sefarim get instant percentages and a working parent checkbox
 * before expansion via the hardcoded counts in data/tanakhCounts.ts. Other
 * sefarim only show counts after the user expands them and the schema
 * resolves.
 *
 * (Earlier versions tried to eager-prefetch every sefer schema in the
 * library at app start; that fired hundreds of parallel requests and
 * pinned the main thread. We pulled it. The right long-term fix is a
 * precomputed counts JSON, not runtime fan-out.)
 */
export function TreeNode({ entry, depth }: Props) {
  if (isCategory(entry)) {
    return <CategoryNode category={entry} depth={depth} />
  }
  return <SeferNode sefer={entry} depth={depth} />
}

/**
 * Walk a category and collect every perek ref for any Tanakh sefer
 * underneath it. Non-Tanakh leaves are ignored — we don't have static
 * totals for them, so they don't contribute to the category percent.
 */
function collectTanakhRefs(entry: SefariaIndexEntry): string[] {
  if (isCategory(entry)) {
    return entry.contents.flatMap(collectTanakhRefs)
  }
  return getSeferPerekRefs(entry.title) ?? []
}

/** Three-state from counts: 0 → none, full → all, middle → some. */
function stateFromCounts(completed: number, total: number): CheckState {
  if (total === 0 || completed === 0) return 'none'
  if (completed >= total) return 'all'
  return 'some'
}

function CategoryNode({
  category,
  depth,
}: {
  category: SefariaIndexCategory
  depth: number
}) {
  const [open, setOpen] = useState(false)
  const completedRefs = useCompletedRefSet()
  const toggleBulk = useToggleRefsBulk()

  const tanakhRefs = useMemo(() => collectTanakhRefs(category), [category])
  const total = tanakhRefs.length
  const completed = tanakhRefs.filter((r) => completedRefs.has(r)).length
  const percent = total > 0 ? Math.round((completed / total) * 100) : null
  const state = stateFromCounts(completed, total)

  const handleToggle = () => {
    if (total === 0) return
    toggleBulk.mutate({
      refs: tanakhRefs,
      action: state === 'all' ? 'remove' : 'add',
    })
  }

  return (
    <div>
      <div
        className="flex items-center gap-2 rounded hover:bg-neutral-900"
        style={{ paddingLeft: `${depth * 0.75 + 0.5}rem` }}
      >
        {total > 0 ? (
          <Checkbox
            state={state}
            onToggle={handleToggle}
            label={`Mark ${category.category}`}
          />
        ) : (
          <span className="h-5 w-5 shrink-0" />
        )}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-center gap-2 py-1.5 text-left text-sm"
        >
          <span className="w-3 text-neutral-500">{open ? '▾' : '▸'}</span>
          <span className="flex-1 font-medium text-neutral-200">
            {category.category}
          </span>
          {percent !== null && (
            <span className="text-xs tabular-nums text-neutral-500">
              {completed}/{total} · {percent}%
            </span>
          )}
        </button>
      </div>
      {open && (
        <div className="flex flex-col">
          {category.contents.map((child, i) => (
            <TreeNode
              key={getEntryKey(child, i)}
              entry={child}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SeferNode({
  sefer,
  depth,
}: {
  sefer: SefariaIndexSefer
  depth: number
}) {
  const [open, setOpen] = useState(false)
  const { data, isLoading, error } = useSefariaIndexDetails(
    open ? sefer.title : null,
  )
  const completedRefs = useCompletedRefSet()
  const toggleBulk = useToggleRefsBulk()

  // Tanakh sefarim have hardcoded refs so the checkbox + % are live before
  // expansion. Other sefarim wait for the index schema to load.
  const staticTanakhRefs = useMemo(
    () => getSeferPerekRefs(sefer.title),
    [sefer.title],
  )

  const sectionRefs: SectionRef[] | null = data ? buildSectionRefs(data) : null

  // Prefer the dynamic list once we have it — a few Tanakh sefarim have
  // special schemas (e.g. masora notes) and the live list is more accurate.
  const parentRefs: string[] | null = sectionRefs
    ? sectionRefs.map((r) => r.ref)
    : staticTanakhRefs

  const total = parentRefs?.length ?? 0
  const completed = parentRefs
    ? parentRefs.filter((r) => completedRefs.has(r)).length
    : 0
  const percent = total > 0 ? Math.round((completed / total) * 100) : null
  const state = stateFromCounts(completed, total)

  const handleToggle = () => {
    if (!parentRefs || parentRefs.length === 0) return
    toggleBulk.mutate({
      refs: parentRefs,
      action: state === 'all' ? 'remove' : 'add',
    })
  }

  return (
    <div>
      <div
        className="flex items-center gap-2 rounded hover:bg-neutral-900"
        style={{ paddingLeft: `${depth * 0.75 + 0.5}rem` }}
      >
        {parentRefs && parentRefs.length > 0 ? (
          <Checkbox
            state={state}
            onToggle={handleToggle}
            label={`Mark ${sefer.title}`}
          />
        ) : (
          <span className="h-5 w-5 shrink-0" />
        )}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-center gap-2 py-1.5 text-left text-sm"
        >
          <span className="w-3 text-neutral-500">{open ? '▾' : '▸'}</span>
          <span className="flex-1 text-neutral-300">{sefer.title}</span>
          {percent !== null && (
            <span className="text-xs tabular-nums text-neutral-500">
              {completed}/{total} · {percent}%
            </span>
          )}
        </button>
      </div>
      {open && (
        <div className="flex flex-col">
          {isLoading && (
            <div
              className="py-2"
              style={{ paddingLeft: `${(depth + 1) * 0.75 + 0.5}rem` }}
            >
              <Spinner size="sm" />
            </div>
          )}
          {error && (
            <p
              className="py-1 text-xs text-red-400"
              style={{ paddingLeft: `${(depth + 1) * 0.75 + 0.5}rem` }}
            >
              Failed to load {sefer.title}
            </p>
          )}
          {sectionRefs && (
            <SectionList
              refs={sectionRefs}
              fallbackRef={sefer.title}
              depth={depth + 1}
            />
          )}
        </div>
      )}
    </div>
  )
}

function SectionList({
  refs,
  fallbackRef,
  depth,
}: {
  refs: SectionRef[]
  fallbackRef: string
  depth: number
}) {
  if (refs.length === 0) {
    return (
      <Link
        to={`/read/${encodeURIComponent(fallbackRef)}`}
        className="rounded px-2 py-1 text-xs text-amber-400 hover:bg-neutral-900 hover:underline"
        style={{ paddingLeft: `${depth * 0.75 + 0.5}rem` }}
      >
        Open
      </Link>
    )
  }
  return (
    <div className="flex flex-col">
      {refs.map((section) => (
        <SectionRow key={section.ref} section={section} depth={depth} />
      ))}
    </div>
  )
}

function SectionRow({
  section,
  depth,
}: {
  section: SectionRef
  depth: number
}) {
  const completedRefs = useCompletedRefSet()
  const toggle = useToggleCompletion()
  const isChecked = completedRefs.has(section.ref)

  const handleToggle = () => {
    toggle.mutate({ ref: section.ref, currentlyChecked: isChecked })
  }

  return (
    <div
      className="group flex items-center gap-2 rounded text-sm hover:bg-neutral-900"
      style={{ paddingLeft: `${depth * 0.75 + 0.5}rem` }}
    >
      <Checkbox
        state={isChecked ? 'all' : 'none'}
        onToggle={handleToggle}
        label={
          isChecked ? `Unmark ${section.ref}` : `Mark ${section.ref} complete`
        }
      />
      <Link
        to={`/read/${encodeURIComponent(section.ref)}`}
        className={`flex-1 rounded px-1 py-1 ${
          isChecked
            ? 'text-neutral-500 line-through'
            : 'text-neutral-400 hover:text-neutral-100'
        }`}
      >
        {section.label}
      </Link>
    </div>
  )
}

function getEntryKey(entry: SefariaIndexEntry, fallbackIndex: number): string {
  if (isCategory(entry)) return `cat-${entry.category}`
  return `sefer-${entry.title ?? fallbackIndex}`
}
