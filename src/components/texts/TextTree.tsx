import { useSefariaIndex } from '../../hooks/useSefaria'
import { Spinner } from '../ui/Spinner'
import { TreeNode } from './TreeNode'
import { isCategory } from '../../types/sefaria'

export function TextTree() {
  const { data, isLoading, error } = useSefariaIndex()

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 text-sm text-neutral-400">
        <Spinner size="sm" /> Loading Sefaria index…
      </div>
    )
  }

  if (error) {
    return (
      <p className="text-sm text-red-400">
        Failed to load Sefaria index:{' '}
        {error instanceof Error ? error.message : String(error)}
      </p>
    )
  }

  if (!data) return null

  return (
    <div className="flex flex-col gap-0.5">
      {data.map((entry, i) => (
        <TreeNode
          key={
            isCategory(entry)
              ? `cat-${entry.category}`
              : `sefer-${entry.title ?? i}`
          }
          entry={entry}
          depth={0}
        />
      ))}
    </div>
  )
}
