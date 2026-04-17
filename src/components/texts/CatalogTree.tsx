import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { catalog, sefariaUrl, type CatalogNode } from '../../data/catalog'
import {
  useCompletedRefSet,
  useToggleCompletion,
  useToggleRefsBulk,
} from '../../hooks/useCompletions'
import { Checkbox, type CheckState } from './Checkbox'

/**
 * Browse tree built entirely from the pre-compiled catalog.json.
 * No Sefaria API calls at runtime — all structure and counts are baked in.
 */
export function CatalogTree() {
  return (
    <div className="flex flex-col gap-0.5">
      {catalog.children.map((child, i) => (
        <CatalogNodeRow key={child.english ?? i} node={child} depth={0} />
      ))}
    </div>
  )
}

function CatalogNodeRow({ node, depth }: { node: CatalogNode; depth: number }) {
  if (node.ref) return <LeafRow node={node} depth={depth} />
  return <GroupRow node={node} depth={depth} />
}

function collectRefs(node: CatalogNode): string[] {
  if (node.ref) return [node.ref]
  return (node.children ?? []).flatMap(collectRefs)
}

function stateFromCounts(completed: number, total: number): CheckState {
  if (total === 0 || completed === 0) return 'none'
  if (completed >= total) return 'all'
  return 'some'
}

// ---------------------------------------------------------------------------
// GroupRow
// ---------------------------------------------------------------------------
function GroupRow({ node, depth }: { node: CatalogNode; depth: number }) {
  const [open, setOpen] = useState(false)
  const completedRefs = useCompletedRefSet()
  const toggleBulk = useToggleRefsBulk()

  const allRefs = useMemo(() => collectRefs(node), [node])
  const total = allRefs.length
  const completed = allRefs.filter((r) => completedRefs.has(r)).length
  const percent = total > 0 ? Math.round((completed / total) * 100) : null
  const state = stateFromCounts(completed, total)

  const handleToggle = () => {
    if (total === 0) return
    toggleBulk.mutate({ refs: allRefs, action: state === 'all' ? 'remove' : 'add' })
  }

  const labelClass =
    depth === 0
      ? 'font-semibold text-kula-900 dark:text-kula-50'
      : depth === 1
        ? 'font-medium text-kula-800 dark:text-kula-100'
        : 'text-kula-700 dark:text-kula-300'

  return (
    <div>
      <div
        className="flex items-center gap-2 rounded hover:bg-kula-50 dark:hover:bg-kula-900/50"
        style={{ paddingLeft: `${depth * 0.75 + 0.5}rem` }}
      >
        <Checkbox
          state={state}
          onToggle={handleToggle}
          label={`Mark all of ${node.english}`}
          disabled={total === 0}
        />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-center gap-2 py-1.5 text-left text-sm"
        >
          <span className="w-3 shrink-0 text-kula-400 dark:text-kula-600">
            {open ? '▾' : '▸'}
          </span>
          <span className={`flex-1 ${labelClass}`}>
            {node.english}
            {node.hebrew && (
              <span className="ml-2 text-xs font-normal text-kula-500" dir="rtl">
                {node.hebrew}
              </span>
            )}
          </span>
          {percent !== null && (
            <span className="shrink-0 text-xs tabular-nums text-kula-400 dark:text-kula-600">
              {completed}/{total} · {percent}%
            </span>
          )}
        </button>
      </div>
      {open && (
        <div className="flex flex-col">
          {(node.children ?? []).map((child, i) => (
            <CatalogNodeRow
              key={child.ref ?? child.english ?? i}
              node={child}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// LeafRow
// ---------------------------------------------------------------------------
function LeafRow({ node, depth }: { node: CatalogNode; depth: number }) {
  const ref = node.ref!
  const completedRefs = useCompletedRefSet()
  const toggle = useToggleCompletion()
  const navigate = useNavigate()
  const isChecked = completedRefs.has(ref)

  const handleToggle = () => {
    toggle.mutate({ ref, currentlyChecked: isChecked })
  }

  return (
    <div
      className="group flex items-center gap-2 rounded text-sm hover:bg-kula-50 dark:hover:bg-kula-900/50"
      style={{ paddingLeft: `${depth * 0.75 + 0.5}rem` }}
    >
      <Checkbox
        state={isChecked ? 'all' : 'none'}
        onToggle={handleToggle}
        label={isChecked ? `Unmark ${ref}` : `Mark ${ref} complete`}
      />
      <button
        type="button"
        onClick={() => navigate(`/read/${encodeURIComponent(ref)}`)}
        className={`flex-1 rounded px-1 py-1 text-left ${
          isChecked
            ? 'text-kula-400 line-through dark:text-kula-600'
            : 'text-kula-600 hover:text-kula-900 dark:text-kula-400 dark:hover:text-kula-100'
        }`}
      >
        {node.english}
      </button>
      <a
        href={sefariaUrl(ref)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="hidden shrink-0 rounded px-1.5 py-0.5 text-xs text-kula-400 hover:bg-kula-100 hover:text-kula-600 group-hover:block dark:text-kula-600 dark:hover:bg-kula-800/40 dark:hover:text-kula-300"
        title="Open in Sefaria"
      >
        ↗
      </a>
    </div>
  )
}
