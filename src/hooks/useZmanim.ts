import { useQuery } from '@tanstack/react-query'
import { fetchZmanim, type ZmanimResponse } from '../services/hebcal'
import { useLocation } from '../context/LocationContext'

/**
 * Fetches today's zmanim for the current location.
 * Stale time = until end of day — zmanim don't change within a day.
 */
export function useZmanim() {
  const { location } = useLocation()

  const msUntilMidnight = () => {
    const now = new Date()
    const midnight = new Date(now)
    midnight.setHours(24, 0, 0, 0)
    return midnight.getTime() - now.getTime()
  }

  return useQuery<ZmanimResponse>({
    queryKey: ['zmanim', location?.lat, location?.lng, location?.tzid],
    queryFn: () => fetchZmanim(location!.lat, location!.lng, location!.tzid),
    enabled: Boolean(location),
    staleTime: msUntilMidnight(),
    gcTime: msUntilMidnight() + 60_000,
  })
}
