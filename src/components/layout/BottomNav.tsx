import { NavLink } from 'react-router-dom'
import { useTimer } from '../../context/TimerContext'

const navItems = [
  {
    to: '/today',
    label: 'Today',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M3 9h18M8 2v3M16 2v3M8 14h2M13 14h2M8 17h2" />
      </svg>
    ),
  },
  {
    to: '/feed',
    label: 'Feed',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </svg>
    ),
  },
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <rect x="3" y="14" width="4" height="7" rx="1" />
        <rect x="10" y="9" width="4" height="12" rx="1" />
        <rect x="17" y="4" width="4" height="17" rx="1" />
      </svg>
    ),
  },
  {
    to: '/browse',
    label: 'Browse',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M4 6h16M4 10h10M4 14h12M4 18h8" />
      </svg>
    ),
  },
  {
    to: '/notebook',
    label: 'Notebook',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M7 3h11a1 1 0 011 1v14a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z" />
        <path d="M5 5v16M9 9h7M9 12h7M9 15h5" />
      </svg>
    ),
  },
]

export function BottomNav() {
  const { activeSession } = useTimer()

  return (
    <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-30 flex border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md md:hidden">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
              isActive
                ? 'text-kula-600 dark:text-kula-200'
                : 'text-kula-400 dark:text-kula-400'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span className="relative">
                {item.icon(isActive)}
                {item.to === '/dashboard' && activeSession && (
                  <span className="absolute -right-1 -top-1 flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-kula-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-kula-500 dark:bg-kula-400" />
                  </span>
                )}
              </span>
              <span>{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
