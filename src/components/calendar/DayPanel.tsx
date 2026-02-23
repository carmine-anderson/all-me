import { useRef, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { useToggleTaskStatus, useDeleteTask, useTasks, useCompleteAllRecurringTasks, useDeleteAllRecurringTasks } from '@/hooks/useTasks'
import { useUIStore } from '@/store/uiStore'
import { timeToMinutes, formatTimeRange } from '@/lib/recurrence'
import { cn } from '@/lib/utils'
import type { Task } from '@/types'
import toast from 'react-hot-toast'
import { RecurringCompleteDialog } from '@/components/tasks/RecurringCompleteDialog'

// ─── Constants ────────────────────────────────────────────────────────────────

const PX_PER_HOUR = 64   // height of each hour row in pixels
const PX_PER_MIN = PX_PER_HOUR / 60
const TOTAL_HEIGHT = PX_PER_HOUR * 24  // 1536px

const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => {
  if (i === 0) return '12 AM'
  if (i < 12) return `${i} AM`
  if (i === 12) return '12 PM'
  return `${i - 12} PM`
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function getCurrentMinutes(): number {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

// ─── Overlap layout algorithm ─────────────────────────────────────────────────
// Returns each timed task with a column index and total columns in its group.

interface LayoutTask {
  task: Task
  startMin: number
  endMin: number
  col: number
  totalCols: number
}

function computeLayout(timedTasks: Task[]): LayoutTask[] {
  if (timedTasks.length === 0) return []

  // Sort by start time
  const sorted = timedTasks
    .filter((t) => t.startTime)
    .map((t) => ({
      task: t,
      startMin: timeToMinutes(t.startTime!),
      endMin: t.endTime ? timeToMinutes(t.endTime) : timeToMinutes(t.startTime!) + 60,
    }))
    .sort((a, b) => a.startMin - b.startMin)

  // Group overlapping tasks using a sweep-line approach
  const result: LayoutTask[] = []
  let group: typeof sorted = []
  let groupEnd = -1

  const flushGroup = () => {
    if (group.length === 0) return
    const totalCols = group.length
    group.forEach((item, idx) => {
      result.push({ ...item, col: idx, totalCols })
    })
    group = []
    groupEnd = -1
  }

  for (const item of sorted) {
    if (item.startMin >= groupEnd) {
      flushGroup()
    }
    group.push(item)
    groupEnd = Math.max(groupEnd, item.endMin)
  }
  flushGroup()

  return result
}

// ─── Priority colours ─────────────────────────────────────────────────────────

const blockColors = {
  low: {
    todo: 'bg-sky-500/20 border-sky-500/40 text-sky-200',
    in_progress: 'bg-sky-500/30 border-sky-500/50 text-sky-100',
    done: 'bg-zinc-700/30 border-zinc-600/30 text-zinc-500',
  },
  medium: {
    todo: 'bg-amber-500/20 border-amber-500/40 text-amber-200',
    in_progress: 'bg-amber-500/30 border-amber-500/50 text-amber-100',
    done: 'bg-zinc-700/30 border-zinc-600/30 text-zinc-500',
  },
  high: {
    todo: 'bg-red-500/20 border-red-500/40 text-red-200',
    in_progress: 'bg-red-500/30 border-red-500/50 text-red-100',
    done: 'bg-zinc-700/30 border-zinc-600/30 text-zinc-500',
  },
}

// ─── Timed task block ─────────────────────────────────────────────────────────

interface TimelineBlockProps {
  layout: LayoutTask
  onDetail: (id: string) => void
}

function TimelineBlock({ layout, onDetail }: TimelineBlockProps) {
  const { task, startMin, endMin, col, totalCols } = layout
  const top = startMin * PX_PER_MIN
  const height = Math.max((endMin - startMin) * PX_PER_MIN, 20) // min 20px
  const widthPct = 100 / totalCols
  const leftPct = col * widthPct
  const colorClass = blockColors[task.priority][task.status]
  const isShort = height < 36

  return (
    <button
      onClick={() => onDetail(task.id)}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        left: `calc(${leftPct}% + ${col > 0 ? 2 : 0}px)`,
        width: `calc(${widthPct}% - ${col > 0 ? 2 : 1}px)`,
      }}
      className={cn(
        'absolute rounded border px-1.5 text-left transition-all duration-150 hover:brightness-125 hover:z-10',
        colorClass,
        task.status === 'done' && 'opacity-60'
      )}
      title={`${task.title}${task.startTime ? ` · ${formatTimeRange(task.startTime, task.endTime)}` : ''}`}
    >
      <p className={cn('font-medium leading-tight truncate', isShort ? 'text-[10px]' : 'text-xs')}>
        {task.status === 'done' && <span className="mr-0.5">✓</span>}
        {task.title}
      </p>
      {!isShort && task.startTime && (
        <p className="text-[10px] opacity-75 truncate">
          {formatTimeRange(task.startTime, task.endTime)}
        </p>
      )}
    </button>
  )
}

// ─── All-day task row ─────────────────────────────────────────────────────────

interface AllDayRowProps {
  task: Task
  onDetail: (id: string) => void
  onEdit: (id: string) => void
  onToggle: (task: Task) => void
  onDelete: (task: Task) => void
}

function AllDayRow({ task, onDetail, onEdit, onToggle, onDelete }: AllDayRowProps) {
  const isDone = task.status === 'done'
  const dotColor = { low: 'bg-sky-400', medium: 'bg-amber-400', high: 'bg-red-400' }

  return (
    <div
      className={cn(
        'group flex items-center gap-2 rounded-lg border px-3 py-1.5 transition-all',
        isDone
          ? 'border-surface-border bg-surface opacity-60'
          : 'border-surface-border bg-surface-card hover:border-zinc-600'
      )}
    >
      <div className={cn('h-2 w-2 flex-shrink-0 rounded-full', dotColor[task.priority])} />
      <button
        onClick={() => onDetail(task.id)}
        className={cn(
          'flex-1 truncate text-left text-xs font-medium',
          isDone ? 'text-zinc-500 line-through' : 'text-zinc-200 hover:text-brand-400'
        )}
      >
        {task.isRecurring && <span className="mr-1 opacity-60">↻</span>}
        {task.title}
      </button>
      {/* Quick actions */}
      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={() => onToggle(task)}
          className="rounded p-0.5 text-zinc-500 hover:text-emerald-400"
          title={isDone ? 'Reopen' : 'Complete'}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </button>
        <button
          onClick={() => onEdit(task.id)}
          className="rounded p-0.5 text-zinc-500 hover:text-zinc-300"
          title="Edit"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={() => onDelete(task)}
          className="rounded p-0.5 text-zinc-500 hover:text-red-400"
          title="Delete"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ─── DayPanel ─────────────────────────────────────────────────────────────────

export function DayPanel() {
  const {
    calendarDayPanelOpen,
    calendarSelectedDay,
    closeCalendarDayPanel,
    openTaskForm,
    openTaskDetail,
  } = useUIStore()

  const { data: tasks = [] } = useTasks()
  const { mutate: toggleStatus } = useToggleTaskStatus()
  const { mutate: deleteTask } = useDeleteTask()
  const { mutate: completeAll } = useCompleteAllRecurringTasks()
  const { mutate: deleteAll } = useDeleteAllRecurringTasks()

  // State for the recurring dialogs
  const [completeDialog, setCompleteDialog] = useState<{ task: Task } | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ task: Task } | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)

  // Build the task list for the selected day using real due_date rows
  const dayTasks = useMemo(() => {
    if (!calendarSelectedDay) return []
    return tasks.filter((t) => t.dueDate === calendarSelectedDay)
  }, [tasks, calendarSelectedDay])

  const timedTasks = useMemo(() => dayTasks.filter((t) => !!t.startTime), [dayTasks])
  const allDayTasks = useMemo(() => dayTasks.filter((t) => !t.startTime), [dayTasks])
  const layout = useMemo(() => computeLayout(timedTasks), [timedTasks])

  const heading = calendarSelectedDay ? formatDayHeading(calendarSelectedDay) : null

  // Auto-scroll to current hour (or 8 AM) when panel opens
  useEffect(() => {
    if (!calendarDayPanelOpen || !scrollRef.current) return
    const now = new Date()
    const targetHour = heading?.isToday ? Math.max(now.getHours() - 1, 0) : 8
    const scrollTop = targetHour * PX_PER_HOUR
    // Small delay to let the panel animate in
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollTop, behavior: 'smooth' })
    }, 350)
    return () => clearTimeout(timer)
  }, [calendarDayPanelOpen, heading?.isToday])

  const handleAddTask = () => {
    if (calendarSelectedDay) openTaskForm(undefined, calendarSelectedDay)
  }

  const handleSlotClick = (_hour: number) => {
    if (!calendarSelectedDay) return
    useUIStore.getState().openTaskForm(undefined, calendarSelectedDay)
  }

  // Called when the toggle button is clicked on a task row
  const handleToggle = (task: Task) => {
    // If marking done and it's a recurring task with a group, show choice dialog
    if (task.status !== 'done' && task.isRecurring && task.recurrenceGroupId) {
      setCompleteDialog({ task })
      return
    }

    toggleStatus(
      { id: task.id, currentStatus: task.status, isShared: task.isShared },
      {
        onSuccess: () => {
          if (task.status !== 'done') toast.success('Task completed! 🎉')
          else toast.success('Task reopened')
        },
        onError: () => toast.error('Failed to update task'),
      }
    )
  }

  // Called when the delete button is clicked on a task row
  const handleDeleteClick = (task: Task) => {
    if (task.isRecurring && task.recurrenceGroupId) {
      setDeleteDialog({ task })
      return
    }
    deleteTask(task.id, {
      onSuccess: () => toast.success('Task deleted'),
      onError: () => toast.error('Failed to delete task'),
    })
  }

  // Complete dialog handlers
  const handleCompleteOne = () => {
    if (!completeDialog) return
    const { task } = completeDialog
    toggleStatus(
      { id: task.id, currentStatus: task.status, isShared: task.isShared },
      {
        onSuccess: () => toast.success('Occurrence completed! 🎉'),
        onError: () => toast.error('Failed to update task'),
      }
    )
  }

  const handleCompleteAll = () => {
    if (!completeDialog?.task.recurrenceGroupId) return
    completeAll(
      { recurrenceGroupId: completeDialog.task.recurrenceGroupId },
      {
        onSuccess: () => toast.success('All occurrences completed! 🎉'),
        onError: () => toast.error('Failed to complete all occurrences'),
      }
    )
  }

  // Delete dialog handlers
  const handleDeleteOne = () => {
    if (!deleteDialog) return
    deleteTask(deleteDialog.task.id, {
      onSuccess: () => toast.success('Task deleted'),
      onError: () => toast.error('Failed to delete task'),
    })
  }

  const handleDeleteAll = () => {
    if (!deleteDialog?.task.recurrenceGroupId) return
    deleteAll(
      { recurrenceGroupId: deleteDialog.task.recurrenceGroupId },
      {
        onSuccess: () => toast.success('All occurrences deleted'),
        onError: () => toast.error('Failed to delete all occurrences'),
      }
    )
  }

  // Current time indicator position
  const currentMinutes = getCurrentMinutes()
  const currentTimeTop = currentMinutes * PX_PER_MIN

  return (
    <>
      {completeDialog && (
        <RecurringCompleteDialog
          open={true}
          mode="complete"
          taskTitle={completeDialog.task.title}
          onThisOne={handleCompleteOne}
          onAllOccurrences={handleCompleteAll}
          onClose={() => setCompleteDialog(null)}
        />
      )}
      {deleteDialog && (
        <RecurringCompleteDialog
          open={true}
          mode="delete"
          taskTitle={deleteDialog.task.title}
          onThisOne={handleDeleteOne}
          onAllOccurrences={handleDeleteAll}
          onClose={() => setDeleteDialog(null)}
        />
      )}
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
              {/* ── Header ── */}
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
                <div className="flex items-center gap-2">
                  <Button variant="primary" size="sm" onClick={handleAddTask}>
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add
                  </Button>
                  <button
                    onClick={closeCalendarDayPanel}
                    className="rounded-lg p-1 text-zinc-400 transition-colors hover:bg-surface-elevated hover:text-zinc-100"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* ── All-day strip ── */}
              {allDayTasks.length > 0 && (
                <div className="border-b border-surface-border bg-surface px-4 py-2">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                    All day · {allDayTasks.length}
                  </p>
                  <div className="flex flex-col gap-1">
                    {allDayTasks.map((task) => (
                      <AllDayRow
                        key={task.id}
                        task={task}
                        onDetail={openTaskDetail}
                        onEdit={openTaskForm}
                        onToggle={handleToggle}
                        onDelete={handleDeleteClick}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ── 24-hour timeline ── */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto"
                style={{ scrollbarWidth: 'thin' }}
              >
                {dayTasks.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-elevated">
                      <svg className="h-6 w-6 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-zinc-400">No tasks for this day</p>
                    <p className="mt-1 text-xs text-zinc-600">Click "Add" to schedule something here.</p>
                  </div>
                )}

                <div
                  className="relative"
                  style={{ height: `${TOTAL_HEIGHT}px` }}
                >
                  {/* Hour rows */}
                  {HOUR_LABELS.map((label, hour) => (
                    <div
                      key={hour}
                      className="absolute left-0 right-0 flex cursor-pointer hover:bg-brand-500/5"
                      style={{ top: `${hour * PX_PER_HOUR}px`, height: `${PX_PER_HOUR}px` }}
                      onClick={() => handleSlotClick(hour)}
                    >
                      {/* Hour label */}
                      <div className="flex w-14 flex-shrink-0 items-start justify-end pr-3 pt-1">
                        <span className="text-[10px] font-medium text-zinc-600">{label}</span>
                      </div>
                      {/* Grid line */}
                      <div className="flex-1 border-t border-surface-border/50" />
                    </div>
                  ))}

                  {/* Half-hour lines */}
                  {Array.from({ length: 24 }, (_, hour) => (
                    <div
                      key={`half-${hour}`}
                      className="absolute left-14 right-0 border-t border-surface-border/20"
                      style={{ top: `${hour * PX_PER_HOUR + PX_PER_HOUR / 2}px` }}
                    />
                  ))}

                  {/* Current time indicator (today only) */}
                  {heading?.isToday && (
                    <div
                      className="absolute left-0 right-0 z-20 flex items-center"
                      style={{ top: `${currentTimeTop}px` }}
                    >
                      <div className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-red-500 ml-11" />
                      <div className="flex-1 border-t-2 border-red-500" />
                    </div>
                  )}

                  {/* Timed task blocks */}
                  <div className="absolute inset-0 left-14 right-2">
                    {layout.map(({ task, col, totalCols, startMin, endMin }) => (
                      <TimelineBlock
                        key={task.id}
                        layout={{ task, col, totalCols, startMin, endMin }}
                        onDetail={openTaskDetail}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Footer ── */}
              <div className="border-t border-surface-border px-5 py-3">
                <Button variant="secondary" size="sm" className="w-full" onClick={closeCalendarDayPanel}>
                  Close
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
