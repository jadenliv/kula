import type { InputHTMLAttributes } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
}

export function Input({ label, id, className = '', ...rest }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-kula-700 dark:text-kula-300">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-kula-900 placeholder:text-kula-400 transition-colors focus:border-kula-400 focus:outline-none focus:ring-1 focus:ring-kula-400 dark:text-kula-100 dark:placeholder:text-kula-600 ${className}`}
        {...rest}
      />
    </div>
  )
}
