/**
 * useStreak — derives the current and longest learning streak from the
 * completions cache that is already fetched by useCompletions().
 *
 * A "streak day" is any local-calendar day on which the user marked at least
 * one section as learned. Streaks are counted in the user's local timezone so
 * "today" always matches what they see on the screen.
 *
 * Streak rules:
 *   - The streak is still alive if the user has learned today OR yesterday.
 *     (Yesterday is included so a streak doesn't appear broken the moment the
 *      clock ticks past midnight before the user has opened the app.)
 *   - The streak breaks once neither today nor yesterday has any completions.
 */

import { useMemo } from 'react'
import { useCompletions } from './useCompletions'
import type { Completion } from '../services/completions'

export type StreakResult = {
  /** Consecutive days ending today (or yesterday if nothing today yet). */
  current: number
  /** Longest consecutive-day run ever. */
  longest: number
  /** True if the user has already checked off something today. */
  learnedToday: boolean
  /** True while completions are still loading. */
  isLoading: boolean
}

// Format a Date as YYYY-MM-DD in the user's local timezone.
// en-CA locale reliably produces this format across all browsers.
function toLocalDateStr(date: Date): string {
  return date.toLocaleDateString('en-CA')
}

function calcStreak(completions: Completion[]): Omit<StreakResult, 'isLoading'> {
  if (completions.length === 0) {
    return { current: 0, longest: 0, learnedToday: false }
  }

  // Collapse completions to a Set of unique local date strings.
  const daySet = new Set(
    completions.map((c) => toLocalDateStr(new Date(c.completed_at))),
  )

  const todayStr = toLocalDateStr(new Date())
  const yesterdayStr = toLocalDateStr(new Date(Date.now() - 86_400_000))

  const learnedToday = daySet.has(todayStr)

  // ── Current streak ─────────────────────────────────────────────────────────
  // Walk backwards from today (or yesterday if today has nothing yet).
  const anchorStr = learnedToday ? todayStr : yesterdayStr
  let current = 0

  if (daySet.has(anchorStr)) {
    let cursor = new Date(anchorStr + 'T12:00:00')
    while (daySet.has(toLocalDateStr(cursor))) {
      current++
      cursor = new Date(cursor.getTime() - 86_400_000)
    }
  }

  // ── Longest streak ─────────────────────────────────────────────────────────
  // Sort all days chronologically and find the longest consecutive run.
  const sortedDays = [...daySet].sort()
  let longest = 0
  let run = 0

  for (let i = 0; i < sortedDays.length; i++) {
    if (i === 0) {
      run = 1
    } else {
      const prev = new Date(sortedDays[i - 1] + 'T12:00:00')
      const curr = new Date(sortedDays[i] + 'T12:00:00')
      // Round to handle DST transitions (spring-forward/fall-back edge cases).
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86_400_000)
      run = diffDays === 1 ? run + 1 : 1
    }
    if (run > longest) longest = run
  }

  return { current, longest, learnedToday }
}

export function useStreak(): StreakResult {
  const { data: completions, isLoading } = useCompletions()

  const result = useMemo(
    () => calcStreak(completions ?? []),
    [completions],
  )

  return { ...result, isLoading }
}
