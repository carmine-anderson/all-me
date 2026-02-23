import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTasks } from '@/hooks/useTasks'
import { useUIStore } from '@/store/uiStore'
import { DayPanel } from '@/components/calendar/DayPanel'
import { TaskDetailPopup } from '@/components/calendar/TaskDetailPopup'
import { TaskForm } from '@/components/tasks/TaskForm'
import { cn } from '@/lib/utils'
import type { Task } from '@/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toLocalDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function todayStr(): string {
  return toLocalDateStr(new Date())
}

/** Returns all calendar cells for a given year/month (including leading/trailing days) */
function buildCalendarGrid(year: number, month: number): Array<{ dateStr: string; isCurrentMonth: boolean }> {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  const startPad = firstDay.getDay()   // 0 = Sunday
  const endPad = 6 - lastDay.getDay()

  const cells: Array<{ dateStr: string; isCurrentMonth: boolean }> = []

  for (let i = startPad - 1; i >= 0; i--) {
    const d = new Date(year, month, -i)
    cells.push({ dateStr: toLocalDateStr(d), isCurrentMonth: false })
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    cells.push({ dateStr: toLocalDateStr(new Date(year, month, d)), isCurrentMonth: true })
  }

  for (let i = 1; i <= endPad; i++) {
    const d = new Date(year, month + 1, i)
    cells.push({ dateStr: toLocalDateStr(d), isCurrentMonth: false })
  }

  return cells
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ─── Priority chip colours ────────────────────────────────────────────────────

const chipColors = {
  low: {
    todo: 'bg-sky-500/15 text-sky-300 border-sky-500/20',
    in_progress: 'bg-sky-500/25 text-sky-200 border-sky-500/30',
    done: 'bg-zinc-700/40 text-zinc-500 border-zinc-700/30 line-through',
  },
  medium: {
    todo: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
    in_progress: 'bg-amber-500/25 text-amber-200 border-amber-500/30',
    done: 'bg-zinc-700/40 text-zinc-500 border-zinc-700/30 line-through',
  },
  high: {
    todo: 'bg-red-500/15 text-red-300 border-red-500/20',
    in_progress: 'bg-red-500/25 text-red-200 border-red-500/30',
    done: 'bg-zinc-700/40 text-zinc-500 border-zinc-700/30 line-through',
  },
}

// ─── Task chip ────────────────────────────────────────────────────────────────

interface TaskChipProps {
  task: Task
  onClick: (e: React.MouseEvent) => void
}

function TaskChip({ task, onClick }: TaskChipProps) {
  const colorClass = chipColors[task.priority][task.status]
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full truncate rounded border px-1.5 py-0.5 text-left text-[10px] font-medium leading-tight transition-all duration-150 hover:brightness-125 sm:text-[11px]',
        colorClass
      )}
      title={task.title}
    >
      {task.isRecurring && <span className="mr-0.5 opacity-60">↻</span>}
      {task.title}
    </button>
  )
}

// ─── Day cell ─────────────────────────────────────────────────────────────────

interface DayCellProps {
  dateStr: string
  isCurrentMonth: boolean
  tasks: Task[]
  isToday: boolean
  isSelected: boolean
  onDayClick: (dateStr: string) => void
  onTaskClick: (taskId: string, e: React.MouseEvent) => void
}

const priorityDotColor: Record<string, string> = {
  low: 'bg-sky-400',
  medium: 'bg-amber-400',
  high: 'bg-red-400',
  done: 'bg-emerald-500',
}

function DayCell({ dateStr, isCurrentMonth, tasks, isToday, isSelected, onDayClick, onTaskClick }: DayCellProps) {
  const dayNum = Number(dateStr.split('-')[2])

  const MAX_CHIPS = 4
  const visible = tasks.slice(0, MAX_CHIPS)
  const overflow = tasks.length - MAX_CHIPS

  // For mobile: up to 3 dots representing tasks
  const mobileDots = tasks.slice(0, 3)
  const mobileOverflow = tasks.length - 3

  return (
    <div
      onClick={() => onDayClick(dateStr)}
      className={cn(
        'group relative flex cursor-pointer flex-col rounded-xl border transition-all duration-150',
        // Mobile: compact, just enough room for number + dots
        'p-1.5 min-h-[52px]',
        // sm+: more padding and taller
        'sm:p-2 sm:min-h-[100px] md:min-h-[120px] lg:min-h-[130px]',
        isCurrentMonth
          ? 'border-surface-border bg-surface-card hover:border-zinc-600 hover:bg-surface-elevated'
          : 'border-transparent bg-surface/40 opacity-35',
        isSelected && 'border-brand-500/60 bg-brand-500/5 ring-1 ring-brand-500/30',
        isToday && !isSelected && 'border-brand-500/30 bg-brand-500/5'
      )}
    >
      {/* Day number */}
      <div className="flex items-start justify-between">
        <span
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold sm:h-6 sm:w-6',
            isToday
              ? 'bg-brand-500 text-white'
              : isCurrentMonth
                ? 'text-zinc-300'
                : 'text-zinc-600'
          )}
        >
          {dayNum}
        </span>
        {tasks.length > 0 && (
          <span className="hidden text-[9px] font-medium text-zinc-600 group-hover:text-zinc-500 sm:block">
            {tasks.length}
          </span>
        )}
      </div>

      {/* Mobile: dot indicators only (no chips) */}
      {tasks.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-0.5 sm:hidden">
          {mobileDots.map((task) => (
            <span
              key={task.id}
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                task.status === 'done' ? priorityDotColor.done : priorityDotColor[task.priority]
              )}
            />
          ))}
          {mobileOverflow > 0 && (
            <span className="text-[8px] leading-none text-zinc-600">+{mobileOverflow}</span>
          )}
        </div>
      )}

      {/* sm+: full task chips */}
      <div className="mt-1 hidden flex-col gap-0.5 sm:flex">
        {visible.map((task, idx) => (
          <div
            key={task.id}
            className={cn(
              idx === 0 ? 'block' : '',
              idx === 1 ? 'block' : '',
              idx === 2 ? 'hidden md:block' : '',
              idx === 3 ? 'hidden lg:block' : '',
            )}
          >
            <TaskChip
              task={task}
              onClick={(e) => {
                onTaskClick(task.id, e)
              }}
            />
          </div>
        ))}
        {overflow > 0 && (
          <span className="pl-0.5 text-[9px] text-zinc-600 md:hidden">
            {tasks.length > 2 ? `+${tasks.length - 2} more` : ''}
          </span>
        )}
        {overflow > 0 && (
          <span className="hidden pl-0.5 text-[9px] text-zinc-600 lg:block">
            +{overflow} more
          </span>
        )}
      </div>

      {/* Add hint on hover for empty current-month cells */}
      {isCurrentMonth && tasks.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
          <svg className="h-4 w-4 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
      )}
    </div>
  )
}

// ─── CalendarPage ─────────────────────────────────────────────────────────────

export function CalendarPage() {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const { data: tasks = [] } = useTasks()
  const { openCalendarDayPanel, openTaskDetail, calendarSelectedDay } = useUIStore()

  const grid = useMemo(() => buildCalendarGrid(viewYear, viewMonth), [viewYear, viewMonth])

  // Build the window string for the current month view
  const windowStart = useMemo(
    () => `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-01`,
    [viewYear, viewMonth]
  )
  const windowEnd = useMemo(() => {
    const lastDay = new Date(viewYear, viewMonth + 1, 0)
    return toLocalDateStr(lastDay)
  }, [viewYear, viewMonth])

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {}

    for (const task of tasks) {
      // All tasks (including recurring occurrences) now have a real due_date row.
      // Just bucket by due_date — no virtual expansion needed.
      if (task.dueDate && task.dueDate >= windowStart && task.dueDate <= windowEnd) {
        if (!map[task.dueDate]) map[task.dueDate] = []
        map[task.dueDate].push(task)
      }
    }

    return map
  }, [tasks, windowStart, windowEnd])

  const today_str = todayStr()

  const monthTasks = useMemo(() => {
    const prefix = `${String(viewYear)}-${String(viewMonth + 1).padStart(2, '0')}`
    return tasks.filter((t) => t.dueDate?.startsWith(prefix))
  }, [tasks, viewYear, viewMonth])

  const monthStats = {
    total: monthTasks.length,
    done: monthTasks.filter((t) => t.status === 'done').length,
    pending: monthTasks.filter((t) => t.status !== 'done').length,
    overdue: monthTasks.filter(
      (t) => t.dueDate && t.dueDate < today_str && t.status !== 'done'
    ).length,
  }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11) }
    else setViewMonth((m) => m - 1)
  }

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0) }
    else setViewMonth((m) => m + 1)
  }

  const goToday = () => {
    setViewYear(today.getFullYear())
    setViewMonth(today.getMonth())
  }

  const handleDayClick = (dateStr: string) => openCalendarDayPanel(dateStr)

  const handleTaskClick = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    openTaskDetail(taskId)
  }

  const isCurrentMonthView =
    viewYear === today.getFullYear() && viewMonth === today.getMonth()

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col gap-4 md:gap-5"
      >
        {/* ── Page header ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-100 sm:text-2xl">Calendar</h1>
            <p className="mt-0.5 text-xs text-zinc-500 sm:text-sm">
              Click any day to open the 24-hour view · Click a task chip for details
            </p>
          </div>
          <button
            onClick={() => useUIStore.getState().openTaskForm()}
            className="btn-primary self-start sm:self-auto"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Task
          </button>
        </div>

        {/* ── Month stats ── */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          {[
            { label: 'This Month', value: monthStats.total, color: 'text-zinc-300' },
            { label: 'Pending', value: monthStats.pending, color: 'text-brand-400' },
            { label: 'Completed', value: monthStats.done, color: 'text-emerald-400' },
            { label: 'Overdue', value: monthStats.overdue, color: monthStats.overdue > 0 ? 'text-red-400' : 'text-zinc-500' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border border-surface-border bg-surface-card p-3 text-center sm:p-4">
              <p className={`text-xl font-bold sm:text-2xl ${color}`}>{value}</p>
              <p className="mt-0.5 text-xs text-zinc-500">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Calendar card ── */}
        <div className="rounded-2xl border border-surface-border bg-surface-card shadow-lg">
          {/* Month navigation */}
          <div className="flex items-center justify-between border-b border-surface-border px-4 py-3 sm:px-6 sm:py-4">
            <button
              onClick={prevMonth}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-surface-elevated hover:text-zinc-100"
              aria-label="Previous month"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex items-center gap-2 sm:gap-3">
              <AnimatePresence mode="wait">
                <motion.h2
                  key={`${viewYear}-${viewMonth}`}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.18 }}
                  className="text-base font-semibold text-zinc-100 sm:text-lg"
                >
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </motion.h2>
              </AnimatePresence>
              {!isCurrentMonthView && (
                <button
                  onClick={goToday}
                  className="rounded-full bg-brand-500/10 px-2 py-0.5 text-xs font-medium text-brand-400 transition-colors hover:bg-brand-500/20 sm:px-2.5"
                >
                  Today
                </button>
              )}
            </div>

            <button
              onClick={nextMonth}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-surface-elevated hover:text-zinc-100"
              aria-label="Next month"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 border-b border-surface-border">
            {DAY_HEADERS.map((d) => (
              <div key={d} className="py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-zinc-600 sm:text-xs">
                <span className="sm:hidden">{d[0]}</span>
                <span className="hidden sm:inline">{d}</span>
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`${viewYear}-${viewMonth}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-7 gap-1 p-2 sm:gap-1.5 sm:p-3 md:gap-2 md:p-4"
            >
              {grid.map(({ dateStr, isCurrentMonth }) => (
                <DayCell
                  key={dateStr}
                  dateStr={dateStr}
                  isCurrentMonth={isCurrentMonth}
                  tasks={tasksByDate[dateStr] ?? []}
                  isToday={dateStr === today_str}
                  isSelected={dateStr === calendarSelectedDay}
                  onDayClick={handleDayClick}
                  onTaskClick={handleTaskClick}
                />
              ))}
            </motion.div>
          </AnimatePresence>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-2 border-t border-surface-border px-4 py-3 sm:gap-4 sm:px-6">
            <span className="text-xs font-medium text-zinc-600">Priority:</span>
            {[
              { label: 'Low', cls: 'bg-sky-500/20 text-sky-300' },
              { label: 'Medium', cls: 'bg-amber-500/20 text-amber-300' },
              { label: 'High', cls: 'bg-red-500/20 text-red-300' },
              { label: 'Done', cls: 'bg-zinc-700/40 text-zinc-500' },
            ].map(({ label, cls }) => (
              <span key={label} className={cn('rounded px-2 py-0.5 text-[10px] font-medium', cls)}>
                {label}
              </span>
            ))}
            <span className="ml-auto text-[10px] text-zinc-600">↻ = recurring</span>
          </div>
        </div>
      </motion.div>

      {/* Overlays */}
      <DayPanel />
      <TaskDetailPopup />
      <TaskForm />
    </>
  )
}
