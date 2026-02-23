import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/AuthProvider'
import type { Task, TaskFormValues, TaskStatus, RecurrenceDay } from '@/types'

export const TASKS_QUERY_KEY = 'tasks'
export const SHARED_TASKS_KEY = 'shared-tasks'

function mapRow(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    title: row.title as string,
    description: (row.description as string) ?? null,
    dueDate: (row.due_date as string) ?? null,
    startTime: (row.start_time as string) ?? null,
    endTime: (row.end_time as string) ?? null,
    isRecurring: (row.is_recurring as boolean) ?? false,
    recurrenceDays: ((row.recurrence_days as string[]) ?? []) as RecurrenceDay[],
    recurrenceEndDate: (row.recurrence_end_date as string) ?? null,
    priority: row.priority as Task['priority'],
    status: row.status as Task['status'],
    completedAt: (row.completed_at as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    isShared: false,
  }
}

// ─── useOwnTasks — tasks owned by the current user ───────────────────────────
export function useOwnTasks() {
  const { user } = useAuth()

  return useQuery({
    queryKey: [TASKS_QUERY_KEY, user?.id],
    queryFn: async (): Promise<Task[]> => {
      if (!user) return []
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []).map(mapRow)
    },
    enabled: !!user,
  })
}

// ─── useSharedTasksQuery — tasks shared with the user via accepted task_invites
export function useSharedTasksQuery() {
  const { user } = useAuth()

  return useQuery({
    queryKey: [SHARED_TASKS_KEY, user?.id],
    queryFn: async (): Promise<Task[]> => {
      if (!user) return []

      const { data, error } = await supabase
        .from('task_invites')
        .select(`
          id,
          inviter_id,
          tasks (
            id,
            user_id,
            title,
            description,
            due_date,
            start_time,
            end_time,
            is_recurring,
            recurrence_days,
            recurrence_end_date,
            priority,
            status,
            completed_at,
            created_at,
            updated_at
          )
        `)
        .eq('invitee_id', user.id)
        .eq('status', 'accepted')

      if (error) throw error

      return ((data as Record<string, unknown>[]) ?? [])
        .filter((row) => row.tasks != null)
        .map((row) => {
          const task = row.tasks as Record<string, unknown>
          return {
            id: task.id as string,
            userId: task.user_id as string,
            title: task.title as string,
            description: (task.description as string) ?? null,
            dueDate: (task.due_date as string) ?? null,
            startTime: (task.start_time as string) ?? null,
            endTime: (task.end_time as string) ?? null,
            isRecurring: (task.is_recurring as boolean) ?? false,
            recurrenceDays: ((task.recurrence_days as string[]) ?? []) as RecurrenceDay[],
            recurrenceEndDate: (task.recurrence_end_date as string) ?? null,
            priority: task.priority as Task['priority'],
            status: task.status as Task['status'],
            completedAt: (task.completed_at as string) ?? null,
            createdAt: task.created_at as string,
            updatedAt: task.updated_at as string,
            isShared: true,
            inviterName: null,
            inviterEmail: null,
            taskInviteId: row.id as string,
          } satisfies Task
        })
    },
    enabled: !!user,
  })
}

// ─── useTasks — merged owned + accepted shared tasks (deduped) ────────────────
export function useTasks() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const ownQuery = useOwnTasks()
  const sharedQuery = useSharedTasksQuery()

  // Realtime: when a task_invite row changes for this user (e.g. they just
  // accepted one), immediately invalidate the shared-tasks cache so the task
  // appears without a page reload.
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`task_invites_for_user:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'task_invites',
          filter: `invitee_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: [SHARED_TASKS_KEY, user.id] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, queryClient])

  const ownTasks = ownQuery.data ?? []
  const sharedTasks = sharedQuery.data ?? []

  // Deduplicate: own tasks take precedence over shared copies of the same task
  const ownIds = new Set(ownTasks.map((t) => t.id))
  const uniqueShared = sharedTasks.filter((t) => !ownIds.has(t.id))

  const allTasks = [...ownTasks, ...uniqueShared].sort((a, b) => {
    // Sort: tasks with due dates first (ascending), then by created_at desc
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
    if (a.dueDate) return -1
    if (b.dueDate) return 1
    return b.createdAt.localeCompare(a.createdAt)
  })

  return {
    data: allTasks,
    isLoading: ownQuery.isLoading || sharedQuery.isLoading,
    isError: ownQuery.isError || sharedQuery.isError,
    error: ownQuery.error ?? sharedQuery.error,
    refetch: () => {
      ownQuery.refetch()
      sharedQuery.refetch()
    },
  }
}

export function useCreateTask() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: TaskFormValues) => {
      if (!user) throw new Error('Not authenticated')

      // Build the insert payload — only include new time/recurrence fields
      // when they have actual values, so the request works even if the
      // migration hasn't been applied yet (graceful degradation).
      const payload: Record<string, unknown> = {
        user_id: user.id,
        title: values.title,
        description: values.description || null,
        due_date: values.dueDate || null,   // empty string → null
        priority: values.priority,
        status: values.status,
      }

      if (values.startTime) payload.start_time = values.startTime
      if (values.endTime) payload.end_time = values.endTime
      if (values.isRecurring) {
        payload.is_recurring = true
        payload.recurrence_days = values.recurrenceDays ?? []
        if (values.recurrenceEndDate) payload.recurrence_end_date = values.recurrenceEndDate
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert(payload)
        .select()
        .single()

      if (error) throw error
      return mapRow(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY, user?.id] })
    },
  })
}

export function useUpdateTask() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<TaskFormValues> }) => {
      if (!user) throw new Error('Not authenticated')
      const { data, error } = await supabase
        .from('tasks')
        .update({
          ...(values.title !== undefined && { title: values.title }),
          ...(values.description !== undefined && { description: values.description || null }),
          ...(values.dueDate !== undefined && { due_date: values.dueDate || null }),
          ...(values.startTime !== undefined && { start_time: values.startTime || null }),
          ...(values.endTime !== undefined && { end_time: values.endTime || null }),
          ...(values.isRecurring !== undefined && { is_recurring: values.isRecurring }),
          ...(values.recurrenceDays !== undefined && { recurrence_days: values.recurrenceDays }),
          ...(values.recurrenceEndDate !== undefined && { recurrence_end_date: values.recurrenceEndDate || null }),
          ...(values.priority !== undefined && { priority: values.priority }),
          ...(values.status !== undefined && { status: values.status }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error
      return mapRow(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY, user?.id] })
    },
  })
}

export function useToggleTaskStatus() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: TaskStatus }) => {
      if (!user) throw new Error('Not authenticated')
      const newStatus: TaskStatus = currentStatus === 'done' ? 'todo' : 'done'
      const { data, error } = await supabase
        .from('tasks')
        .update({
          status: newStatus,
          completed_at: newStatus === 'done' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error
      return mapRow(data)
    },
    onMutate: async ({ id, currentStatus }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: [TASKS_QUERY_KEY, user?.id] })
      const previous = queryClient.getQueryData<Task[]>([TASKS_QUERY_KEY, user?.id])
      queryClient.setQueryData<Task[]>([TASKS_QUERY_KEY, user?.id], (old) =>
        old?.map((t) =>
          t.id === id
            ? { ...t, status: currentStatus === 'done' ? 'todo' : 'done' }
            : t
        )
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData([TASKS_QUERY_KEY, user?.id], context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY, user?.id] })
    },
  })
}

export function useDeleteTask() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY, user?.id] })
    },
  })
}
