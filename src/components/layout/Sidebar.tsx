import { NavLink, Link } from 'react-router-dom'
import { useTimer } from '../../context/TimerContext'
import { useProfile } from '../../context/ProfileContext'
import { Avatar } from '../ui/Avatar'

const navItems = [
  {
    to: '/today',
    label: 'Today',
    icon: (active: boolean) => (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <rect x="3" y="4" width="14" height="13" rx="2" />
        <path d="M3 8h14M7 2v3M13 2v3M7 12h2M11 12h2M7 15h2" />
      </svg>
    ),
  },
  {
    to: '/feed',
    label: 'Feed',
    icon: (active: boolean) => (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <circle cx="10" cy="10" r="7" />
        <path d="M10 6v4l2.5 2.5" />
      </svg>
    ),
  },
  {
    to: '/discover',
    label: 'Discover',
    icon: (active: boolean) => (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <circle cx="10" cy="10" r="7" />
        <path d="M13 7l-2 4-4 2 2-4 4-2z" />
      </svg>
    ),
  },
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: (active: boolean) => (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <rect x="3" y="12" width="3" height="5" rx="1" />
        <rect x="8.5" y="8" width="3" height="9" rx="1" />
        <rect x="14" y="4" width="3" height="13" rx="1" />
      </svg>
    ),
  },
  {
    to: '/browse',
    label: 'Browse',
    icon: (active: boolean) => (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="M4 5h12M4 9h8M4 13h10M4 17h6" />
      </svg>
    ),
  },
  {
    to: '/notebook',
    label: 'Notebook',
    icon: (active: boolean) => (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="M6 3h9a1 1 0 011 1v12a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z" />
        <path d="M4 5v12M8 8h6M8 11h6M8 14h4" />
      </svg>
    ),
  },
]

export function Sidebar() {
  const { activeSession } = useTimer()
  const { profile } = useProfile()

  return (
    <aside className="hidden w-52 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] transition-colors duration-200 md:flex md:flex-col">
      <nav className="flex flex-col gap-0.5 p-3 pt-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-kula-500/10 text-kula-700 dark:bg-kula-400/12 dark:text-kula-100'
                  : 'text-kula-500 hover:bg-[var(--surface-raised)] hover:text-kula-800 dark:text-kula-400 dark:hover:bg-[var(--surface-raised)] dark:hover:text-kula-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {/* Left accent bar for active item */}
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-kula-500 dark:bg-kula-400" />
                )}
                <span className={`transition-colors ${
                  isActive
                    ? 'text-kula-600 dark:text-kula-300'
                    : 'text-kula-400 group-hover:text-kula-600 dark:text-kula-500 dark:group-hover:text-kula-300'
                }`}>
                  {item.icon(isActive)}
                </span>
                <span className="flex-1">{item.label}</span>
                {item.to === '/dashboard' && activeSession && (
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-kula-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-kula-500 dark:bg-kula-400" />
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User info at the bottom */}
      {profile && (
        <div className="mt-auto border-t border-[var(--border)] p-3">
          <Link
            to={`/u/${profile.username}`}
            className="flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-[var(--surface-raised)]"
          >
            <Avatar profile={profile} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-kula-800 dark:text-kula-200">
                {profile.display_name || profile.username}
              </p>
              <p className="truncate text-[10px] text-kula-500 dark:text-kula-400">
                @{profile.username}
              </p>
            </div>
          </Link>
        </div>
      )}
    </aside>
  )
}
