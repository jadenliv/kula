type Props = {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeStyles: Record<NonNullable<Props['size']>, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-4',
}

export function Spinner({ size = 'md', className = '' }: Props) {
  return (
    <div
      className={`animate-spin rounded-full border-kula-200 border-t-kula-500 dark:border-kula-800 dark:border-t-kula-400 ${sizeStyles[size]} ${className}`}
      role="status"
      aria-label="Loading"
    />
  )
}
