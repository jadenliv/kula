import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'

const THEME_KEY = 'kula-theme'

function getInitialDark(): boolean {
  if (typeof window === 'undefined') return true
  const stored = window.localStorage.getItem(THEME_KEY)
  if (stored === 'light') return false
  return true
}

export function AppShell() {
  const [isDark, setIsDark] = useState<boolean>(getInitialDark)

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
          <Outlet />
        </main>
      </div>
      {/* Mobile-only bottom navigation */}
      <BottomNav />
    </div>
  )
}
