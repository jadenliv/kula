import { useEffect, useRef, useState } from 'react'
import { track } from '@vercel/analytics'
import { submitReport, REPORT_REASONS, type ReportTargetType, type ReportReason } from '../../services/reports'

type Props = {
  targetType: ReportTargetType
  targetId: string
}

export function ReportButton({ targetType, targetId }: Props) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<ReportReason>(REPORT_REASONS[0])
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await submitReport(targetType, targetId, reason, details, window.location.href)
      setSubmitted(true)
      // Track: report submitted. target_type is content classification, not PII.
      track('report_submitted', { target_type: targetType })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit report.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setOpen(false)
    // Reset after close animation
    setTimeout(() => {
      setSubmitted(false)
      setDetails('')
      setReason(REPORT_REASONS[0])
      setError(null)
    }, 200)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-kula-400 transition-colors hover:text-kula-600 dark:text-kula-600 dark:hover:text-kula-400"
      >
        Report
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-50 bg-kula-950/60"
            onClick={handleClose}
            aria-hidden="true"
          />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Report"
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl"
          >
            {submitted ? (
              <div className="space-y-3 text-center">
                <p className="text-sm font-medium text-kula-700 dark:text-kula-300">
                  Report submitted
                </p>
                <p className="text-sm text-kula-500 dark:text-kula-400">
                  Thank you. We'll review it as soon as possible.
                </p>
                <button
                  type="button"
                  onClick={handleClose}
                  className="mt-2 rounded-xl bg-kula-700 px-4 py-2 text-sm font-medium text-white dark:bg-kula-400 dark:text-kula-950"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-kula-800 dark:text-kula-200">
                    Report this {targetType}
                  </h2>
                  <button type="button" onClick={handleClose}
                    className="text-kula-400 hover:text-kula-700 dark:hover:text-kula-200">
                    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 5l10 10M15 5L5 15" />
                    </svg>
                  </button>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-kula-600 dark:text-kula-400">
                    Reason
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value as ReportReason)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-kula-900 focus:border-kula-400 focus:outline-none dark:text-kula-100"
                  >
                    {REPORT_REASONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-kula-600 dark:text-kula-400">
                    Additional details (optional)
                  </label>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="Tell us more…"
                    className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-kula-900 placeholder:text-kula-400 focus:border-kula-400 focus:outline-none dark:text-kula-100"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-500">{error}</p>
                )}

                <div className="flex justify-end gap-2">
                  <button type="button" onClick={handleClose}
                    className="rounded-xl px-3 py-1.5 text-sm text-kula-500 hover:text-kula-700 dark:hover:text-kula-300">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting}
                    className="rounded-xl bg-kula-700 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-kula-400 dark:text-kula-950">
                    {submitting ? 'Submitting…' : 'Submit report'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </>
      )}
    </>
  )
}
