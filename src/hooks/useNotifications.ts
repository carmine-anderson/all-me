import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/AuthProvider'
import type { NotificationWithActor, NotificationType } from '@/types'


const NOTIFICATIONS_KEY = 'notifications'

// ─── Map RPC row → NotificationWithActor ─────────────────────────────────────
function mapNotificationRow(row: Record<string, unknown>): NotificationWithActor {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    actorId: row.actor_id as string,
    type: row.type as NotificationType,
    referenceId: row.reference_id as string,
    read: row.read as boolean,
    createdAt: row.created_at as string,
    actorUsername: (row.actor_username as string) ?? null,
    actorAvatar: (row.actor_avatar as string) ?? null,
    actorEmail: row.actor_email as string,
  }
}

// ─── useNotifications — fetch all notifications with actor info ───────────────
export function useNotifications() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: [NOTIFICATIONS_KEY, user?.id],
    queryFn: async (): Promise<NotificationWithActor[]> => {
      if (!user) return []
      const { data, error } = await supabase.rpc('get_notifications_with_actor', {
        p_user_id: user.id,
      })
      if (error) throw error
      return ((data as Record<string, unknown>[]) ?? []).map(mapNotificationRow)
    },
    enabled: !!user,
  })

  // ── Supabase Realtime subscription for instant bell badge updates ────────────
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
          queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY, user.id] })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY, user.id] })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY, user.id] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, queryClient])

  return query
}

// ─── useUnreadCount — derived from notifications query ───────────────────────
export function useUnreadCount() {
  const { data: notifications = [] } = useNotifications()
  return notifications.filter((n) => !n.read).length
}

// ─── useMarkNotificationRead ──────────────────────────────────────────────────
export function useMarkNotificationRead() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY, user?.id] })
    },
  })
}

// ─── useMarkAllNotificationsRead ─────────────────────────────────────────────
export function useMarkAllNotificationsRead() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false)

      if (error) throw error
    },
    onMutate: async () => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: [NOTIFICATIONS_KEY, user?.id] })
      const previous = queryClient.getQueryData<NotificationWithActor[]>([
        NOTIFICATIONS_KEY,
        user?.id,
      ])
      queryClient.setQueryData<NotificationWithActor[]>(
        [NOTIFICATIONS_KEY, user?.id],
        (old) => old?.map((n) => ({ ...n, read: true })) ?? []
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData([NOTIFICATIONS_KEY, user?.id], context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY, user?.id] })
    },
  })
}

// ─── useDeleteNotification ────────────────────────────────────────────────────
export function useDeleteNotification() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id)

      if (error) throw error
    },
    onMutate: async (notificationId: string) => {
      // Optimistic update — remove from cache immediately
      await queryClient.cancelQueries({ queryKey: [NOTIFICATIONS_KEY, user?.id] })
      const previous = queryClient.getQueryData<NotificationWithActor[]>([
        NOTIFICATIONS_KEY,
        user?.id,
      ])
      queryClient.setQueryData<NotificationWithActor[]>(
        [NOTIFICATIONS_KEY, user?.id],
        (old) => old?.filter((n) => n.id !== notificationId) ?? []
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData([NOTIFICATIONS_KEY, user?.id], context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY, user?.id] })
    },
  })
}
