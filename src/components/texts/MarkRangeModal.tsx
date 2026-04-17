import { useMemo, useState } from 'react'
import { useToast } from '../../context/ToastContext'
import type { CatalogNode } from '../../data/catalog'
import { useToggleRefsBulk } from '../../hooks/useCompletions'

type LeafItem = { english: string; ref: string }

function collectLeafItems(node: CatalogNode): LeafItem[] {
  if (node.ref) return [{ english: node.english, ref: node.ref }]
  return (node.children ?? []).flatMap(collectLeafItems)
}

/** Guess a plural section noun from the first leaf's label. */
function pluralLabel(leaves: LeafItem[], count: number): string {
  if (leaves.length === 0) return `${count} sections`
  const sample = leaves[0].english
  // Daf: "2a", "64b" etc.
  if (/^\d+[ab]$/.test(sample)) return `${count} dappi${count === 1 ? '' : 'm'}`
  // Pure number: perek / siman / chapter
  if (/^\d+$/.test(sample)) return `${count} ${count === 1 ? 'section' : 'sections'}`
  return `${count} ${count === 1 ? 'section' : 'sections'}`
}

export function MarkRangeModal({
  groupNode,
  onClose,
}: {
  groupNode: CatalogNode
  onClose: () => void
}) {
  const leaves = useMemo(() => collectLeafItems(groupNode), [groupNode])
  const [fromIdx, setFromIdx] = useState(0)
  const [toIdx, setToIdx] = useState(Math.max(0, leaves.length - 1))
  const toggleBulk = useToggleRefsBulk()
  const { showToast } = useToast()

  if (leaves.length === 0) return null

  const selectedCount = Math.max(0, toIdx - fromIdx + 1)

  const handleMark = (action: 'add' | 'remove') => {
    if (selectedCount === 0 || toggleBulk.isPending) return
    const refs = leaves.slice(fromIdx, toIdx + 1).map((l) => l.ref)
    toggleBulk.mutate(
      { refs, action },
      {
        onSuccess: () => {
          const verb = action === 'add' ? 'Marked' : 'Unmarked'
          showToast(`${verb} ${pluralLabel(leaves, selectedCount)} as ${action === 'add' ? 'learned' : 'unlearned'}.`)
          onClose()
        },
      },
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-sm overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <div>
            <p className="font-medium text-kula-900 dark:text-kula-50">Mark range</p>
            <p className="text-xs text-kula-500 dark:text-kula-400">{groupNode.english}</p>
          </div>
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

        <div className="space-y-4 p-4">
          {/* From / To dropdowns */}
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-kula-500 dark:text-kula-400">
                From
              </label>
              <select
                value={fromIdx}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  setFromIdx(v)
                  if (v > toIdx) setToIdx(v)
                }}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-kula-900 focus:outline-none focus:ring-2 focus:ring-kula-500 dark:text-kula-100"
              >
                {leaves.map((leaf, i) => (
                  <option key={leaf.ref} value={i}>
                    {leaf.english}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-kula-500 dark:text-kula-400">
                To
              </label>
              <select
                value={toIdx}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  setToIdx(v)
                  if (v < fromIdx) setFromIdx(v)
                }}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-kula-900 focus:outline-none focus:ring-2 focus:ring-kula-500 dark:text-kula-100"
              >
                {leaves.map((leaf, i) => (
                  <option key={leaf.ref} value={i}>
                    {leaf.english}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="text-center text-xs text-kula-500 dark:text-kula-400">
            {pluralLabel(leaves, selectedCount)} selected
          </p>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={selectedCount === 0 || toggleBulk.isPending}
              onClick={() => handleMark('add')}
              className="flex-1 rounded-xl bg-kula-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-kula-800 disabled:opacity-50 dark:bg-kula-400 dark:text-kula-950 dark:hover:bg-kula-300"
            >
              Mark learned
            </button>
            <button
              type="button"
              disabled={selectedCount === 0 || toggleBulk.isPending}
              onClick={() => handleMark('remove')}
              className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-2.5 text-sm font-medium text-kula-700 transition-colors hover:bg-[var(--surface-overlay)] disabled:opacity-50 dark:text-kula-300"
            >
              Unmark
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
