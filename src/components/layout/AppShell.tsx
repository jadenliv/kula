import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { useNotificationSubscription } from '../../hooks/useNotifications'
import { POSTS_ENABLED } from '../../lib/featureFlags'

const THEME_KEY = 'kula-theme'

function getInitialDark(): boolean {
  if (typeof window === 'undefined') return true
  const stored = window.localStorage.getItem(THEME_KEY)
  if (stored === 'light') return false
  return true
}

export function AppShell() {
  const [isDark, setIsDark] = useState<boolean>(getInitialDark)
  const { pathname } = useLocation()
  // Activate Supabase Realtime subscription so the notification bell updates live.
  useNotificationSubscription()

  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    window.localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light')
  }, [isDark])

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-kula-900 transition-colors duration-200 dark:text-kula-50">
      <Header
        isDark={isDark}
        onToggleTheme={() => setIsDark((prev) => !prev)}
      />
      <div className="flex">
        <Sidebar />
        {/* pb-20 on mobile reserves space above the bottom nav */}
        <main className="flex-1 px-4 py-5 pb-24 md:px-6 md:py-6 md:pb-6">
          {/* key=pathname forces a remount on every navigation, re-triggering the animation */}
          <div key={pathname} className="page-animate">
            <Outlet />
          </div>
        </main>
      </div>
      {/* Mobile-only bottom navigation */}
      <BottomNav />

      {/* Mobile FAB — compose new post, sits above the bottom nav */}
      {POSTS_ENABLED && (
        <Link
          to="/posts/new"
          aria-label="New post"
          className="fixed bottom-20 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-kula-700 text-white shadow-lg transition-transform hover:scale-105 active:scale-95 dark:bg-kula-400 dark:text-kula-950 md:hidden"
        >
          <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 2.5a2.121 2.121 0 013 3L6 17H3v-3L14.5 2.5z" />
          </svg>
        </Link>
      )}
    </div>
  )
}
