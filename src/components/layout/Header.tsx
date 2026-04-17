import { useAuth } from '../../context/AuthContext'
import { ZemanimBar } from '../zemanim/ZemanimBar'

type Props = {
  onToggleTheme: () => void
  isDark: boolean
}

export function Header({ onToggleTheme, isDark }: Props) {
  const { user, signOut } = useAuth()

  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-[var(--border)] bg-[var(--app-bg)]/90 px-4 py-2.5 backdrop-blur-md transition-colors duration-200 md:gap-4 md:px-6 md:py-3">
      {/* Wordmark */}
      <div className="flex shrink-0 items-center gap-2">
        <span className="font-['Heebo'] text-lg font-semibold tracking-tight text-kula-800 dark:text-kula-100 md:text-xl">
          כולה
        </span>
        <span className="text-xs text-kula-300 dark:text-kula-700">|</span>
        <span className="font-sans text-xs font-semibold uppercase tracking-widest text-kula-700 dark:text-kula-300 md:text-sm">
          Kula
        </span>
      </div>

      {/* Zemanim bar — hidden on mobile, fills remaining space on desktop */}
      <div className="relative hidden min-w-0 flex-1 md:block">
        <ZemanimBar />
      </div>

      {/* Spacer on mobile so controls go to the right */}
      <div className="flex-1 md:hidden" />

      {/* Right controls */}
      <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label="Toggle theme"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-sm text-kula-500 transition-colors hover:bg-[var(--surface-raised)] hover:text-kula-700 dark:text-kula-400 dark:hover:text-kula-200"
        >
          {isDark ? '☀' : '☾'}
        </button>
        {user && (
          <button
            type="button"
            onClick={() => void signOut()}
            className="hidden rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-kula-600 transition-colors hover:border-kula-400 hover:text-kula-700 dark:text-kula-400 dark:hover:text-kula-300 md:block"
          >
            Sign out
          </button>
        )}
      </div>
    </header>
  )
}
