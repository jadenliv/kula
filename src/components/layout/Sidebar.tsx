import { NavLink } from 'react-router-dom'

const navItems = [
  {
    to: '/today',
    label: 'Today',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <rect x="3" y="4" width="14" height="13" rx="2" />
        <path d="M3 8h14" />
        <path d="M7 2v3M13 2v3" />
        <path d="M7 12h2M11 12h2M7 15h2" />
      </svg>
    ),
  },
  {
    to: '/browse',
    label: 'Browse',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="M4 5h12M4 9h8M4 13h10M4 17h6" />
      </svg>
    ),
  },
  {
    to: '/notebook',
    label: 'Notebook',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="M6 3h9a1 1 0 011 1v12a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z" />
        <path d="M4 5v12" />
        <path d="M8 8h6M8 11h6M8 14h4" />
      </svg>
    ),
  },
]

export function Sidebar() {
  return (
    <aside className="hidden w-52 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] transition-colors duration-200 md:flex md:flex-col">
      <nav className="flex flex-col gap-1 p-3 pt-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-kula-600/10 text-kula-700 dark:bg-kula-400/10 dark:text-kula-300'
                  : 'text-kula-500 hover:bg-[var(--surface-raised)] hover:text-kula-800 dark:text-kula-500 dark:hover:bg-[var(--surface-raised)] dark:hover:text-kula-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`transition-colors ${isActive ? 'text-kula-600 dark:text-kula-400' : 'text-kula-400 group-hover:text-kula-600 dark:text-kula-600 dark:group-hover:text-kula-300'}`}>
                  {item.icon}
                </span>
                {item.label}
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-kula-500 dark:bg-kula-400" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
