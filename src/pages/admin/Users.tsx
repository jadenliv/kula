/**
 * /admin/users — user metrics and activity dashboard.
 * Admin-only. Requires the get_admin_stats() SQL function to be installed
 * (supabase/migrations/0010_admin_stats.sql).
 */

import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { isAdmin } from '../../lib/adminConfig'
import { getAdminStats } from '../../services/adminStats'
import { Spinner } from '../../components/ui/Spinner'

export default function AdminUsers() {
  const { user } = useAuth()

  if (!isAdmin(user?.id)) {
    return (
      <div className="mx-auto max-w-lg py-24 text-center">
        <p className="text-sm text-kula-500 dark:text-kula-400">
          You don't have permission to view this page.{' '}
          <Link to="/today" className="text-kula-600 underline-offset-2 hover:underline dark:text-kula-300">
            Go home →
          </Link>
        </p>
      </div>
    )
  }

  return <UsersPage />
}

function UsersPage() {
  const { data: stats, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: getAdminStats,
    staleTime: 1000 * 60 * 5, // 5 min
  })

  if (isLoading) {
    return <div className="flex justify-center py-24"><Spinner size="md" /></div>
  }

  if (error) {
    const msg = error instanceof Error ? error.message : String(error)
    const isMissing = msg.toLowerCase().includes('function') || msg.toLowerCase().includes('rpc')
    return (
      <div className="mx-auto max-w-lg py-16 text-center space-y-4">
        <p className="text-sm font-medium text-kula-700 dark:text-kula-300">
          {isMissing ? 'Stats function not installed yet.' : 'Failed to load stats.'}
        </p>
        {isMissing && (
          <p className="text-sm text-kula-500 dark:text-kula-400">
            Run{' '}
            <span className="font-mono text-xs bg-kula-500/10 px-1.5 py-0.5 rounded">
              supabase/migrations/0010_admin_stats.sql
            </span>
            {' '}in your Supabase SQL Editor, then refresh.
          </p>
        )}
        <button
          type="button"
          onClick={() => void refetch()}
          className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs text-kula-600 hover:border-kula-400 dark:text-kula-400"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!stats) return null

  const activationRate = stats.total_users > 0
    ? Math.round((stats.onboarding_completed / stats.total_users) * 100)
    : 0

  const wauRate = stats.total_users > 0
    ? Math.round((stats.active_users_7d / stats.total_users) * 100)
    : 0

  return (
    <div className="mx-auto max-w-2xl space-y-10 py-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-serif text-3xl tracking-tight text-kula-900 dark:text-kula-50">
            Users
          </h2>
          <p className="mt-1 text-sm text-kula-500 dark:text-kula-400">
            {stats.total_users.toLocaleString()} total accounts
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-kula-400 dark:text-kula-600">
          <Link to="/admin/reports" className="hover:text-kula-700 dark:hover:text-kula-300 transition-colors">
            Reports →
          </Link>
          <Link to="/admin/status" className="hover:text-kula-700 dark:hover:text-kula-300 transition-colors">
            Status →
          </Link>
        </div>
      </div>

      {/* Top-line metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Total users" value={stats.total_users} />
        <MetricCard label="New today" value={stats.signups_today} />
        <MetricCard label="New (7d)" value={stats.signups_7d} />
        <MetricCard label="New (30d)" value={stats.signups_30d} />
      </div>

      {/* Engagement */}
      <Section title="Engagement">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard
            label="Active (7d)"
            value={stats.active_users_7d}
            sub={`${wauRate}% of users`}
          />
          <MetricCard
            label="Active (30d)"
            value={stats.active_users_30d}
          />
          <MetricCard
            label="Onboarded"
            value={stats.onboarding_completed}
            sub={`${activationRate}% activation`}
          />
          <MetricCard
            label="Follows"
            value={stats.total_follows}
          />
        </div>
      </Section>

      {/* Profile visibility split */}
      <Section title="Profile visibility">
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Public profiles" value={stats.public_profiles} />
          <MetricCard label="Private profiles" value={stats.private_profiles} />
        </div>
      </Section>

      {/* Content */}
      <Section title="Content">
        <div className="grid grid-cols-3 gap-3">
          <MetricCard label="Sections learned" value={stats.total_completions} />
          <MetricCard label="Notes" value={stats.total_notes} />
          <MetricCard label="Posts" value={stats.total_posts} />
        </div>
      </Section>

      {/* Weekly signups chart */}
      {stats.signups_by_week.length > 0 && (
        <Section title="Weekly signups (last 12 weeks)">
          <BarChart
            data={stats.signups_by_week}
            labelKey="week"
            valueKey="count"
            formatLabel={(s) => {
              const d = new Date(s + 'T12:00:00')
              return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
            }}
          />
        </Section>
      )}

      {/* Daily active users chart */}
      {stats.dau_by_day.length > 0 && (
        <Section title="Daily active users (last 30 days)">
          <BarChart
            data={stats.dau_by_day}
            labelKey="day"
            valueKey="active_users"
            formatLabel={(s) => {
              const d = new Date(s + 'T12:00:00')
              return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
            }}
          />
        </Section>
      )}

    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-kula-400 dark:text-kula-600">
        {title}
      </h3>
      {children}
    </section>
  )
}

function MetricCard({
  label,
  value,
  sub,
}: {
  label: string
  value: number
  sub?: string
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="font-serif text-2xl font-medium text-kula-800 dark:text-kula-200">
        {value.toLocaleString()}
      </p>
      <p className="mt-1 text-xs text-kula-500 dark:text-kula-400">{label}</p>
      {sub && (
        <p className="mt-0.5 text-xs text-kula-400 dark:text-kula-600">{sub}</p>
      )}
    </div>
  )
}

// Simple CSS bar chart — no charting library needed.
function BarChart<T extends Record<string, unknown>>({
  data,
  labelKey,
  valueKey,
  formatLabel,
}: {
  data: T[]
  labelKey: keyof T
  valueKey: keyof T
  formatLabel: (raw: string) => string
}) {
  const values = data.map((d) => Number(d[valueKey]))
  const max = Math.max(...values, 1)

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-end gap-1" style={{ height: 120 }}>
        {data.map((d, i) => {
          const val = Number(d[valueKey])
          const heightPct = (val / max) * 100
          const label = formatLabel(String(d[labelKey]))
          return (
            <div
              key={i}
              className="group relative flex flex-1 flex-col items-center justify-end"
              style={{ height: '100%' }}
            >
              {/* Tooltip */}
              <div className="pointer-events-none absolute bottom-full mb-1 hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-center text-xs shadow-lg group-hover:block">
                <p className="font-medium text-kula-800 dark:text-kula-200">{val.toLocaleString()}</p>
                <p className="text-kula-400 dark:text-kula-600">{label}</p>
              </div>
              {/* Bar */}
              <div
                className="w-full rounded-t-sm bg-kula-500/60 transition-all dark:bg-kula-400/50"
                style={{ height: `${heightPct}%`, minHeight: val > 0 ? 2 : 0 }}
              />
            </div>
          )
        })}
      </div>
      {/* X-axis labels — show first, middle, last only to avoid crowding */}
      <div className="mt-2 flex justify-between text-[10px] text-kula-400 dark:text-kula-600">
        <span>{formatLabel(String(data[0][labelKey]))}</span>
        {data.length > 2 && (
          <span>{formatLabel(String(data[Math.floor(data.length / 2)][labelKey]))}</span>
        )}
        <span>{formatLabel(String(data[data.length - 1][labelKey]))}</span>
      </div>
    </div>
  )
}
