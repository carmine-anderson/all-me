import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, startOfWeek, addDays, addWeeks, isToday, startOfDay } from 'date-fns'
import { useTasks } from '@/hooks/useTasks'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const priorityDot: Record<string, string> = {
  low: 'bg-sky-400',
  medium: 'bg-amber-400',
  high: 'bg-red-400',
}

const priorityBar: Record<string, string> = {
  low: 'bg-sky-400/60',
  medium: 'bg-amber-400/60',
  high: 'bg-red-400/60',
}

function getWeekStart(base: Date): Date {
  return startOfWeek(base, { weekStartsOn: 0 })
}

export function WeeklyCalendar() {
  // weekOffset: 0 = current week, -1 = last week, +1 = next week, etc.
  const [weekOffset, setWeekOffset] = useState(0)
  const { data: tasks = [] } = useTasks()
  const { openCalendarDayPanel } = useUIStore()

  const weekStart = useMemo(() => {
    const base = getWeekStart(new Date())
    return weekOffset === 0 ? base : addWeeks(base, weekOffset)
  }, [weekOffset])

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  )

  // Build a map: dateStr → tasks[]
  const tasksByDate = useMemo(() => {
    const map = new Map<string, typeof tasks>()
    tasks.forEach((t) => {
      if (!t.dueDate) return
      const existing = map.get(t.dueDate) ?? []
      map.set(t.dueDate, [...existing, t])
    })
    return map
  }, [tasks])

  const todayStart = startOfDay(new Date())
  const isCurrentWeek = weekOffset === 0

  // Label for the week range
  const weekLabel = useMemo(() => {
    const end = addDays(weekStart, 6)
    const startFmt = format(weekStart, 'MMM d')
    const endFmt =
      weekStart.getMonth() === end.getMonth()
        ? format(end, 'd')
        : format(end, 'MMM d')
    return `${startFmt} – ${endFmt}, ${format(weekStart, 'yyyy')}`
  }, [weekStart])

  return (
    <div className="flex flex-col gap-3">
      {/* Header row: week label + nav */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-zinc-200">Week at a Glance</h3>
          {isCurrentWeek && (
            <span className="rounded-full bg-brand-500/20 px-2 py-0.5 text-[10px] font-medium text-brand-400">
              This Week
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="mr-1 text-xs text-zinc-500">{weekLabel}</span>
          <button
            onClick={() => setWeekOffset((o) => o - 1)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-surface-elevated hover:text-zinc-100"
            aria-label="Previous week"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          {!isCurrentWeek && (
            <button
              onClick={() => setWeekOffset(0)}
              className="rounded-md px-2 py-0.5 text-[10px] font-medium text-brand-400 transition-colors hover:bg-brand-500/10"
            >
              Today
            </button>
          )}
          <button
            onClick={() => setWeekOffset((o) => o + 1)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-surface-elevated hover:text-zinc-100"
            aria-label="Next week"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* 7-day grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={weekOffset}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="grid grid-cols-7 gap-2"
        >
          {days.map((day, idx) => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const dayTasks = tasksByDate.get(dateStr) ?? []
            const pending = dayTasks.filter((t) => t.status !== 'done')
            const done = dayTasks.filter((t) => t.status === 'done')
            const isTodayDay = isToday(day)
            const isPast = startOfDay(day) < todayStart

            return (
              <motion.button
                key={dateStr}
                onClick={() => openCalendarDayPanel(dateStr)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'group relative flex flex-col rounded-xl border p-2 text-left transition-all duration-200 min-h-[110px]',
                  isTodayDay
                    ? 'border-brand-500/60 bg-brand-500/10 shadow-[0_0_12px_2px_rgb(16_185_129_/_0.15)]'
                    : isPast
                    ? 'border-surface-border bg-surface/40 opacity-70 hover:opacity-100 hover:border-zinc-700'
                    : 'border-surface-border bg-surface-card hover:border-zinc-600 hover:bg-surface-elevated'
                )}
              >
                {/* Day header */}
                <div className="mb-1.5 flex items-center justify-between">
                  <div className="flex flex-col items-start">
                    <span
                      className={cn(
                        'text-[10px] font-semibold uppercase tracking-wider',
                        isTodayDay ? 'text-brand-400' : 'text-zinc-500'
                      )}
                    >
                      {DAY_ABBR[idx]}
                    </span>
                    <span
                      className={cn(
                        'text-base font-bold leading-none',
                        isTodayDay ? 'text-brand-300' : 'text-zinc-200'
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                  </div>

                  {/* Today indicator dot */}
                  {isTodayDay && (
                    <span className="h-2 w-2 rounded-full bg-brand-500 shadow-[0_0_6px_2px_rgb(16_185_129_/_0.5)]" />
                  )}
                </div>

                {/* Task pills */}
                <div className="flex flex-1 flex-col gap-1 overflow-hidden">
                  {dayTasks.length === 0 ? (
                    <span className="text-[10px] text-zinc-700 group-hover:text-zinc-600">
                      No tasks
                    </span>
                  ) : (
                    <>
                      {/* Show up to 3 pending tasks */}
                      {pending.slice(0, 3).map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center gap-1 overflow-hidden"
                        >
                          <span
                            className={cn(
                              'h-1.5 w-1.5 flex-shrink-0 rounded-full',
                              priorityDot[task.priority]
                            )}
                          />
                          <span className="truncate text-[10px] leading-tight text-zinc-300">
                            {task.title}
                          </span>
                        </div>
                      ))}

                      {/* Overflow indicator */}
                      {pending.length > 3 && (
                        <span className="text-[10px] text-zinc-600">
                          +{pending.length - 3} more
                        </span>
                      )}

                      {/* Done count badge */}
                      {done.length > 0 && (
                        <div className="mt-auto flex items-center gap-1">
                          <svg
                            className="h-2.5 w-2.5 text-emerald-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          <span className="text-[10px] text-emerald-600">
                            {done.length} done
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Bottom task count bar */}
                {dayTasks.length > 0 && (
                  <div className="mt-1.5 flex gap-0.5">
                    {dayTasks.slice(0, 7).map((task) => (
                      <div
                        key={task.id}
                        className={cn(
                          'h-0.5 flex-1 rounded-full',
                          task.status === 'done'
                            ? 'bg-emerald-500/60'
                            : priorityBar[task.priority]
                        )}
                      />
                    ))}
                  </div>
                )}
              </motion.button>
            )
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
