/**
 * Onboarding — a 6-step setup flow for new users.
 *
 * Shown when profile.onboarding_completed = false.
 * Each step persists its data server-side before advancing so the user can
 * close the tab mid-flow and resume at the same step on next login.
 *
 * Steps:
 *   1 — Welcome
 *   2 — Profile basics (display name, username, bio)
 *   3 — Daily learning cycles
 *   4 — Currently learning sefarim
 *   5 — Privacy explainer
 *   6 — Done
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { track } from '@vercel/analytics'
import { useOwnProfile, useUpdateProfile } from '../hooks/useProfile'
import { useUserSefarim, useAddUserSefer, useRemoveUserSefer } from '../hooks/useUserSefarim'
import { isUsernameAvailable } from '../services/profiles'
import { getPickerItems } from '../lib/catalogUtils'
import type { ProfileUpdate } from '../services/profiles'
import { Spinner } from '../components/ui/Spinner'

// ── Constants ─────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 6

export const CYCLE_OPTIONS = [
  {
    id: 'Parashat Hashavua',
    label: 'Parashat HaShavuah',
    hebrew: 'פרשת השבוע',
    description: 'Weekly Torah portion',
  },
  {
    id: 'Daf Yomi',
    label: 'Daf Yomi',
    hebrew: 'דף יומי',
    description: 'A page of Talmud Bavli each day',
  },
  {
    id: 'Yerushalmi Yomi',
    label: 'Yerushalmi Yomi',
    hebrew: 'ירושלמי יומי',
    description: 'Daily Talmud Yerushalmi',
  },
  {
    id: 'Daily Mishnah',
    label: 'Mishna Yomit',
    hebrew: 'משנה יומית',
    description: 'Daily mishnah study',
  },
  {
    id: 'Daily Rambam',
    label: 'Rambam (1 perek)',
    hebrew: 'רמב״ם יומי',
    description: 'One chapter of Mishneh Torah daily',
  },
  {
    id: 'Daily Rambam (3 Chapters)',
    label: 'Rambam (3 perakim)',
    hebrew: 'רמב״ם (3 פרקים)',
    description: 'Three chapters of Mishneh Torah daily',
  },
]

const USERNAME_RE = /^[a-z0-9_]{3,30}$/

// ── Shared layout pieces ──────────────────────────────────────────────────────

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <span className="font-['Heebo'] text-lg font-semibold tracking-tight text-kula-800 dark:text-kula-100">
        כולה
      </span>
      <span className="text-xs text-kula-300 dark:text-kula-700">|</span>
      <span className="font-sans text-xs font-semibold uppercase tracking-widest text-kula-700 dark:text-kula-300">
        Kula
      </span>
    </div>
  )
}

function ProgressIndicator({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i + 1 === step
                ? 'w-5 bg-kula-500 dark:bg-kula-400'
                : i + 1 < step
                ? 'w-1.5 bg-kula-300 dark:bg-kula-600'
                : 'w-1.5 bg-kula-100 dark:bg-kula-800'
            }`}
          />
        ))}
      </div>
      <span className="text-xs text-kula-400 dark:text-kula-600">
        {step} of {total}
      </span>
    </div>
  )
}

/** Consistent wrapper for each step's content + actions. */
function StepShell({
  heading,
  subheading,
  children,
  actions,
}: {
  heading: string
  subheading?: string
  children?: React.ReactNode
  actions: React.ReactNode
}) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-serif text-3xl tracking-tight text-kula-900 dark:text-kula-50 md:text-4xl">
          {heading}
        </h1>
        {subheading && (
          <p className="text-base leading-relaxed text-kula-600 dark:text-kula-400">
            {subheading}
          </p>
        )}
      </div>

      {children && <div>{children}</div>}

      <div className="flex flex-col gap-3 pt-2">{actions}</div>
    </div>
  )
}

function PrimaryButton({
  onClick,
  disabled,
  loading,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="flex w-full items-center justify-center rounded-xl bg-kula-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-kula-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-kula-400 dark:text-kula-950 dark:hover:bg-kula-300"
    >
      {loading ? <Spinner size="sm" /> : children}
    </button>
  )
}

function SecondaryButton({
  onClick,
  children,
}: {
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-[var(--border)] px-6 py-3 text-sm font-medium text-kula-600 transition-colors hover:border-kula-400 hover:text-kula-800 dark:text-kula-400 dark:hover:border-kula-500 dark:hover:text-kula-200"
    >
      {children}
    </button>
  )
}

// ── Step 1: Welcome ───────────────────────────────────────────────────────────

function Step1Welcome({ onNext }: { onNext: () => void }) {
  return (
    <StepShell
      heading="Welcome to Kula."
      subheading="Let's get your account ready in about a minute."
      actions={<PrimaryButton onClick={onNext}>Get started →</PrimaryButton>}
    />
  )
}

// ── Step 2: Profile basics ────────────────────────────────────────────────────

function Step2Profile({
  initialDisplayName,
  initialUsername,
  initialBio,
  profileId,
  onNext,
}: {
  initialDisplayName: string
  initialUsername: string
  initialBio: string
  profileId: string
  onNext: (updates: ProfileUpdate) => Promise<void>
}) {
  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [username, setUsername] = useState(initialUsername)
  const [bio, setBio] = useState(initialBio)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [saving, setSaving] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Live username format validation + debounced uniqueness check
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!username) {
      setUsernameError('Username is required.')
      return
    }
    if (!USERNAME_RE.test(username)) {
      setUsernameError('3–30 characters: lowercase letters, numbers, and underscores only.')
      setCheckingUsername(false)
      return
    }
    setUsernameError(null)
    setCheckingUsername(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const available = await isUsernameAvailable(username, profileId)
        if (!available) setUsernameError('That username is already taken.')
        else setUsernameError(null)
      } catch {
        setUsernameError(null) // Don't block on network error
      } finally {
        setCheckingUsername(false)
      }
    }, 500)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [username, profileId])

  const canAdvance =
    displayName.trim().length > 0 &&
    USERNAME_RE.test(username) &&
    !usernameError &&
    !checkingUsername

  const handleNext = async () => {
    if (!canAdvance) return
    setSaving(true)
    try {
      await onNext({
        display_name: displayName.trim(),
        username,
        bio: bio.trim(),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <StepShell
      heading="Your profile."
      subheading="This is how other Kula users will see you."
      actions={
        <PrimaryButton onClick={() => void handleNext()} disabled={!canAdvance} loading={saving}>
          Next →
        </PrimaryButton>
      }
    >
      <div className="space-y-5">
        {/* Display name */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-kula-700 dark:text-kula-300">
            Display name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            dir="auto"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={80}
            placeholder="Your name"
            autoFocus
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2.5 text-sm text-kula-900 placeholder:text-kula-400 focus:border-kula-400 focus:outline-none dark:text-kula-100"
          />
        </div>

        {/* Username */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-kula-700 dark:text-kula-300">
            Username <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-kula-400">
              @
            </span>
            <input
              type="text"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
              }
              maxLength={30}
              placeholder="yourname"
              className={`w-full rounded-xl border bg-[var(--surface-raised)] py-2.5 pl-7 pr-3 text-sm text-kula-900 focus:outline-none dark:text-kula-100 ${
                usernameError
                  ? 'border-red-400 focus:border-red-400'
                  : 'border-[var(--border)] focus:border-kula-400'
              }`}
            />
            {checkingUsername && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                <Spinner size="sm" />
              </span>
            )}
          </div>
          {usernameError ? (
            <p className="mt-1.5 text-xs text-red-500">{usernameError}</p>
          ) : username && !checkingUsername ? (
            <p className="mt-1.5 text-xs text-kula-400 dark:text-kula-600">
              Your profile will be at /u/{username}
            </p>
          ) : null}
        </div>

        {/* Bio */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-kula-700 dark:text-kula-300">
            Bio <span className="text-xs font-normal text-kula-400">(optional)</span>
          </label>
          <textarea
            dir="auto"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            maxLength={280}
            placeholder="Where you learn, what you learn, or anything else."
            className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2.5 text-sm text-kula-900 placeholder:text-kula-400 focus:border-kula-400 focus:outline-none dark:text-kula-100"
          />
          <p className="mt-1 text-right text-xs text-kula-400 dark:text-kula-600">
            {bio.length}/280
          </p>
        </div>
      </div>
    </StepShell>
  )
}

// ── Step 3: Daily cycles ──────────────────────────────────────────────────────

function Step3DailyCycles({
  initialCycles,
  onNext,
  onSkip,
}: {
  initialCycles: string[]
  onNext: (cycles: string[]) => Promise<void>
  onSkip: () => void
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialCycles))
  const [saving, setSaving] = useState(false)

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleNext = async () => {
    setSaving(true)
    try {
      await onNext(Array.from(selected))
    } finally {
      setSaving(false)
    }
  }

  return (
    <StepShell
      heading="Daily learning cycles."
      subheading="Which cycles do you follow? We'll show these on your Today page. You can change this anytime in Settings."
      actions={
        <>
          <PrimaryButton onClick={() => void handleNext()} loading={saving}>
            Next →
          </PrimaryButton>
          <SecondaryButton onClick={onSkip}>Skip for now</SecondaryButton>
        </>
      }
    >
      <div className="space-y-2">
        {CYCLE_OPTIONS.map((option) => {
          const checked = selected.has(option.id)
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
    </StepShell>
  )
}

// ── Step 4: Currently learning ────────────────────────────────────────────────

function Step4Learning({
  onNext,
  onSkip,
}: {
  onNext: () => void
  onSkip: () => void
}) {
  const { data: userSefarim } = useUserSefarim()
  const addSefer = useAddUserSefer()
  const removeSefer = useRemoveUserSefer()
  const [query, setQuery] = useState('')

  const allItems = useMemo(() => getPickerItems(), [])

  const filtered = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return allItems
      .filter(
        (item) =>
          item.english.toLowerCase().includes(q) ||
          (item.hebrew ?? '').toLowerCase().includes(q),
      )
      .slice(0, 8)
  }, [query, allItems])

  const activeSefarim = useMemo(
    () => (userSefarim ?? []).filter((s) => s.status === 'active'),
    [userSefarim],
  )
  const existingIds = useMemo(
    () => new Set((userSefarim ?? []).map((s) => s.sefer_id)),
    [userSefarim],
  )

  const handleAdd = (english: string, hebrew?: string) => {
    if (existingIds.has(english)) return
    addSefer.mutate({
      seferId: english,
      seferLabelEn: english,
      seferLabelHe: hebrew ?? null,
    })
    setQuery('')
  }

  return (
    <StepShell
      heading="What are you learning?"
      subheading="Add the sefarim you're actively working through. They'll show up on your Dashboard."
      actions={
        <>
          <PrimaryButton onClick={onNext}>Next →</PrimaryButton>
          <SecondaryButton onClick={onSkip}>Skip for now</SecondaryButton>
        </>
      }
    >
      <div className="space-y-4">
        {/* Search input */}
        <div className="relative">
          <svg
            viewBox="0 0 20 20"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-kula-400 dark:text-kula-600"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
              clipRule="evenodd"
            />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sefarim…"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] py-2.5 pl-9 pr-3 text-sm text-kula-900 placeholder:text-kula-400 focus:border-kula-400 focus:outline-none dark:text-kula-100"
          />
        </div>

        {/* Search results */}
        {filtered.length > 0 && (
          <ul className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] divide-y divide-[var(--border)]">
            {filtered.map((item) => {
              const already = existingIds.has(item.english)
              return (
                <li key={item.english}>
                  <button
                    type="button"
                    disabled={already || addSefer.isPending}
                    onClick={() => handleAdd(item.english, item.hebrew)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-overlay)] disabled:cursor-default"
                  >
                    <div>
                      <span className={`block text-sm font-medium ${already ? 'text-kula-400 dark:text-kula-600' : 'text-kula-800 dark:text-kula-200'}`}>
                        {item.english}
                      </span>
                      {item.hebrew && (
                        <span className="block text-xs text-kula-400 dark:text-kula-600" dir="rtl">
                          {item.hebrew}
                        </span>
                      )}
                    </div>
                    {already ? (
                      <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-kula-400" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 8l4 4 6-7" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-kula-400" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M8 2v12M2 8h12" />
                      </svg>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {/* Selected sefarim pills */}
        {activeSefarim.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-kula-500 dark:text-kula-500">
              Currently learning:
            </p>
            <div className="flex flex-wrap gap-2">
              {activeSefarim.map((sefer) => (
                <span
                  key={sefer.id}
                  className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-raised)] py-1 pl-3 pr-2 text-xs font-medium text-kula-700 dark:text-kula-300"
                >
                  {sefer.sefer_label_en}
                  <button
                    type="button"
                    onClick={() => removeSefer.mutate(sefer.id)}
                    disabled={removeSefer.isPending}
                    aria-label={`Remove ${sefer.sefer_label_en}`}
                    className="rounded-full p-0.5 text-kula-400 transition-colors hover:text-kula-700 dark:hover:text-kula-200"
                  >
                    <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M2 2l8 8M10 2l-8 8" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {activeSefarim.length === 0 && !query && (
          <p className="text-xs text-kula-400 dark:text-kula-600">
            Search above to add sefarim, or skip this for now.
          </p>
        )}
      </div>
    </StepShell>
  )
}

// ── Step 5: Privacy explainer ─────────────────────────────────────────────────

function Step5Privacy({ onNext }: { onNext: () => void }) {
  const points = [
    {
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
      ),
      heading: 'Private by default',
      body: 'Your notes and activity are only visible to you unless you choose to share them.',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="7" r="4" />
          <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
          <circle cx="19" cy="7" r="3" />
          <path d="M23 21v-2a3 3 0 00-2-2.83" />
        </svg>
      ),
      heading: 'Share with followers',
      body: 'You can share with followers by making individual notes or posts "followers-only."',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
        </svg>
      ),
      heading: 'Share publicly',
      body: 'You can share publicly by posting or making specific notes public.',
    },
  ]

  return (
    <StepShell
      heading="Your learning is private by default."
      actions={
        <PrimaryButton onClick={onNext}>Got it →</PrimaryButton>
      }
    >
      <div className="space-y-5">
        {points.map((pt) => (
          <div key={pt.heading} className="flex items-start gap-4">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] text-kula-500 dark:text-kula-400">
              {pt.icon}
            </div>
            <div>
              <p className="text-sm font-semibold text-kula-800 dark:text-kula-200">
                {pt.heading}
              </p>
              <p className="mt-0.5 text-sm leading-relaxed text-kula-600 dark:text-kula-400">
                {pt.body}
              </p>
            </div>
          </div>
        ))}

        <p className="pt-2 text-xs text-kula-400 dark:text-kula-600">
          You can change your default sharing settings anytime in{' '}
          <span className="font-medium">Settings → Privacy</span>.
        </p>
      </div>
    </StepShell>
  )
}

// ── Step 6: Done ──────────────────────────────────────────────────────────────

function Step6Done({
  onFinish,
}: {
  onFinish: (destination: '/today' | '/notebook') => Promise<void>
}) {
  const [loading, setLoading] = useState<string | null>(null)

  const handle = async (dest: '/today' | '/notebook') => {
    setLoading(dest)
    await onFinish(dest)
  }

  return (
    <StepShell
      heading="You're all set."
      subheading="Welcome to Kula. Start by exploring your Today page or adding your first note."
      actions={
        <>
          <PrimaryButton
            onClick={() => void handle('/today')}
            loading={loading === '/today'}
            disabled={loading !== null}
          >
            Go to Today
          </PrimaryButton>
          <SecondaryButton onClick={() => void handle('/notebook')}>
            Write your first note
          </SecondaryButton>
        </>
      }
    />
  )
}

// ── Main Onboarding page ──────────────────────────────────────────────────────

export default function Onboarding() {
  const { data: profile, isLoading } = useOwnProfile()
  const updateProfile = useUpdateProfile()
  const navigate = useNavigate()

  // Local step state — initialized from server once profile loads.
  const [step, setStep] = useState<number | null>(null)
  const [initialized, setInitialized] = useState(false)
  // Track how many optional steps the user explicitly skipped.
  const [stepsSkipped, setStepsSkipped] = useState(0)

  // Respect the stored theme preference (same key as AppShell uses).
  useEffect(() => {
    const stored = localStorage.getItem('kula-theme')
    if (stored === 'light') {
      document.documentElement.classList.remove('dark')
    } else {
      document.documentElement.classList.add('dark')
    }
  }, [])

  // Initialize step from server once profile arrives.
  useEffect(() => {
    if (profile && !initialized) {
      setStep(profile.onboarding_step ?? 1)
      setInitialized(true)
    }
  }, [profile, initialized])

  // If profile is still loading, show spinner.
  if (isLoading || step === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)]">
        <Spinner size="lg" />
      </div>
    )
  }

  // If onboarding is already complete (e.g. user navigated here directly), redirect.
  if (profile?.onboarding_completed) {
    return <Navigate to="/today" replace />
  }

  // ── Step advancement helpers ──────────────────────────────────────────────

  /** Save data + advance step in one atomic server write. */
  const saveAndAdvance = async (nextStep: number, updates: ProfileUpdate = {}) => {
    await updateProfile.mutateAsync({ ...updates, onboarding_step: nextStep })
    setStep(nextStep)
  }

  /** Advance immediately (UI) and fire-and-forget step tracking to server. */
  const advanceStep = (nextStep: number) => {
    setStep(nextStep)
    updateProfile.mutate({ onboarding_step: nextStep })
  }

  // ── Step handlers ─────────────────────────────────────────────────────────

  const handleStep1Next = () => advanceStep(2)

  const handleStep2Next = async (updates: ProfileUpdate) => {
    await saveAndAdvance(3, updates)
  }

  const handleStep3Next = async (cycles: string[]) => {
    await saveAndAdvance(4, { daily_cycles: cycles.length > 0 ? cycles : null })
  }

  const handleStep3Skip = () => { setStepsSkipped((n) => n + 1); advanceStep(4) }

  const handleStep4Next = () => advanceStep(5)
  const handleStep4Skip = () => { setStepsSkipped((n) => n + 1); advanceStep(5) }

  const handleStep5Next = () => advanceStep(6)

  const handleDone = async (destination: '/today' | '/notebook') => {
    await updateProfile.mutateAsync({ onboarding_completed: true, onboarding_step: 6 })
    track('onboarding_completed', { steps_skipped: stepsSkipped })
    navigate(destination, { replace: true })
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col bg-[var(--app-bg)]">
      {/* Top bar */}
      <div className="border-b border-[var(--border)] px-6 py-4">
        <Logo />
      </div>

      {/* Content */}
      <div className="flex flex-1 items-start justify-center px-6 py-12 md:items-center">
        <div className="w-full max-w-md space-y-10">
          {/* Progress indicator — hidden on step 1 (welcome) */}
          {step > 1 && (
            <ProgressIndicator step={step} total={TOTAL_STEPS} />
          )}

          {/* Step content */}
          {step === 1 && <Step1Welcome onNext={handleStep1Next} />}

          {step === 2 && profile && (
            <Step2Profile
              initialDisplayName={profile.display_name}
              initialUsername={profile.username}
              initialBio={profile.bio}
              profileId={profile.id}
              onNext={handleStep2Next}
            />
          )}

          {step === 3 && (
            <Step3DailyCycles
              initialCycles={profile?.daily_cycles ?? []}
              onNext={handleStep3Next}
              onSkip={handleStep3Skip}
            />
          )}

          {step === 4 && (
            <Step4Learning onNext={handleStep4Next} onSkip={handleStep4Skip} />
          )}

          {step === 5 && <Step5Privacy onNext={handleStep5Next} />}

          {step === 6 && <Step6Done onFinish={handleDone} />}
        </div>
      </div>
    </div>
  )
}
