import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useZmanim } from '../../hooks/useZmanim'
import { useLocation } from '../../context/LocationContext'
import { type ZmanimTimes } from '../../services/hebcal'
import { LocationPicker } from './LocationPicker'

// ── Zman order ────────────────────────────────────────────────────────────────

const ZMANIM_ORDER: { key: keyof ZmanimTimes; label: string }[] = [
  { key: 'alotHaShachar', label: 'Alot HaShachar' },
  { key: 'misheyakir', label: 'Misheyakir' },
  { key: 'sunrise', label: 'Netz HaChama' },
  { key: 'sofZmanShmaMGA', label: 'Shema (MGA)' },
  { key: 'sofZmanShma', label: 'Shema (GRA)' },
  { key: 'sofZmanTfillaMGA', label: 'Tefila (MGA)' },
  { key: 'sofZmanTfilla', label: 'Tefila (GRA)' },
  { key: 'chatzot', label: 'Chatzot' },
  { key: 'minchaGedola', label: 'Mincha Gedola' },
  { key: 'minchaKetana', label: 'Mincha Ketana' },
  { key: 'plagHaMincha', label: 'Plag HaMincha' },
  { key: 'sunset', label: 'Shkia' },
  { key: 'tzeit7083deg', label: 'Tzet HaKochavim' },
  { key: 'tzeitRT', label: 'Tzet Rabbeinu Tam' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function formatCountdown(ms: number): string {
  const totalMin = Math.floor(ms / 60000)
  if (totalMin < 1) return 'now'
  if (totalMin < 60) return `in ${totalMin}m`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return m === 0 ? `in ${h}h` : `in ${h}h ${m}m`
}

type NextZman = { label: string; timeMs: number; timeStr: string } | null

function findNextZman(times: ZmanimTimes): NextZman {
  const now = Date.now()
  for (const { key, label } of ZMANIM_ORDER) {
    const t = times[key]
    if (t) {
      const ms = new Date(t).getTime()
      if (ms > now) return { label, timeMs: ms, timeStr: formatTime(t) }
    }
  }
  return null
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ZemanimBar() {
  const { location, isDetecting } = useLocation()
  const { data, isLoading } = useZmanim()
  const navigate = useNavigate()
  const [pickerOpen, setPickerOpen] = useState(false)
  // Tick every 30 s so countdown and "next" pointer stay current
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  const next = data ? findNextZman(data.times) : null
  const msUntil = next ? next.timeMs - Date.now() : null

  // ── content ────────────────────────────────────────────────────────────────

  const content = (() => {
    if (isDetecting) {
      return (
        <span className="text-xs text-kula-500 dark:text-kula-500">
          Detecting location…
        </span>
      )
    }
    if (!location) {
      return (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="text-xs text-kula-500 hover:text-kula-700 dark:text-kula-400 dark:hover:text-kula-200"
        >
          Set location for zmanim →
        </button>
      )
    }
    if (isLoading) {
      return (
        <span className="animate-pulse text-xs text-kula-400 dark:text-kula-600">
          Loading zmanim…
        </span>
      )
    }
    if (!next) {
      return (
        <span className="text-xs text-kula-400 dark:text-kula-600">
          Day complete
        </span>
      )
    }
    return (
      <button
        type="button"
        onClick={() => navigate('/today')}
        className="flex min-w-0 items-center gap-1.5 text-left"
        title="View all zmanim"
      >
        <span className="shrink-0 text-xs text-kula-400 dark:text-kula-600">Next:</span>
        <span className="truncate text-xs font-medium text-kula-700 dark:text-kula-300">
          {next.label}
        </span>
        <span className="shrink-0 text-xs text-kula-400 dark:text-kula-600">·</span>
        <span className="shrink-0 text-xs text-kula-600 dark:text-kula-400">
          {next.timeStr}
        </span>
        {/* Countdown — hidden on medium screens, visible on large */}
        {msUntil !== null && (
          <span className="hidden shrink-0 text-xs text-kula-400 dark:text-kula-600 lg:inline">
            ({formatCountdown(msUntil)})
          </span>
        )}
      </button>
    )
  })()

  return (
    <div className="relative flex min-w-0 flex-1 items-center gap-1.5">
      {/* Location pin — only shown when we have a location */}
      {location && (
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          title={`Location: ${location.label}`}
          className="shrink-0 rounded p-1 text-kula-400 transition-colors hover:text-kula-600 dark:text-kula-600 dark:hover:text-kula-300"
        >
          <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.976.544l.062.029.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}

      <div className="min-w-0 flex-1 truncate">{content}</div>

      {pickerOpen && (
        <div className="absolute right-0 top-full z-50 mt-1">
          <LocationPicker onClose={() => setPickerOpen(false)} />
        </div>
      )}
    </div>
  )
}
