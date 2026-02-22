import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { TaskList } from '@/components/tasks/TaskList'
import { TaskForm } from '@/components/tasks/TaskForm'
import { TaskDetailPopup } from '@/components/calendar/TaskDetailPopup'
import { useTasks } from '@/hooks/useTasks'

export function TasksPage() {
  const { data: tasks = [] } = useTasks()

  const stats = {
    total: tasks.length,
    todo: tasks.filter((t) => t.status === 'todo').length,
    inProgress: tasks.filter((t) => t.status === 'in_progress').length,
    done: tasks.filter((t) => t.status === 'done').length,
    overdue: tasks.filter(
      (t) => t.dueDate && t.dueDate < new Date().toISOString().split('T')[0] && t.status !== 'done'
    ).length,
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Tasks</h1>
          <p className="mt-1 text-sm text-zinc-500">Manage and track your work</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total', value: stats.total, color: 'text-zinc-300' },
            { label: 'To Do', value: stats.todo, color: 'text-zinc-400' },
            { label: 'In Progress', value: stats.inProgress, color: 'text-brand-400' },
            { label: 'Done', value: stats.done, color: 'text-emerald-400' },
          ].map(({ label, value, color }) => (
            <Card key={label} className="text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="mt-0.5 text-xs text-zinc-500">{label}</p>
            </Card>
          ))}
        </div>

        {/* Overdue warning */}
        {stats.overdue > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3"
          >
            <span className="text-lg">⚠️</span>
            <p className="text-sm text-red-400">
              You have{' '}
              <strong>
                {stats.overdue} overdue {stats.overdue === 1 ? 'task' : 'tasks'}
              </strong>
              . Take care of them first!
            </p>
          </motion.div>
        )}

        {/* Task list */}
        <Card>
          <TaskList showFilters={true} />
        </Card>
      </motion.div>

      <TaskForm />
      <TaskDetailPopup />
    </>
  )
}
