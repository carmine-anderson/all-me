import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useToggleTaskStatus, useDeleteTask, useTasks, useCompleteAllRecurringTasks, useDeleteAllRecurringTasks } from '@/hooks/useTasks'
import { useTaskInvitesForTask, useLeaveTask } from '@/hooks/useTaskInvites'
import { useUIStore } from '@/store/uiStore'
import { useAuth } from '@/providers/AuthProvider'
import { useProfileById } from '@/hooks/useProfile'
import { formatDueDate, cn } from '@/lib/utils'
import { formatTimeRange, formatRecurrenceDays } from '@/lib/recurrence'
import type { TaskInviteWithInvitee } from '@/types'
import toast from 'react-hot-toast'
import { RecurringCompleteDialog } from '@/components/tasks/RecurringCompleteDialog'

const priorityBadgeVariant = {
  low: 'info' as const,
  medium: 'warning' as const,
  high: 'danger' as const,
}

const priorityLabel = { low: 'Low', medium: 'Medium', high: 'High' }
const statusLabel = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' }
const statusBadgeVariant = {
  todo: 'default' as const,
  in_progress: 'brand' as const,
  done: 'success' as const,
}

// ─── Participant status badge configs ─────────────────────────────────────────
const inviteStatusConfig = {
  pending:  { label: 'Awaiting', className: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20' },
  accepted: { label: 'Accepted', className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' },
  declined: { label: 'Declined', className: 'bg-red-500/15 text-red-400 border border-red-500/20' },
  left:     { label: 'Left',     className: 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/20' },
  owner:    { label: 'Owner',    className: 'bg-brand-500/15 text-brand-400 border border-brand-500/20' },
}

function getInitials(username: string | null, email: string): string {
  if (username) return username.slice(0, 2).toUpperCase()
  return email.slice(0, 2).toUpperCase()
}

// ─── Owner row ────────────────────────────────────────────────────────────────
function OwnerRow({ ownerId }: { ownerId: string }) {
  const { data: profile } = useProfileById(ownerId)
  const { user } = useAuth()
  const isCurrentUser = user?.id === ownerId
  const displayName = profile?.username
    ? profile.username
    : isCurrentUser
      ? (user?.email?.split('@')[0] ?? 'You')
      : 'Loading…'
  const email = isCurrentUser ? (user?.email ?? '') : ''
  const initials = profile?.username
    ? profile.username.slice(0, 2).toUpperCase()
    : displayName.slice(0, 2).toUpperCase()
  const cfg = inviteStatusConfig.owner

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-[10px] font-semibold text-brand-400">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-200">
          {displayName}{isCurrentUser && <span className="ml-1 text-zinc-500">(you)</span>}
        </p>
        {email && <p className="truncate text-xs text-zinc-500">{email}</p>}
      </div>
      <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium', cfg.className)}>
        {cfg.label}
      </span>
    </div>
  )
}

// ─── Invitee row ──────────────────────────────────────────────────────────────
function InviteeRow({ invite }: { invite: TaskInviteWithInvitee }) {
  const displayName = invite.inviteeUsername ?? invite.inviteeEmail.split('@')[0]
  const initials = getInitials(invite.inviteeUsername, invite.inviteeEmail)
  const cfg = inviteStatusConfig[invite.status]

  return (
    <div className="flex items-center gap-3">
      {/* Avatar */}
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-[10px] font-semibold text-zinc-400">
        {initials}
      </div>
      {/* Name + email */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-200">{displayName}</p>
        <p className="truncate text-xs text-zinc-500">{invite.inviteeEmail}</p>
      </div>
      {/* Status pill */}
      <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium', cfg.className)}>
        {cfg.label}
      </span>
    </div>
  )
}

// ─── TaskDetailPopup ──────────────────────────────────────────────────────────
export function TaskDetailPopup() {
  const { taskDetailOpen, taskDetailTaskId, closeTaskDetail, openTaskForm } = useUIStore()
  const { user } = useAuth()
  const { data: tasks = [] } = useTasks()
  const { mutate: toggleStatus } = useToggleTaskStatus()
  const { mutate: deleteTask } = useDeleteTask()
  const { mutate: completeAll } = useCompleteAllRecurringTasks()
  const { mutate: deleteAll } = useDeleteAllRecurringTasks()
  const { mutate: leaveTask, isPending: isLeaving } = useLeaveTask()

  const task = taskDetailTaskId ? tasks.find((t) => t.id === taskDetailTaskId) : null
  const isDone = task?.status === 'done'

  // Fetch invites only when the popup is open and we have a task
  const { data: invites = [], isLoading: invitesLoading } = useTaskInvitesForTask(
    taskDetailOpen ? taskDetailTaskId : null
  )
  // Only the task owner can edit/delete
  const isOwner = !!task && task.userId === user?.id
  // The current user's invite (if they are an invitee, not the owner)
  const myInvite = !isOwner
    ? invites.find((inv) => inv.inviteeId === user?.id)
    : null
  const hasLeft = myInvite?.status === 'left'
  const { label: dueDateLabel, isOverdue } = task ? formatDueDate(task.dueDate) : { label: '', isOverdue: false }

  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleToggle = () => {
    if (!task) return

    // If marking done and it's a recurring task with a group, show choice dialog
    if (!isDone && task.isRecurring && task.recurrenceGroupId) {
      setShowCompleteDialog(true)
      return
    }

    toggleStatus(
      { id: task.id, currentStatus: task.status, isShared: task.isShared },
      {
        onSuccess: () => {
          if (!isDone) toast.success('Task completed! 🎉')
          else toast.success('Task reopened')
        },
        onError: () => toast.error('Failed to update task'),
      }
    )
  }

  const handleCompleteOne = () => {
    if (!task) return
    toggleStatus(
      { id: task.id, currentStatus: task.status, isShared: task.isShared },
      {
        onSuccess: () => toast.success('Occurrence completed! 🎉'),
        onError: () => toast.error('Failed to update task'),
      }
    )
  }

  const handleCompleteAll = () => {
    if (!task?.recurrenceGroupId) return
    completeAll(
      { recurrenceGroupId: task.recurrenceGroupId },
      {
        onSuccess: () => toast.success('All occurrences completed! 🎉'),
        onError: () => toast.error('Failed to complete all occurrences'),
      }
    )
  }

  const handleDelete = () => {
    if (!task) return
    // If it's a recurring task with a group, ask which to delete
    if (task.isRecurring && task.recurrenceGroupId) {
      setShowDeleteDialog(true)
      return
    }
    deleteTask(task.id, {
      onSuccess: () => {
        toast.success('Task deleted')
        closeTaskDetail()
      },
      onError: () => toast.error('Failed to delete task'),
    })
  }

  const handleDeleteOne = () => {
    if (!task) return
    deleteTask(task.id, {
      onSuccess: () => {
        toast.success('Task deleted')
        closeTaskDetail()
      },
      onError: () => toast.error('Failed to delete task'),
    })
  }

  const handleDeleteAll = () => {
    if (!task?.recurrenceGroupId) return
    deleteAll(
      { recurrenceGroupId: task.recurrenceGroupId },
      {
        onSuccess: () => {
          toast.success('All occurrences deleted')
          closeTaskDetail()
        },
        onError: () => toast.error('Failed to delete all occurrences'),
      }
    )
  }

  const handleEdit = () => {
    if (!task) return
    closeTaskDetail()
    openTaskForm(task.id)
  }

  const handleLeave = () => {
    if (!myInvite) return
    leaveTask(myInvite.id, {
      onSuccess: () => {
        toast.success('You have left this task')
        closeTaskDetail()
      },
      onError: () => toast.error('Failed to leave task. Please try again.'),
    })
  }

  return (
    <>
      {task && (
        <>
          <RecurringCompleteDialog
            open={showCompleteDialog}
            mode="complete"
            taskTitle={task.title}
            onThisOne={handleCompleteOne}
            onAllOccurrences={handleCompleteAll}
            onClose={() => setShowCompleteDialog(false)}
          />
          <RecurringCompleteDialog
            open={showDeleteDialog}
            mode="delete"
            taskTitle={task.title}
            onThisOne={handleDeleteOne}
            onAllOccurrences={handleDeleteAll}
            onClose={() => setShowDeleteDialog(false)}
          />
        </>
      )}
      <AnimatePresence>
        {taskDetailOpen && task && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            {/* Backdrop — above DayPanel (z-50) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={closeTaskDetail}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative z-10 w-full max-w-lg rounded-2xl border border-surface-border bg-surface-card shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-surface-border px-6 py-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Complete toggle */}
                  <button
                    onClick={handleToggle}
                    className={cn(
                      'mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200',
                      isDone
                        ? 'border-brand-500 bg-brand-500'
                        : 'border-zinc-600 hover:border-brand-500'
                    )}
                    aria-label={isDone ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {isDone && (
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <h2
                    className={cn(
                      'text-base font-semibold leading-snug',
                      isDone ? 'text-zinc-500 line-through' : 'text-zinc-100'
                    )}
                  >
                    {task.title}
                  </h2>
                </div>
                <button
                  onClick={closeTaskDetail}
                  className="ml-3 flex-shrink-0 rounded-lg p-1 text-zinc-400 transition-colors hover:bg-surface-elevated hover:text-zinc-100"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div className="space-y-5 p-6">
                {/* Badges row */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant={priorityBadgeVariant[task.priority]}>
                    Priority: {priorityLabel[task.priority]}
                  </Badge>
                  <Badge variant={statusBadgeVariant[task.status]}>
                    {statusLabel[task.status]}
                  </Badge>
                </div>

                {/* Due date */}
                {task.dueDate && (
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 flex-shrink-0 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className={cn('text-sm', isOverdue && !isDone ? 'text-red-400' : 'text-zinc-400')}>
                      {isOverdue && !isDone && '⚠ Overdue · '}
                      {dueDateLabel}
                    </span>
                  </div>
                )}

                {/* Time */}
                {task.startTime && (
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 flex-shrink-0 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-zinc-400">
                      {formatTimeRange(task.startTime, task.endTime)}
                    </span>
                  </div>
                )}

                {/* Recurrence */}
                {task.isRecurring && task.recurrenceDays.length > 0 && (
                  <div className="flex items-start gap-2">
                    <svg className="h-4 w-4 flex-shrink-0 mt-0.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="text-sm text-zinc-400">
                      Every {formatRecurrenceDays(task.recurrenceDays)}
                      {task.recurrenceEndDate && (
                        <span className="text-zinc-500">
                          {' '}until{' '}
                          {new Date(task.recurrenceEndDate + 'T00:00:00').toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric',
                          })}
                        </span>
                      )}
                    </span>
                  </div>
                )}

                {/* Description */}
                {task.description ? (
                  <div>
                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-zinc-600">Description</p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">{task.description}</p>
                  </div>
                ) : (
                  <p className="text-sm italic text-zinc-600">No description provided.</p>
                )}

                {/* People — owner always shown, invitees shown when present */}
                {task && (
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-600">
                      People
                    </p>
                    <div className="flex flex-col gap-2.5">
                      {/* Owner row — always first */}
                      <OwnerRow ownerId={task.userId} />

                      {/* Invitee rows */}
                      {invitesLoading ? (
                        <div className="flex items-center gap-2 py-1">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-surface-border border-t-brand-500" />
                          <span className="text-xs text-zinc-500">Loading…</span>
                        </div>
                      ) : (
                        invites.map((invite) => (
                          <InviteeRow key={invite.id} invite={invite} />
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="rounded-lg border border-surface-border bg-surface p-3 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-600">Created</span>
                    <span className="text-zinc-400">
                      {new Date(task.createdAt).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </span>
                  </div>
                  {task.completedAt && (
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-600">Completed</span>
                      <span className="text-emerald-400">
                        {new Date(task.completedAt).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer actions */}
              <div className="flex gap-3 border-t border-surface-border px-6 py-4">
                {isOwner && (
                  <Button variant="secondary" size="sm" className="flex-1" onClick={handleEdit}>
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </Button>
                )}
                {/* Mark Complete — hidden for invitees who have left */}
                {!hasLeft && (
                  <Button variant="primary" size="sm" className="flex-1 whitespace-nowrap" onClick={handleToggle}>
                    {isDone ? (
                      <>
                        <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Reopen
                      </>
                    ) : (
                      <>
                        <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                        Mark Complete
                      </>
                    )}
                  </Button>
                )}
                {/* Leave button — only for non-owner invitees who haven't left yet */}
                {!isOwner && myInvite && !hasLeft && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1 whitespace-nowrap text-zinc-400 hover:text-red-400"
                    onClick={handleLeave}
                    loading={isLeaving}
                  >
                    <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Leave
                  </Button>
                )}
                {isOwner && (
                  <Button variant="danger" size="sm" className="h-8 w-8 p-0 flex-shrink-0" onClick={handleDelete} aria-label="Delete task">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </Button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
