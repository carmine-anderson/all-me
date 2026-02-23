import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useToggleTaskStatus, useDeleteTask } from '@/hooks/useTasks'
import { useUIStore } from '@/store/uiStore'
import { formatDueDate, cn } from '@/lib/utils'
import type { Task } from '@/types'
import toast from 'react-hot-toast'
import { useAuth } from '@/providers/AuthProvider'

interface TaskCardProps {
  task: Task
}

const priorityBadgeVariant = {
  low: 'info' as const,
  medium: 'warning' as const,
  high: 'danger' as const,
}

const statusBadgeVariant = {
  todo: 'default' as const,
  in_progress: 'brand' as const,
  done: 'success' as const,
}

const statusLabel = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
}

export const TaskCard = forwardRef<HTMLDivElement, TaskCardProps>(function TaskCard({ task }, ref) {
  const { mutate: toggleStatus } = useToggleTaskStatus()
  const { mutate: deleteTask } = useDeleteTask()
  const { openTaskForm, openTaskDetail } = useUIStore()
  const { user } = useAuth()
  const { label: dueDateLabel, isOverdue } = formatDueDate(task.dueDate)
  const isDone = task.status === 'done'
  // Only the task owner can edit/delete; shared tasks are read-only from this card
  const isOwner = task.userId === user?.id

  const handleToggle = () => {
    toggleStatus(
      { id: task.id, currentStatus: task.status },
      {
        onSuccess: () => {
          if (!isDone) toast.success('Task completed! 🎉')
        },
        onError: () => toast.error('Failed to update task'),
      }
    )
  }

  const handleDelete = () => {
    deleteTask(task.id, {
      onSuccess: () => toast.success('Task deleted'),
      onError: () => toast.error('Failed to delete task'),
    })
  }

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      onClick={() => openTaskDetail(task.id)}
      className={cn(
        'group cursor-pointer rounded-xl border bg-surface-card p-4 transition-all duration-200',
        isDone
          ? 'border-surface-border opacity-60'
          : isOverdue
            ? 'border-red-500/30 shadow-[0_0_0_1px_rgba(239,68,68,0.15)]'
            : 'border-surface-border hover:border-zinc-700'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={(e) => { e.stopPropagation(); handleToggle() }}
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

        {/* Content */}
        <div className="min-w-0 flex-1">
          <p className={cn('text-sm font-medium', isDone ? 'text-zinc-500 line-through' : 'text-zinc-100')}>
            {task.title}
          </p>
          {task.description && (
            <p className="mt-0.5 truncate text-xs text-zinc-500">{task.description}</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant={priorityBadgeVariant[task.priority]}>
              {task.priority}
            </Badge>
            <Badge variant={statusBadgeVariant[task.status]}>
              {statusLabel[task.status]}
            </Badge>
            {task.dueDate && (
              <span className={cn('text-xs', isOverdue && !isDone ? 'text-red-400' : 'text-zinc-500')}>
                {isOverdue && !isDone && '⚠ '}
                {dueDateLabel}
              </span>
            )}
          </div>
        </div>

        {/* Actions (visible on hover) — only for task owner */}
        {isOwner && (
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={(e) => { e.stopPropagation(); openTaskForm(task.id) }}
              aria-label="Edit task"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </Button>
            <Button
              variant="danger"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={(e) => { e.stopPropagation(); handleDelete() }}
              aria-label="Delete task"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  )
})
