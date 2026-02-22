import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useToggleTaskStatus, useDeleteTask, useTasks } from '@/hooks/useTasks'
import { useTaskInvitesForTask } from '@/hooks/useTaskInvites'
import { useUIStore } from '@/store/uiStore'
import { useAuth } from '@/providers/AuthProvider'
import { formatDueDate, cn } from '@/lib/utils'
import type { TaskInviteWithInvitee } from '@/types'
import toast from 'react-hot-toast'

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

// ─── Invite status badge ──────────────────────────────────────────────────────
const inviteStatusConfig = {
  pending: { label: 'Pending', className: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20' },
  accepted: { label: 'Accepted', className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' },
  declined: { label: 'Declined', className: 'bg-red-500/15 text-red-400 border border-red-500/20' },
}

function getInitials(username: string | null, email: string): string {
  if (username) return username.slice(0, 2).toUpperCase()
  return email.slice(0, 2).toUpperCase()
}

// ─── Shared-with row ──────────────────────────────────────────────────────────
function InviteeRow({ invite }: { invite: TaskInviteWithInvitee }) {
  const displayName = invite.inviteeUsername ?? invite.inviteeEmail.split('@')[0]
  const initials = getInitials(invite.inviteeUsername, invite.inviteeEmail)
  const cfg = inviteStatusConfig[invite.status]

  return (
    <div className="flex items-center gap-3">
      {/* Avatar */}
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-[10px] font-semibold text-brand-400">
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

  const task = taskDetailTaskId ? tasks.find((t) => t.id === taskDetailTaskId) : null

  // Fetch invites only when the popup is open and we have a task
  const { data: invites = [], isLoading: invitesLoading } = useTaskInvitesForTask(
    taskDetailOpen ? taskDetailTaskId : null
  )
  const isDone = task?.status === 'done'
  // Only the task owner can edit/delete
  const isOwner = !!task && task.userId === user?.id
  const { label: dueDateLabel, isOverdue } = task ? formatDueDate(task.dueDate) : { label: '', isOverdue: false }

  const handleToggle = () => {
    if (!task) return
    toggleStatus(
      { id: task.id, currentStatus: task.status },
      {
        onSuccess: () => {
          if (!isDone) toast.success('Task completed! 🎉')
          else toast.success('Task reopened')
        },
        onError: () => toast.error('Failed to update task'),
      }
    )
  }

  const handleDelete = () => {
    if (!task) return
    deleteTask(task.id, {
      onSuccess: () => {
        toast.success('Task deleted')
        closeTaskDetail()
      },
      onError: () => toast.error('Failed to delete task'),
    })
  }

  const handleEdit = () => {
    if (!task) return
    closeTaskDetail()
    openTaskForm(task.id)
  }

  return (
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

              {/* Description */}
              {task.description ? (
                <div>
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-zinc-600">Description</p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">{task.description}</p>
                </div>
              ) : (
                <p className="text-sm italic text-zinc-600">No description provided.</p>
              )}

              {/* Shared with */}
              {(invitesLoading || invites.length > 0) && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-600">
                    Shared with
                  </p>
                  {invitesLoading ? (
                    <div className="flex items-center gap-2 py-1">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-surface-border border-t-brand-500" />
                      <span className="text-xs text-zinc-500">Loading…</span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {invites.map((invite) => (
                        <InviteeRow key={invite.id} invite={invite} />
                      ))}
                    </div>
                  )}
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
              <Button variant="primary" size="sm" className="flex-1" onClick={handleToggle}>
                {isDone ? (
                  <>
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Reopen
                  </>
                ) : (
                  <>
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                    Mark Complete
                  </>
                )}
              </Button>
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
  )
}
