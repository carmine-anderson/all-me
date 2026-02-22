import { useState, useMemo } from 'react'
import { AnimatePresence } from 'framer-motion'
import { TaskCard } from './TaskCard'
import { Button } from '@/components/ui/Button'
import { useTasks } from '@/hooks/useTasks'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'
import type { TaskStatus, TaskPriority } from '@/types'

type StatusFilter = TaskStatus | 'all'
type PriorityFilter = TaskPriority | 'all'

interface TaskListProps {
  limit?: number
  showFilters?: boolean
}

export function TaskList({ limit, showFilters = true }: TaskListProps) {
  const { data: tasks = [], isLoading } = useTasks()
  const openTaskForm = useUIStore((s) => s.openTaskForm)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')

  const filtered = useMemo(() => {
    let result = tasks
    if (statusFilter !== 'all') result = result.filter((t) => t.status === statusFilter)
    if (priorityFilter !== 'all') result = result.filter((t) => t.priority === priorityFilter)
    // Always push completed tasks to the bottom
    result = [...result].sort((a, b) => {
      const aDone = a.status === 'done' ? 1 : 0
      const bDone = b.status === 'done' ? 1 : 0
      return aDone - bDone
    })
    if (limit) result = result.slice(0, limit)
    return result
  }, [tasks, statusFilter, priorityFilter, limit])

  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'todo', label: 'To Do' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'done', label: 'Done' },
  ]

  const priorityOptions: { value: PriorityFilter; label: string }[] = [
    { value: 'all', label: 'All Priorities' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ]

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-elevated" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {showFilters && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Status filters */}
          <div className="flex gap-1.5">
            {statusOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                  statusFilter === opt.value
                    ? 'bg-brand-500/10 text-brand-400'
                    : 'text-zinc-500 hover:bg-surface-elevated hover:text-zinc-300'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Priority filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
              className="rounded-lg border border-surface-border bg-surface-card px-2 py-1.5 text-xs text-zinc-400 focus:border-brand-500 focus:outline-none"
            >
              {priorityOptions.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-surface-card">
                  {opt.label}
                </option>
              ))}
            </select>

            <Button size="sm" onClick={() => openTaskForm()}>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Task
            </Button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-surface-border py-12 text-center">
          <div className="mb-3 text-4xl">📋</div>
          <p className="text-sm font-medium text-zinc-400">
            {tasks.length === 0 ? 'No tasks yet' : 'No tasks match your filters'}
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            {tasks.length === 0 ? 'Add your first task to get started' : 'Try adjusting your filters'}
          </p>
          {tasks.length === 0 && (
            <Button size="sm" className="mt-4" onClick={() => openTaskForm()}>
              Add your first task
            </Button>
          )}
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          {filtered.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </AnimatePresence>
      )}
    </div>
  )
}
