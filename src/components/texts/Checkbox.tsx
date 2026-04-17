import type { MouseEvent } from 'react'

export type CheckState = 'none' | 'some' | 'all'

type Props = {
  state: CheckState
  label: string
  onToggle: () => void
  disabled?: boolean
}

/**
 * Three-state checkbox. Leaves only use `none` and `all`; parent rows also
 * use `some` for the indeterminate state when some descendants are checked.
 */
export function Checkbox({ state, label, onToggle, disabled = false }: Props) {
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    e.preventDefault()
    if (!disabled) onToggle()
  }

  const classes =
    state === 'all'
      ? 'border-kula-500 bg-kula-500 text-white dark:border-kula-400 dark:bg-kula-400'
      : state === 'some'
        ? 'border-kula-400 bg-kula-400/20 text-kula-500 dark:text-kula-400'
        : 'border-kula-300 bg-transparent text-transparent hover:border-kula-400 dark:border-kula-700 dark:hover:border-kula-500'

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-label={label}
      aria-checked={state === 'all' ? 'true' : state === 'some' ? 'mixed' : 'false'}
      role="checkbox"
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${classes} ${
        disabled ? 'cursor-not-allowed opacity-40' : ''
      }`}
    >
      {state === 'some' ? (
        <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <path d="M3 8H13" />
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 8.5L6.5 12L13 4.5" />
        </svg>
      )}
    </button>
  )
}
