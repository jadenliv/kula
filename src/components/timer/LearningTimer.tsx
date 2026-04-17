import { useRef, useState } from 'react'
import { useEndSession, useStartSession } from '../../hooks/useSessions'
import { useTimer } from '../../context/TimerContext'

const SEFER_SUGGESTIONS = [
  'Berakhot', 'Shabbat', 'Eruvin', 'Pesachim', 'Yoma', 'Sukkah', 'Beitzah',
  'Rosh Hashanah', 'Taanit', 'Megillah', 'Moed Katan', 'Chagigah',
  'Yevamot', 'Ketubot', 'Nedarim', 'Nazir', 'Sotah', 'Gittin', 'Kiddushin',
  'Bava Kamma', 'Bava Metzia', 'Bava Batra', 'Sanhedrin', 'Makkot',
  'Shevuot', 'Avodah Zarah', 'Horayot', 'Zevachim', 'Menachot',
  'Chullin', 'Bekhorot', 'Arakhin', 'Temurah', 'Keritot', 'Niddah',
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
  'Joshua', 'Judges', 'Samuel', 'Kings', 'Isaiah', 'Jeremiah', 'Ezekiel',
  'Psalms', 'Proverbs', 'Job', 'Song of Songs', 'Ruth', 'Lamentations',
  'Ecclesiastes', 'Esther', 'Daniel', 'Ezra', 'Nehemiah', 'Chronicles',
  'Mishneh Torah', 'Shulchan Arukh', 'Mishnah', 'Pirkei Avot',
]

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function LearningTimer() {
  const { activeSession, elapsedSeconds } = useTimer()
  const startSession = useStartSession()
  const endSession = useEndSession()

  const [seferInput, setSeferInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [notes, setNotes] = useState('')
  const [clockingOut, setClockingOut] = useState(false)

  const filteredSuggestions = seferInput.trim().length > 0
    ? SEFER_SUGGESTIONS.filter((s) =>
        s.toLowerCase().includes(seferInput.toLowerCase()),
      ).slice(0, 8)
    : []

  const handleClockIn = () => {
    const label = seferInput.trim() || null
    startSession.mutate({ seferRef: label, seferLabel: label })
    setSeferInput('')
  }

  const handleClockOut = () => {
    if (!activeSession) return
    setClockingOut(true)
    endSession.mutate(
      { id: activeSession.id, startedAt: activeSession.started_at, notes: notes.trim() || null },
      {
        onSettled: () => {
          setClockingOut(false)
          setNotes('')
        },
      },
    )
  }

  if (activeSession) {
    return (
      <div className="rounded-2xl border border-kula-400/30 bg-kula-600/5 p-5 dark:border-kula-400/20 dark:bg-kula-400/5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-kula-500 dark:text-kula-400">
              Session in progress
            </p>
            <p className="mt-0.5 text-sm font-medium text-kula-800 dark:text-kula-200">
              {activeSession.sefer_label ?? 'General learning'}
            </p>
          </div>
          <span className="mt-1 flex items-center gap-1.5 text-xs text-kula-500 dark:text-kula-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-kula-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-kula-500 dark:bg-kula-400" />
            </span>
            Live
          </span>
        </div>

        <div className="mb-5 text-center">
          <p className="font-mono text-5xl font-light tabular-nums tracking-tight text-kula-700 dark:text-kula-300">
            {formatElapsed(elapsedSeconds)}
          </p>
          <p className="mt-1 text-xs text-kula-400 dark:text-kula-600">
            Started at{' '}
            {new Date(activeSession.started_at).toLocaleTimeString(undefined, {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        </div>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Add notes before clocking out… (optional)"
          className="mb-3 w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-kula-900 placeholder:text-kula-400 focus:border-kula-400 focus:outline-none dark:text-kula-100 dark:placeholder:text-kula-600"
        />

        <button
          type="button"
          onClick={handleClockOut}
          disabled={clockingOut || endSession.isPending}
          className="w-full rounded-xl bg-kula-700 py-3 text-sm font-semibold text-white transition-colors hover:bg-kula-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-kula-400 dark:text-kula-950 dark:hover:bg-kula-300"
        >
          {clockingOut || endSession.isPending ? 'Saving…' : 'Clock Out'}
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-kula-500 dark:text-kula-400">
        Start a session
      </p>
      <p className="mb-4 text-sm text-kula-600 dark:text-kula-400">
        Clock in to track your learning time.
      </p>

      <div className="relative mb-3">
        <input
          ref={inputRef}
          type="text"
          value={seferInput}
          onChange={(e) => {
            setSeferInput(e.target.value)
            setShowSuggestions(true)
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder="What are you learning? (optional)"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2.5 text-sm text-kula-900 placeholder:text-kula-400 focus:border-kula-400 focus:outline-none dark:text-kula-100 dark:placeholder:text-kula-600"
        />
        {showSuggestions && filteredSuggestions.length > 0 && (
          <ul className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg">
            {filteredSuggestions.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  onMouseDown={() => {
                    setSeferInput(s)
                    setShowSuggestions(false)
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-kula-700 transition-colors hover:bg-[var(--surface-raised)] dark:text-kula-300"
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={handleClockIn}
        disabled={startSession.isPending}
        className="w-full rounded-xl bg-kula-700 py-3 text-sm font-semibold text-white transition-colors hover:bg-kula-800 disabled:opacity-50 dark:bg-kula-400 dark:text-kula-950 dark:hover:bg-kula-300"
      >
        {startSession.isPending ? 'Starting…' : 'Clock In'}
      </button>
    </div>
  )
}
