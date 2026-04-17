import { NavLink } from 'react-router-dom'

const navItems = [
  {
    to: '/today',
    label: 'Today',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M3 9h18" />
        <path d="M8 2v3M16 2v3" />
        <path d="M8 14h2M13 14h2M8 17h2" />
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
        <path d="M5 5v16" />
        <path d="M9 9h7M9 12h7M9 15h5" />
      </svg>
    ),
  },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md md:hidden">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
              isActive
                ? 'text-kula-600 dark:text-kula-300'
                : 'text-kula-400 dark:text-kula-500'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span>{item.icon(isActive)}</span>
              <span>{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
