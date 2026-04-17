import { useMemo, useState } from 'react'
import { LearningTimer } from '../components/timer/LearningTimer'
import { useSessions, useDeleteSession } from '../hooks/useSessions'
import { useTimer } from '../context/TimerContext'
import { Spinner } from '../components/ui/Spinner'
import type { LearningSession } from '../services/sessions'

function formatDuration(seconds: number): string {
  if (seconds < 60) return '< 1m'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h${m > 0 ? ` ${m}m` : ''}`
  return `${m}m`
}

function formatSessionDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterday = today - 86400000
  const sessionDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  if (sessionDay === today) return 'Today'
  if (sessionDay === yesterday) return 'Yesterday'
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

type Stats = {
  todaySeconds: number
  weekSeconds: number
  totalSeconds: number
  streak: number
  totalSessions: number
  topSefarim: { label: string; seconds: number }[]
}

function calcStats(sessions: LearningSession[]): Stats {
  const completed = sessions.filter((s) => s.ended_at && s.duration_seconds)
  const now = new Date()
  const todayStart = startOfDay(now)
  const weekStart = todayStart - 6 * 86400000

  let todaySeconds = 0
  let weekSeconds = 0
  let totalSeconds = 0
  const seferMap = new Map<string, number>()
  const daySet = new Set<number>()

  for (const s of completed) {
    const dur = s.duration_seconds!
    const t = new Date(s.started_at).getTime()
    totalSeconds += dur
    if (t >= todayStart) todaySeconds += dur
    if (t >= weekStart) weekSeconds += dur
    daySet.add(startOfDay(new Date(s.started_at)))
    const key = s.sefer_label ?? 'General'
    seferMap.set(key, (seferMap.get(key) ?? 0) + dur)
  }

  let streak = 0
  let checkDay = todayStart
  while (daySet.has(checkDay)) {
    streak++
    checkDay -= 86400000
  }

  const topSefarim = Array.from(seferMap.entries())
    .map(([label, seconds]) => ({ label, seconds }))
    .sort((a, b) => b.seconds - a.seconds)
    .slice(0, 5)

  return { todaySeconds, weekSeconds, totalSeconds, streak, totalSessions: completed.length, topSefarim }
}

type SessionGroup = { dateLabel: string; sessions: LearningSession[] }

function groupByDate(sessions: LearningSession[]): SessionGroup[] {
  const groups = new Map<string, LearningSession[]>()
  for (const s of sessions) {
    if (!s.ended_at) continue
    const label = formatSessionDate(s.started_at)
    const list = groups.get(label)
    if (list) list.push(s)
    else groups.set(label, [s])
  }
  return Array.from(groups.entries()).map(([dateLabel, sessions]) => ({ dateLabel, sessions }))
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-kula-500 dark:text-kula-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-kula-800 dark:text-kula-100">
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 text-xs text-kula-400 dark:text-kula-600">{sub}</p>
      )}
    </div>
  )
}

function SessionRow({ session }: { session: LearningSession }) {
  const deleteSession = useDeleteSession()
  const [expanded, setExpanded] = useState(false)

  const duration = session.duration_seconds ? formatDuration(session.duration_seconds) : null
  const time = new Date(session.started_at).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-kula-800 dark:text-kula-200">
              {session.sefer_label ?? 'General learning'}
            </span>
            {duration && (
              <span className="rounded-full bg-kula-500/10 px-2 py-0.5 text-xs font-medium text-kula-600 dark:bg-kula-400/10 dark:text-kula-400">
                {duration}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-kula-400 dark:text-kula-600">{time}</p>
          {session.notes && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-1.5 text-left text-xs text-kula-500 hover:text-kula-700 dark:hover:text-kula-300"
            >
              {expanded ? (
                <span className="whitespace-pre-wrap text-kula-700 dark:text-kula-300">
                  {session.notes}
                </span>
              ) : (
                <span className="line-clamp-1 italic">{session.notes}</span>
              )}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => deleteSession.mutate(session.id)}
          disabled={deleteSession.isPending}
          aria-label="Delete session"
          className="shrink-0 rounded-lg p-1.5 text-kula-300 transition-colors hover:bg-[var(--surface-overlay)] hover:text-red-400 disabled:opacity-40 dark:text-kula-700"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 5l10 10M15 5L5 15" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { data: sessions, isLoading } = useSessions()
  const { activeSession, elapsedSeconds } = useTimer()

  const stats = useMemo(() => calcStats(sessions ?? []), [sessions])
  const groups = useMemo(() => groupByDate(sessions ?? []), [sessions])

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="font-serif text-2xl tracking-tight text-kula-900 dark:text-kula-50 md:text-3xl">
          Dashboard
        </h2>
        <p className="mt-0.5 text-sm text-kula-500 dark:text-kula-400">
          Your learning at a glance.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Today"
          value={formatDuration(stats.todaySeconds + (activeSession ? elapsedSeconds : 0))}
          sub="time learned"
        />
        <StatCard
          label="This Week"
          value={formatDuration(stats.weekSeconds + (activeSession ? elapsedSeconds : 0))}
          sub="last 7 days"
        />
        <StatCard
          label="All Time"
          value={formatDuration(stats.totalSeconds + (activeSession ? elapsedSeconds : 0))}
          sub={`${stats.totalSessions} session${stats.totalSessions === 1 ? '' : 's'}`}
        />
        <StatCard
          label="Streak"
          value={stats.streak > 0 ? `${stats.streak}d` : '—'}
          sub={stats.streak > 0 ? 'days in a row' : 'start today'}
        />
      </div>

      {/* Timer + top sefarim */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <LearningTimer />
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-kula-500 dark:text-kula-400">
            Top Sefarim
          </p>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-kula-500">
              <Spinner size="sm" /> Loading…
            </div>
          ) : stats.topSefarim.length === 0 ? (
            <p className="text-sm italic text-kula-400 dark:text-kula-600">No sessions yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {stats.topSefarim.map(({ label, seconds }) => {
                const pct = stats.totalSeconds > 0
                  ? Math.round((seconds / stats.totalSeconds) * 100)
                  : 0
                return (
                  <li key={label}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-kula-700 dark:text-kula-300">{label}</span>
                      <span className="text-kula-400 dark:text-kula-600">{formatDuration(seconds)}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-raised)]">
                      <div
                        className="h-full rounded-full bg-kula-500 dark:bg-kula-400"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Session log */}
      <section>
        <h3 className="mb-3 font-serif text-lg tracking-tight text-kula-900 dark:text-kula-100">
          Session Log
        </h3>
        {isLoading && (
          <div className="flex items-center gap-3 text-sm text-kula-600 dark:text-kula-400">
            <Spinner size="sm" /> Loading sessions…
          </div>
        )}
        {!isLoading && groups.length === 0 && (
          <div className="rounded-xl border border-dashed border-[var(--border)] px-6 py-10 text-center">
            <p className="text-sm text-kula-400 dark:text-kula-600">
              No sessions yet. Clock in above to start tracking.
            </p>
          </div>
        )}
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.dateLabel}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-kula-400 dark:text-kula-600">
                {group.dateLabel}
              </p>
              <div className="space-y-2">
                {group.sessions.map((s) => (
                  <SessionRow key={s.id} session={s} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
