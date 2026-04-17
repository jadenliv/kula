import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listNotifications,
  getUnreadCount,
  markAllRead,
  markOneRead,
} from '../services/notifications'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const notificationsKey = ['notifications'] as const
const unreadKey = ['notifications', 'unread'] as const

// ── Queries ───────────────────────────────────────────────────────────────────

export function useNotifications() {
  const { user } = useAuth()
  return useQuery({
    queryKey: notificationsKey,
    queryFn: listNotifications,
    enabled: Boolean(user),
    staleTime: 1000 * 30,
  })
}

export function useUnreadCount() {
  const { user } = useAuth()
  return useQuery({
    queryKey: unreadKey,
    queryFn: getUnreadCount,
    enabled: Boolean(user),
    staleTime: 1000 * 30,
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useMarkAllRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: markAllRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationsKey })
      queryClient.setQueryData(unreadKey, 0)
    },
  })
}

export function useMarkOneRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => markOneRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationsKey })
      void queryClient.invalidateQueries({ queryKey: unreadKey })
    },
  })
}

// ── Realtime subscription ─────────────────────────────────────────────────────

/**
 * Subscribe to new notifications via Supabase Realtime so the bell badge
 * updates live without polling. Call this once near the root of the app.
 */
export function useNotificationSubscription() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: notificationsKey })
          void queryClient.invalidateQueries({ queryKey: unreadKey })
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [user, queryClient])
}
