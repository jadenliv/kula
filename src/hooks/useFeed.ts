import { useQuery } from '@tanstack/react-query'
import { getFeedItems } from '../services/feed'
import { useAuth } from '../context/AuthContext'

export function useFeed() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['feed'],
    queryFn: getFeedItems,
    enabled: Boolean(user),
    // Feed is time-sensitive — refresh every 2 minutes while the tab is open.
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 2,
  })
}
