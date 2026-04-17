import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useProfile } from '../../context/ProfileContext'
import { Avatar } from '../ui/Avatar'

export function UserMenu() {
  const { signOut } = useAuth()
  const { profile } = useProfile()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  const handleSignOut = async () => {
    setOpen(false)
    await signOut()
    navigate('/signin')
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl p-1 transition-colors hover:bg-[var(--surface-raised)]"
        aria-label="User menu"
        aria-expanded={open}
      >
        <Avatar profile={profile} size="sm" />
        {/* Show name on desktop only */}
        {profile && (
          <span className="hidden max-w-[120px] truncate text-sm font-medium text-kula-700 dark:text-kula-300 md:block">
            {profile.display_name || profile.username}
          </span>
        )}
        <svg
          viewBox="0 0 12 12"
          className={`hidden h-3 w-3 shrink-0 text-kula-400 transition-transform md:block ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 4l4 4 4-4" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-52 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xl">
          {/* Profile summary */}
          {profile && (
            <div className="border-b border-[var(--border)] px-4 py-3">
              <p className="truncate text-sm font-medium text-kula-800 dark:text-kula-200">
                {profile.display_name || profile.username}
              </p>
              <p className="truncate text-xs text-kula-400 dark:text-kula-600">
                @{profile.username}
              </p>
            </div>
          )}

          {/* Menu items */}
          <div className="py-1">
            {profile && (
              <Link
                to={`/u/${profile.username}`}
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-kula-700 transition-colors hover:bg-[var(--surface-raised)] dark:text-kula-300"
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="10" cy="7" r="3.5" />
                  <path d="M3 18c0-3.866 3.134-7 7-7s7 3.134 7 7" />
                </svg>
                Profile
              </Link>
            )}
            <Link
              to="/settings"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-kula-700 transition-colors hover:bg-[var(--surface-raised)] dark:text-kula-300"
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="10" cy="10" r="2.5" />
                <path d="M10 2v2M10 16v2M3.22 5.22l1.42 1.42M15.36 13.36l1.42 1.42M2 10h2M16 10h2M3.22 14.78l1.42-1.42M15.36 6.64l1.42-1.42" />
              </svg>
              Settings
            </Link>

            <div className="my-1 border-t border-[var(--border)]" />

            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-kula-500 transition-colors hover:bg-[var(--surface-raised)] hover:text-red-500 dark:text-kula-500 dark:hover:text-red-400"
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 3h4a1 1 0 011 1v12a1 1 0 01-1 1h-4M8 15l5-5-5-5M3 10h10" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
