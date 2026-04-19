import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ZemanimBar } from '../zemanim/ZemanimBar'
import { UserMenu } from './UserMenu'
import { NotificationBell } from './NotificationBell'
import { POSTS_ENABLED } from '../../lib/featureFlags'

type Props = {
  onToggleTheme: () => void
  isDark: boolean
}

export function Header({ onToggleTheme, isDark }: Props) {
  const { user } = useAuth()

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
          className="flex h-10 w-10 items-center justify-center rounded-lg text-sm text-kula-500 transition-colors hover:bg-[var(--surface-raised)] hover:text-kula-700 dark:text-kula-400 dark:hover:text-kula-200"
        >
          {isDark ? '☀' : '☾'}
        </button>
        {user && <NotificationBell />}
        {user && POSTS_ENABLED && (
          <Link
            to="/posts/new"
            aria-label="New post"
            title="New post"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-kula-500 transition-colors hover:bg-[var(--surface-raised)] hover:text-kula-700 dark:text-kula-400 dark:hover:text-kula-200"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 2.5a2.121 2.121 0 013 3L6 17H3v-3L14.5 2.5z" />
            </svg>
          </Link>
        )}
        {user && <UserMenu />}
      </div>
    </header>
  )
}
