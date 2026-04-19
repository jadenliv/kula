import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useNotifications, useUnreadCount, useMarkAllRead, useMarkOneRead } from '../../hooks/useNotifications'
import { Avatar } from '../ui/Avatar'
import type { Notification } from '../../services/notifications'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const { data: unreadCount = 0 } = useUnreadCount()
  const { data: notifications } = useNotifications()
  const markAll = useMarkAllRead()
  const markOne = useMarkOneRead()

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  const handleOpen = () => setOpen((v) => !v)

  const handleClickNotification = (n: Notification) => {
    if (!n.read_at) markOne.mutate(n.id)
    setOpen(false)
  }

  return (
    <div ref={panelRef} className="relative">
      {/* Bell button */}
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Notifications"
        className="relative flex h-10 w-10 items-center justify-center rounded-lg text-kula-500 transition-colors hover:bg-[var(--surface-raised)] hover:text-kula-700 dark:text-kula-400 dark:hover:text-kula-200"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 2a6 6 0 00-6 6v3l-1.5 2.5A1 1 0 003.5 15h13a1 1 0 00.86-1.5L16 11V8a6 6 0 00-6-6z" />
          <path d="M8 15a2 2 0 004 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-kula-600 px-0.5 text-[10px] font-bold text-white dark:bg-kula-400 dark:text-kula-950">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <h3 className="text-sm font-semibold text-kula-800 dark:text-kula-200">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
                className="text-xs text-kula-400 transition-colors hover:text-kula-700 dark:text-kula-600 dark:hover:text-kula-300"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto">
            {!notifications?.length ? (
              <p className="px-4 py-8 text-center text-sm text-kula-400 dark:text-kula-600">
                No notifications yet.
              </p>
            ) : (
              notifications.map((n) => (
                <NotificationRow
                  key={n.id}
                  notification={n}
                  onClick={() => handleClickNotification(n)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Notification row ──────────────────────────────────────────────────────────

function NotificationRow({
  notification: n,
  onClick,
}: {
  notification: Notification
  onClick: () => void
}) {
  const href = notificationHref(n)
  const text = notificationText(n)
  const isUnread = !n.read_at

  return (
    <Link
      to={href}
      onClick={onClick}
      className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-[var(--surface-raised)] ${
        isUnread ? 'bg-kula-500/5 dark:bg-kula-400/5' : ''
      }`}
    >
      <Avatar profile={n.actor} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-kula-800 dark:text-kula-200">
          <span className="font-medium">
            {n.actor.display_name || n.actor.username}
          </span>{' '}
          {text}
        </p>
        <p className="mt-0.5 text-xs text-kula-400 dark:text-kula-600">
          {timeAgo(n.created_at)}
        </p>
      </div>
      {isUnread && (
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-kula-500 dark:bg-kula-400" />
      )}
    </Link>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function notificationText(n: Notification): string {
  switch (n.type) {
    case 'new_follower': return 'started following you.'
    case 'follow_request': return 'requested to follow you.'
    case 'follow_accepted': return 'accepted your follow request.'
    default: return ''
  }
}

function notificationHref(n: Notification): string {
  switch (n.type) {
    case 'new_follower':
    case 'follow_accepted':
      return `/u/${n.actor.username}`
    case 'follow_request':
      return '/settings/followers'
    default:
      return '/today'
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
