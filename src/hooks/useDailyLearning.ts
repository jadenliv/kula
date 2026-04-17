import { useQuery } from '@tanstack/react-query'
import { fetchDailyLearning, type HebCalEvent } from '../services/hebcal'

const msUntilMidnight = () => {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  return midnight.getTime() - now.getTime()
}

/**
 * Fetches today's daily learning schedule (Daf Yomi, Yerushalmi, Mishna,
 * Rambam, and the current Parashat HaShavuah). Stale until midnight.
 */
export function useDailyLearning() {
  return useQuery<HebCalEvent[]>({
    queryKey: ['daily-learning'],
    queryFn: fetchDailyLearning,
    staleTime: msUntilMidnight(),
    gcTime: msUntilMidnight() + 60_000,
  })
}
