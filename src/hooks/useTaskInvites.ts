import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/AuthProvider'
import type { Task, TaskInvite, TaskInviteStatus, TaskInviteWithInvitee } from '@/types'

const TASK_INVITES_KEY = 'task-invites'
const SHARED_TASKS_KEY = 'shared-tasks'
const TASKS_KEY = 'tasks'
const NOTIFICATIONS_KEY = 'notifications'

function mapTaskInviteRow(row: Record<string, unknown>): TaskInvite {
  return {
    id: row.id as string,
    taskId: row.task_id as string,
    inviterId: row.inviter_id as string,
    inviteeId: row.invitee_id as string,
    status: row.status as TaskInviteStatus,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

// ─── useTaskInvites — all invites sent/received by current user ───────────────
export function useTaskInvites() {
  const { user } = useAuth()

  return useQuery({
    queryKey: [TASK_INVITES_KEY, user?.id],
    queryFn: async (): Promise<TaskInvite[]> => {
      if (!user) return []
      const { data, error } = await supabase
        .from('task_invites')
        .select('*')
        .or(`inviter_id.eq.${user.id},invitee_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (error) throw error
      return ((data as Record<string, unknown>[]) ?? []).map(mapTaskInviteRow)
    },
    enabled: !!user,
  })
}

// ─── useSharedTasks — tasks shared with current user that they accepted ────────
export function useSharedTasks() {
  const { user } = useAuth()

  return useQuery({
    queryKey: [SHARED_TASKS_KEY, user?.id],
    queryFn: async (): Promise<Task[]> => {
      if (!user) return []

      // Join task_invites → tasks → inviter profile + auth.users for email
      // We use a raw select with joins via Supabase's PostgREST syntax
      const { data, error } = await supabase
        .from('task_invites')
        .select(`
          id,
          status,
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
        .in('status', ['accepted'])

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
            recurrenceDays: ((task.recurrence_days as string[]) ?? []) as Task['recurrenceDays'],
            recurrenceEndDate: (task.recurrence_end_date as string) ?? null,
            recurrenceGroupId: (task.recurrence_group_id as string) ?? null,
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

// ─── useSendTaskInvites — send invites to multiple friends for a task ─────────
export function useSendTaskInvites() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      taskId,
      inviteeIds,
    }: {
      taskId: string
      inviteeIds: string[]
    }) => {
      if (!user) throw new Error('Not authenticated')
      if (inviteeIds.length === 0) return []

      // Insert all task_invites
      const inviteRows = inviteeIds.map((inviteeId) => ({
        task_id: taskId,
        inviter_id: user.id,
        invitee_id: inviteeId,
        status: 'pending',
      }))

      const { data: invites, error: inviteErr } = await supabase
        .from('task_invites')
        .insert(inviteRows)
        .select()

      if (inviteErr) throw inviteErr

      // Insert notifications for each invitee
      const notifRows = (invites as Record<string, unknown>[]).map((invite) => ({
        user_id: invite.invitee_id as string,
        actor_id: user.id,
        type: 'task_invite',
        reference_id: invite.id as string,
        read: false,
      }))

      const { error: notifErr } = await supabase
        .from('notifications')
        .insert(notifRows)

      if (notifErr) throw notifErr

      return invites
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TASK_INVITES_KEY, user?.id] })
    },
  })
}

// ─── useLeaveTask — invitee removes themselves from a shared task ─────────────
export function useLeaveTask() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (taskInviteId: string) => {
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('task_invites')
        .update({ status: 'left', updated_at: new Date().toISOString() })
        .eq('id', taskInviteId)
        .eq('invitee_id', user.id) // only the invitee can leave

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TASK_INVITES_KEY, user?.id] })
      queryClient.invalidateQueries({ queryKey: [SHARED_TASKS_KEY, user?.id] })
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, user?.id] })
    },
  })
}

// ─── useRespondToTaskInvite — accept or decline a task invite ─────────────────
export function useRespondToTaskInvite() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      taskInviteId,
      status,
    }: {
      taskInviteId: string
      status: 'accepted' | 'declined'
    }) => {
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('task_invites')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', taskInviteId)
        .eq('invitee_id', user.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TASK_INVITES_KEY, user?.id] })
      queryClient.invalidateQueries({ queryKey: [SHARED_TASKS_KEY, user?.id] })
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, user?.id] })
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY, user?.id] })
    },
  })
}

// ─── Helper: get invite status for a specific task + invitee pair ─────────────
export function useTaskInviteStatus(taskId: string, inviteeId: string) {
  const { data: invites = [] } = useTaskInvites()
  return invites.find(
    (inv) => inv.taskId === taskId && inv.inviteeId === inviteeId
  )
}

// ─── useTaskInvitesForTask — all invites for a task with invitee profile info ──
export function useTaskInvitesForTask(taskId: string | null | undefined) {
  const { user } = useAuth()

  return useQuery({
    queryKey: [TASK_INVITES_KEY, 'for-task', taskId],
    queryFn: async (): Promise<TaskInviteWithInvitee[]> => {
      if (!user || !taskId) return []
      const { data, error } = await supabase.rpc('get_task_invites_with_invitee', {
        p_task_id: taskId,
      })
      if (error) throw error
      return ((data as Record<string, unknown>[]) ?? []).map((row) => ({
        id: row.invite_id as string,
        taskId: row.task_id as string,
        inviterId: row.inviter_id as string,
        inviteeId: row.invitee_id as string,
        status: row.status as TaskInviteStatus,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
        inviteeUsername: (row.invitee_username as string) ?? null,
        inviteeAvatar: (row.invitee_avatar as string) ?? null,
        inviteeEmail: row.invitee_email as string,
      }))
    },
    enabled: !!user && !!taskId,
  })
}
