import { useAuth } from '../../context/AuthContext'
import { Button } from '../ui/Button'
import { ZemanimBar } from '../zemanim/ZemanimBar'

type Props = {
  onToggleTheme: () => void
  isDark: boolean
}

export function Header({ onToggleTheme, isDark }: Props) {
  const { user, signOut } = useAuth()

  return (
    <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-[var(--border)] bg-[var(--app-bg)]/90 px-6 py-3 backdrop-blur-md transition-colors duration-200">
      {/* Wordmark */}
      <div className="flex shrink-0 items-center gap-2.5">
        <span className="font-['Heebo'] text-xl font-semibold tracking-tight text-kula-800 dark:text-kula-100">
          כולה
        </span>
        <span className="text-xs text-kula-300 dark:text-kula-700">|</span>
        <span className="font-sans text-sm font-semibold uppercase tracking-widest text-kula-700 dark:text-kula-300">
          Kula
        </span>
      </div>

      {/* Zemanim bar — fills remaining space */}
      <div className="relative min-w-0 flex-1">
        <ZemanimBar />
      </div>

      {/* Right controls */}
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="ghost" onClick={onToggleTheme} aria-label="Toggle theme">
          {isDark ? '☀' : '☾'}
        </Button>
        {user && (
          <Button variant="secondary" onClick={() => void signOut()}>
            Sign out
          </Button>
        )}
      </div>
    </header>
  )
}
