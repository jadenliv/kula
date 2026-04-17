import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  deleteSession,
  endSession,
  listSessions,
  startSession,
} from '../services/sessions'
import { useAuth } from '../context/AuthContext'
import { useTimer } from '../context/TimerContext'

export const SESSIONS_KEY = ['sessions'] as const

export function useSessions() {
  const { user } = useAuth()
  return useQuery({
    queryKey: SESSIONS_KEY,
    queryFn: listSessions,
    enabled: Boolean(user),
    staleTime: 1000 * 60,
    refetchOnWindowFocus: false,
  })
}

export function useStartSession() {
  const queryClient = useQueryClient()
  const { setActiveSession } = useTimer()

  return useMutation({
    mutationFn: startSession,
    onSuccess: (session) => {
      setActiveSession(session)
      void queryClient.invalidateQueries({ queryKey: SESSIONS_KEY })
    },
  })
}

export function useEndSession() {
  const queryClient = useQueryClient()
  const { setActiveSession } = useTimer()

  return useMutation({
    mutationFn: endSession,
    onSuccess: () => {
      setActiveSession(null)
      void queryClient.invalidateQueries({ queryKey: SESSIONS_KEY })
    },
  })
}

export function useDeleteSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteSession,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SESSIONS_KEY })
    },
  })
}
