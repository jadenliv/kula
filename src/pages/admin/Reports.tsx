import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { isAdmin } from '../../lib/adminConfig'
import { listReports, handleReport, type Report } from '../../services/reports'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Spinner } from '../../components/ui/Spinner'

export default function AdminReports() {
  const { user } = useAuth()

  // Admin gate — checked before render so non-admins see a clean 403.
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

  return <ReportsPage />
}

// ── Reports page (admin-only) ──────────────────────────────────────────────────

function ReportsPage() {
  const [filter, setFilter] = useState<'all' | 'unhandled' | 'handled'>('unhandled')
  const queryClient = useQueryClient()

  const { data: reports, isLoading, error } = useQuery({
    queryKey: ['admin', 'reports'],
    queryFn: listReports,
    staleTime: 1000 * 30,
  })

  const handle = useMutation({
    mutationFn: ({ reportId, action }: { reportId: string; action: string }) =>
      handleReport(reportId, action),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] }),
  })

  if (isLoading) {
    return <div className="flex justify-center py-24"><Spinner size="md" /></div>
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl py-24 text-center">
        <p className="text-sm text-kula-500 dark:text-kula-400">
          Failed to load reports.
        </p>
      </div>
    )
  }

  const allReports = reports ?? []

  const visible = allReports.filter((r) => {
    if (filter === 'unhandled') return !r.handled_at
    if (filter === 'handled') return !!r.handled_at
    return true
  })

  const unhandledCount = allReports.filter((r) => !r.handled_at).length

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-serif text-3xl tracking-tight text-kula-900 dark:text-kula-50">
            Reports
          </h2>
          <p className="mt-1 text-sm text-kula-500 dark:text-kula-400">
            {unhandledCount} unhandled · {allReports.length} total
          </p>
        </div>
        <Link
          to="/admin/posts"
          className="text-xs text-kula-400 transition-colors hover:text-kula-700 dark:text-kula-600 dark:hover:text-kula-300"
        >
          Manage posts →
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-1">
        {(['unhandled', 'handled', 'all'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`flex-1 rounded-lg py-1.5 text-sm font-medium capitalize transition-colors ${
              filter === f
                ? 'bg-[var(--surface)] text-kula-700 shadow-sm dark:text-kula-200'
                : 'text-kula-500 hover:text-kula-700 dark:text-kula-500 dark:hover:text-kula-300'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Report list */}
      {visible.length === 0 ? (
        <p className="py-12 text-center text-sm text-kula-400 dark:text-kula-600">
          No {filter !== 'all' ? filter : ''} reports.
        </p>
      ) : (
        <div className="space-y-3">
          {visible.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onHandle={(action) => handle.mutate({ reportId: report.id, action })}
              isHandling={handle.isPending}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Report card ───────────────────────────────────────────────────────────────

function ReportCard({
  report,
  onHandle,
  isHandling,
}: {
  report: Report
  onHandle: (action: string) => void
  isHandling: boolean
}) {
  const [action, setAction] = useState('')
  const isHandled = !!report.handled_at

  const targetUrl = extractTargetUrl(report.details)
  const detailsBody = report.details.replace(/\n\nURL: .+$/, '').trim()

  return (
    <div className={`space-y-3 rounded-xl border p-4 ${
      isHandled
        ? 'border-[var(--border)] bg-[var(--surface-raised)] opacity-60'
        : 'border-kula-300/50 bg-[var(--surface)] dark:border-kula-600/30'
    }`}>
      {/* Meta */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="rounded-lg border border-[var(--border)] px-2 py-0.5 text-xs font-medium text-kula-600 dark:text-kula-400">
              {report.target_type}
            </span>
            <span className="text-xs font-semibold text-kula-700 dark:text-kula-300">
              {report.reason}
            </span>
          </div>
          <p className="text-xs text-kula-400 dark:text-kula-600">
            {new Date(report.created_at).toLocaleString()}{' '}
            {report.reporter && (
              <>· by{' '}
                <Link
                  to={`/u/${report.reporter.username}`}
                  className="text-kula-500 underline-offset-2 hover:underline dark:text-kula-400"
                >
                  @{report.reporter.username}
                </Link>
              </>
            )}
          </p>
        </div>

        {isHandled && (
          <span className="shrink-0 rounded-lg bg-kula-100 px-2 py-1 text-xs font-medium text-kula-600 dark:bg-kula-800 dark:text-kula-400">
            ✓ {report.handled_action ?? 'handled'}
          </span>
        )}
      </div>

      {/* Target ID + URL */}
      <div className="rounded-lg bg-[var(--surface-raised)] px-3 py-2 text-xs">
        <span className="text-kula-400 dark:text-kula-600">Target ID: </span>
        <span className="font-mono text-kula-700 dark:text-kula-300">{report.target_id}</span>
        {targetUrl && (
          <>
            {' · '}
            <a
              href={targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-kula-500 underline-offset-2 hover:underline dark:text-kula-400"
            >
              View →
            </a>
          </>
        )}
      </div>

      {/* Details */}
      {detailsBody && (
        <p className="text-sm text-kula-700 dark:text-kula-300">{detailsBody}</p>
      )}

      {/* Handle form */}
      {!isHandled && (
        <div className="flex gap-2">
          <input
            type="text"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="Action taken (e.g. warned, removed content)…"
            className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs text-kula-900 placeholder:text-kula-400 focus:border-kula-400 focus:outline-none dark:text-kula-100"
          />
          <button
            type="button"
            onClick={() => onHandle(action || 'reviewed')}
            disabled={isHandling}
            className="shrink-0 rounded-xl bg-kula-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-kula-800 disabled:opacity-50 dark:bg-kula-400 dark:text-kula-950 dark:hover:bg-kula-300"
          >
            Mark handled
          </button>
        </div>
      )}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Pull the URL we appended in submitReport() out of the details field. */
function extractTargetUrl(details: string): string | null {
  const match = details.match(/\n\nURL: (.+)$/)
  return match ? match[1].trim() : null
}
