/**
 * /settings/learning — lets users review and change their daily cycle selections
 * after onboarding. Accessible from Settings → Learning tab.
 */

import { useState } from 'react'
import { useOwnProfile, useUpdateProfile } from '../../hooks/useProfile'
import { useToast } from '../../context/ToastContext'
import { Spinner } from '../../components/ui/Spinner'
import { CYCLE_OPTIONS } from '../Onboarding'

export default function LearningSettings() {
  const { data: profile, isLoading } = useOwnProfile()
  const update = useUpdateProfile()
  const { showToast } = useToast()

  // Treat null (not-yet-set) as all selected so the page shows a reasonable state
  const [selected, setSelected] = useState<Set<string> | null>(null)

  // Initialize from profile once loaded
  const effectiveSelected: Set<string> = selected ?? new Set(
    profile?.daily_cycles ?? CYCLE_OPTIONS.map((c) => c.id)
  )

  const toggle = (id: string) => {
    const next = new Set(effectiveSelected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const isDirty = selected !== null

  const handleSave = () => {
    const cycles = Array.from(effectiveSelected)
    update.mutate(
      { daily_cycles: cycles.length > 0 ? cycles : null },
      {
        onSuccess: () => {
          setSelected(null) // reset dirty state
          showToast('Daily learning updated.')
        },
        onError: () => showToast('Failed to save. Try again.'),
      },
    )
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="md" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm leading-relaxed text-kula-600 dark:text-kula-400">
          Choose which daily learning cycles appear on your Today page.
          If none are selected, all six will be shown.
        </p>
      </div>

      <div className="space-y-2">
        {CYCLE_OPTIONS.map((option) => {
          const checked = effectiveSelected.has(option.id)
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => toggle(option.id)}
              className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                checked
                  ? 'border-kula-400/60 bg-kula-500/5 dark:border-kula-400/60 dark:bg-kula-400/5'
                  : 'border-[var(--border)] hover:border-kula-300/60 dark:hover:border-kula-700/60'
              }`}
            >
              {/* Checkbox */}
              <div
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                  checked
                    ? 'border-kula-500 bg-kula-500 dark:border-kula-400 dark:bg-kula-400'
                    : 'border-kula-300 dark:border-kula-700'
                }`}
              >
                {checked && (
                  <svg
                    viewBox="0 0 12 12"
                    className="h-3 w-3 text-white dark:text-kula-950"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2 6l3 3 5-5" />
                  </svg>
                )}
              </div>
              {/* Text */}
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-kula-800 dark:text-kula-200">
                    {option.label}
                  </span>
                  <span
                    className="font-['Heebo'] text-xs text-kula-400 dark:text-kula-600"
                    dir="rtl"
                  >
                    {option.hebrew}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-kula-500 dark:text-kula-500">
                  {option.description}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || update.isPending}
          className="rounded-xl bg-kula-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-kula-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-kula-400 dark:text-kula-950 dark:hover:bg-kula-300"
        >
          {update.isPending ? (
            <span className="flex items-center gap-2">
              <Spinner size="sm" /> Saving…
            </span>
          ) : (
            'Save'
          )}
        </button>
      </div>
    </div>
  )
}
