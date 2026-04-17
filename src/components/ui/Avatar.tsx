type Size = 'xs' | 'sm' | 'md' | 'lg'

/** Minimal profile shape Avatar actually needs. Full Profile satisfies this too. */
type AvatarProfile = {
  username: string
  display_name: string
}

const SIZE_CLASSES: Record<Size, string> = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-16 w-16 text-xl',
}

/**
 * Deterministic HSL color from a string — same input always produces the same
 * hue so a user's avatar color is stable across sessions and devices.
 */
function colorFromString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 50%, 55%)`
}

function initials(profile: AvatarProfile): string {
  const name = profile.display_name.trim() || profile.username
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

type Props = {
  profile: AvatarProfile | null | undefined
  size?: Size
  className?: string
}

export function Avatar({ profile, size = 'md', className = '' }: Props) {
  const sizeClass = SIZE_CLASSES[size]

  if (!profile) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-full bg-kula-200 font-semibold text-kula-500 dark:bg-kula-800 dark:text-kula-400 ${sizeClass} ${className}`}
      >
        ?
      </span>
    )
  }

  const bg = colorFromString(profile.username)
  const label = initials(profile)

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${sizeClass} ${className}`}
      style={{ backgroundColor: bg }}
      aria-label={profile.display_name || profile.username}
    >
      {label}
    </span>
  )
}
