import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useToggleTaskStatus, useDeleteTask, useTasks } from '@/hooks/useTasks'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'
import type { Task } from '@/types'
import toast from 'react-hot-toast'

const priorityBadgeVariant = {
  low: 'info' as const,
  medium: 'warning' as const,
  high: 'danger' as const,
}

const priorityDot = {
  low: 'bg-sky-400',
  medium: 'bg-amber-400',
  high: 'bg-red-400',
}

const statusLabel = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' }

function formatDayHeading(dateStr: string): { weekday: string; full: string; isToday: boolean } {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const today = new Date()
  const isToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()

  return {
    weekday: date.toLocaleDateString('en-US', { weekday: 'long' }),
    full: date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    isToday,
  }
}

interface DayTaskRowProps {
  task: Task
  onDetail: (id: string) => void
}

function DayTaskRow({ task, onDetail }: DayTaskRowProps) {
  const { mutate: toggleStatus } = useToggleTaskStatus()
  const { mutate: deleteTask } = useDeleteTask()
  const { openTaskForm } = useUIStore()
  const isDone = task.status === 'done'

  const handleToggle = () => {
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
    deleteTask(task.id, {
      onSuccess: () => toast.success('Task deleted'),
      onError: () => toast.error('Failed to delete task'),
    })
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      className={cn(
        'group flex items-start gap-3 rounded-xl border p-3 transition-all duration-200',
        isDone
          ? 'border-surface-border bg-surface opacity-60'
          : 'border-surface-border bg-surface-card hover:border-zinc-700'
      )}
    >
      {/* Priority dot + complete toggle */}
      <div className="flex flex-col items-center gap-1.5 pt-0.5">
        <div className={cn('h-2 w-2 rounded-full flex-shrink-0', priorityDot[task.priority])} />
        <button
          onClick={handleToggle}
          className={cn(
            'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200',
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
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <button
          onClick={() => onDetail(task.id)}
          className="text-left w-full"
        >
          <p className={cn('text-sm font-medium leading-snug', isDone ? 'text-zinc-500 line-through' : 'text-zinc-100 hover:text-brand-400 transition-colors')}>
            {task.title}
          </p>
          {task.description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">{task.description}</p>
          )}
        </button>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <Badge variant={priorityBadgeVariant[task.priority]} className="text-[10px]">
            {task.priority}
          </Badge>
          <span className="inline-flex items-center rounded-full bg-surface px-2 py-0.5 text-[10px] font-medium text-zinc-500">
            {statusLabel[task.status]}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={() => openTaskForm(task.id)}
          className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-surface-elevated hover:text-zinc-300"
          aria-label="Edit task"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={handleDelete}
          className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
          aria-label="Delete task"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </motion.div>
  )
}

export function DayPanel() {
  const {
    calendarDayPanelOpen,
    calendarSelectedDay,
    closeCalendarDayPanel,
    openTaskForm,
    openTaskDetail,
  } = useUIStore()

  const { data: tasks = [] } = useTasks()

  const dayTasks = calendarSelectedDay
    ? tasks.filter((t) => t.dueDate === calendarSelectedDay)
    : []

  const pending = dayTasks.filter((t) => t.status !== 'done')
  const completed = dayTasks.filter((t) => t.status === 'done')

  const heading = calendarSelectedDay ? formatDayHeading(calendarSelectedDay) : null

  const handleAddTask = () => {
    if (calendarSelectedDay) {
      openTaskForm(undefined, calendarSelectedDay)
    }
  }

  return (
    <AnimatePresence>
      {calendarDayPanelOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={closeCalendarDayPanel}
          />

          {/* Slide-over */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[100vw] flex-col border-l border-surface-border bg-surface-card shadow-2xl sm:max-w-sm md:max-w-md"
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-surface-border px-5 py-4">
              <div>
                {heading && (
                  <>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold text-zinc-100">{heading.weekday}</h2>
                      {heading.isToday && (
                        <span className="rounded-full bg-brand-500/20 px-2 py-0.5 text-xs font-medium text-brand-400">
                          Today
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-500">{heading.full}</p>
                  </>
                )}
              </div>
              <button
                onClick={closeCalendarDayPanel}
                className="rounded-lg p-1 text-zinc-400 transition-colors hover:bg-surface-elevated hover:text-zinc-100"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Summary bar */}
            <div className="flex items-center gap-4 border-b border-surface-border bg-surface px-5 py-2.5">
              <span className="text-xs text-zinc-500">
                <span className="font-semibold text-zinc-300">{pending.length}</span> pending
              </span>
              <span className="text-xs text-zinc-500">
                <span className="font-semibold text-emerald-400">{completed.length}</span> completed
              </span>
              <div className="ml-auto">
                <Button variant="primary" size="sm" onClick={handleAddTask}>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Task
                </Button>
              </div>
            </div>

            {/* Task list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {dayTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-elevated">
                    <svg className="h-6 w-6 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-zinc-400">No tasks for this day</p>
                  <p className="mt-1 text-xs text-zinc-600">Click "Add Task" to schedule something here.</p>
                </div>
              ) : (
                <>
                  {/* Pending tasks */}
                  {pending.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-600">
                        Pending · {pending.length}
                      </p>
                      <div className="space-y-2">
                        <AnimatePresence>
                          {pending.map((task) => (
                            <DayTaskRow key={task.id} task={task} onDetail={openTaskDetail} />
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}

                  {/* Completed tasks */}
                  {completed.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-600">
                        Completed · {completed.length}
                      </p>
                      <div className="space-y-2">
                        <AnimatePresence>
                          {completed.map((task) => (
                            <DayTaskRow key={task.id} task={task} onDetail={openTaskDetail} />
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-surface-border px-5 py-3">
              <Button variant="secondary" size="sm" className="w-full" onClick={closeCalendarDayPanel}>
                Close
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
