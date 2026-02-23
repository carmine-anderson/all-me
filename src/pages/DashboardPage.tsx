import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { useAuth } from '@/providers/AuthProvider'
import { useUIStore } from '@/store/uiStore'
import { useTodayCheckin } from '@/hooks/useProductivity'
import { useProfile } from '@/hooks/useProfile'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ProductivityHeatmap } from '@/components/productivity/ProductivityHeatmap'
import { ProductivityCheckin } from '@/components/productivity/ProductivityCheckin'
import { FeedbackMessage } from '@/components/productivity/FeedbackMessage'
import { TaskList } from '@/components/tasks/TaskList'
import { TaskForm } from '@/components/tasks/TaskForm'
import { PomodoroTimer } from '@/components/pomodoro/PomodoroTimer'
import { PomodoroSettings } from '@/components/pomodoro/PomodoroSettings'
import { WeeklyCalendar } from '@/components/calendar/WeeklyCalendar'
import { DayPanel } from '@/components/calendar/DayPanel'
import { TaskDetailPopup } from '@/components/calendar/TaskDetailPopup'
import { levelLabel } from '@/lib/utils'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function DashboardPage() {
  const { user } = useAuth()
  const { setCheckinModalOpen } = useUIStore()
  const todayCheckin = useTodayCheckin()
  const { data: profile } = useProfile()

  // Use the saved username if set; otherwise fall back to the email prefix
  const displayName = profile?.username || user?.email?.split('@')[0] || 'there'
  const today = format(new Date(), 'EEEE, MMMM d')

  // Avatar initials fallback
  const initials = (profile?.username ?? user?.email ?? '?')
    .slice(0, 2)
    .toUpperCase()

  return (
    <>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        {/* Welcome banner */}
        <motion.div variants={item}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            {/* Left side: avatar + text */}
            <div className="flex items-center gap-4">
              {/* Profile picture with accent glow */}
              <div
                className="relative h-14 w-14 flex-shrink-0 rounded-full"
                style={{
                  boxShadow: '0 0 0 2px rgb(var(--brand-500) / 0.7), 0 0 16px 4px rgb(var(--brand-500) / 0.35)',
                }}
              >
                {profile?.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={displayName}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center rounded-full bg-brand-500/20 text-base font-bold text-brand-400">
                    {initials}
                  </span>
                )}
              </div>

              {/* Greeting text */}
              <div>
                <h1 className="text-2xl font-bold text-zinc-100">
                  {getGreeting()},{' '}
                  <span className="text-gradient capitalize">{displayName}</span> 👋
                </h1>
                <p className="mt-1 text-sm text-zinc-500">{today}</p>
              </div>
            </div>

            {/* Right side: check-in button */}
            {!todayCheckin ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setCheckinModalOpen(true)}
                className="animate-bounce-gentle"
              >
                <span>📊</span>
                Check in today
              </Button>
            ) : (
              <button
                onClick={() => setCheckinModalOpen(true)}
                className="flex items-center gap-2 rounded-lg border border-brand-500/20 bg-brand-500/5 px-3 py-1.5 text-xs text-brand-400 transition-colors hover:bg-brand-500/10"
              >
                <span>✅</span>
                Today: {levelLabel(todayCheckin.level)}
              </button>
            )}
          </div>
        </motion.div>

        {/* Productivity Heatmap */}
        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <CardTitle>Productivity History</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCheckinModalOpen(true)}
                className="text-brand-400 hover:text-brand-300"
              >
                + Check in
              </Button>
            </CardHeader>
            <div className="overflow-x-auto">
              <ProductivityHeatmap />
            </div>
          </Card>
        </motion.div>

        {/* Weekly Calendar */}
        <motion.div variants={item}>
          <Card>
            <WeeklyCalendar />
          </Card>
        </motion.div>

        {/* Bottom grid: Tasks + Pomodoro */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Tasks — wider */}
          <motion.div variants={item} className="lg:col-span-3">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Upcoming Tasks</CardTitle>
              </CardHeader>
              <TaskList limit={5} showFilters={false} hideDone />
              <div className="mt-4 border-t border-surface-border pt-3">
                <a
                  href="/tasks"
                  className="text-xs text-zinc-500 transition-colors hover:text-brand-400"
                >
                  View all tasks →
                </a>
              </div>
            </Card>
          </motion.div>

          {/* Pomodoro — narrower */}
          <motion.div variants={item} className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Focus Timer</CardTitle>
              </CardHeader>
              <div className="flex justify-center py-2">
                <PomodoroTimer />
              </div>
            </Card>
          </motion.div>
        </div>
      </motion.div>

      {/* Global overlays */}
      <ProductivityCheckin />
      <FeedbackMessage />
      <TaskForm />
      <PomodoroSettings />
      <DayPanel />
      <TaskDetailPopup />
    </>
  )
}
