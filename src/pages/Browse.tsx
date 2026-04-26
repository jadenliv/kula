import { useState, useMemo } from 'react'
import { catalog, type CatalogNode } from '../data/catalog'
import { CatalogNodeRow } from '../components/texts/CatalogTree'
import { useCompletedRefSet } from '../hooks/useCompletions'
import { CustomSeferSection } from '../components/texts/CustomSeferSection'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function collectRefs(node: CatalogNode): string[] {
  if (node.ref) return [node.ref]
  return (node.children ?? []).flatMap(collectRefs)
}

// Pre-compute all refs per top-level category once (catalog is static JSON).
const TOP_LEVEL = catalog.children
const CATEGORY_REFS: string[][] = TOP_LEVEL.map(collectRefs)

// ---------------------------------------------------------------------------
// Category card
// ---------------------------------------------------------------------------

function CategoryCard({
  node,
  allRefs,
  isSelected,
  onClick,
}: {
  node: CatalogNode
  allRefs: string[]
  isSelected: boolean
  onClick: () => void
}) {
  const completedRefs = useCompletedRefSet()

  const { completed, total, percent } = useMemo(() => {
    const total = allRefs.length
    const completed = allRefs.filter((r) => completedRefs.has(r)).length
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0
    return { completed, total, percent }
  }, [allRefs, completedRefs])

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors ${
        isSelected
          ? 'border-kula-400/60 bg-kula-400/5 dark:border-kula-400/50 dark:bg-kula-400/5'
          : 'border-[var(--border)] bg-[var(--surface)] hover:border-kula-300 hover:bg-[var(--surface-raised)] dark:hover:border-kula-600'
      }`}
    >
      {/* Names */}
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold leading-snug ${
          isSelected
            ? 'text-kula-700 dark:text-kula-200'
            : 'text-kula-800 dark:text-kula-100 group-hover:text-kula-900 dark:group-hover:text-kula-50'
        }`}>
          {node.english}
        </p>
        {node.hebrew && (
          <p
            className="mt-0.5 text-xs text-kula-400 dark:text-kula-600"
            dir="rtl"
          >
            {node.hebrew}
          </p>
        )}
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="space-y-1">
          <div className="h-1 w-full overflow-hidden rounded-full bg-kula-200/60 dark:bg-kula-800/60">
            <div
              className={`h-full rounded-full transition-all ${
                isSelected ? 'bg-kula-500' : 'bg-kula-400/70 dark:bg-kula-500/60'
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-right text-[10px] tabular-nums text-kula-400 dark:text-kula-600">
            {completed}/{total} · {percent}%
          </p>
        </div>
      )}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Browse() {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const selectedNode = selectedIndex !== null ? TOP_LEVEL[selectedIndex] : null

  function handleCardClick(i: number) {
    setSelectedIndex((prev) => (prev === i ? null : i))
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 md:space-y-8">

      {/* Header */}
      <div>
        <h2 className="font-serif text-2xl tracking-tight text-kula-900 dark:text-kula-50 md:text-3xl">
          Browse
        </h2>
        <p className="mt-1 text-sm text-kula-500 dark:text-kula-400">
          Select a category to explore its texts. Check off sections as you learn them.
        </p>
      </div>

      {/* Category cards grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {TOP_LEVEL.map((node, i) => (
          <CategoryCard
            key={node.english ?? i}
            node={node}
            allRefs={CATEGORY_REFS[i]}
            isSelected={selectedIndex === i}
            onClick={() => handleCardClick(i)}
          />
        ))}
      </div>

      {/* Expanded category tree */}
      {selectedNode && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 md:p-4">
          {/* Section heading */}
          <div className="mb-3 flex items-baseline gap-2">
            <h3 className="font-serif text-lg font-medium tracking-tight text-kula-900 dark:text-kula-100">
              {selectedNode.english}
            </h3>
            {selectedNode.hebrew && (
              <span className="text-sm text-kula-400 dark:text-kula-600" dir="rtl">
                {selectedNode.hebrew}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-0.5">
            {(selectedNode.children ?? []).map((child, i) => (
              <CatalogNodeRow
                key={child.ref ?? child.english ?? i}
                node={child}
                depth={0}
              />
            ))}
          </div>
        </div>
      )}

      {/* Custom sefarim */}
      <CustomSeferSection />
    </div>
  )
}
