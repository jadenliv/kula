import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  children: ReactNode
}

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-kula-700 text-white hover:bg-kula-800 dark:bg-kula-400 dark:text-kula-950 dark:hover:bg-kula-300 disabled:opacity-40',
  secondary:
    'bg-[var(--surface-raised)] text-kula-800 border border-[var(--border)] hover:bg-[var(--surface-overlay)] dark:text-kula-200 disabled:opacity-40',
  ghost:
    'bg-transparent text-kula-600 hover:bg-kula-100 dark:text-kula-400 dark:hover:bg-kula-900/60 disabled:opacity-40',
}

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...rest
}: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-kula-400 focus:ring-offset-2 focus:ring-offset-[var(--app-bg)] disabled:cursor-not-allowed ${variantStyles[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
