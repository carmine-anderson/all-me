import { useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { usePomodoro } from '@/hooks/usePomodoro'
import { useTheme } from '@/hooks/useTheme'
import { PomodoroControls } from './PomodoroControls'
import { formatTime, cn } from '@/lib/utils'

const PHASE_LABELS = {
  work: 'Focus',
  short_break: 'Short Break',
  long_break: 'Long Break',
}

const PHASE_COLORS = {
  work: 'text-brand-400',
  short_break: 'text-blue-400',
  long_break: 'text-purple-400',
}

const SIZE = 200
const STROKE = 8
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function PomodoroTimer() {
  const { phase, status, secondsLeft, settings, sessionsCompleted } = usePomodoro()
  const { accent } = useTheme()

  const totalSeconds = (() => {
    switch (phase) {
      case 'work': return settings.workDuration * 60
      case 'short_break': return settings.shortBreakDuration * 60
      case 'long_break': return settings.longBreakDuration * 60
    }
  })()

  const progress = secondsLeft / totalSeconds
  const dashOffset = CIRCUMFERENCE * (1 - progress)

  // Read the current brand-500 CSS variable as a hex/rgb color for the SVG stroke.
  // Re-computes whenever the accent changes.
  const workRingColor = useMemo(() => {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue('--brand-500')
      .trim()
    // raw is "R G B" space-separated — convert to rgb()
    return raw ? `rgb(${raw})` : '#10b981'
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accent])

  const ringColor = phase === 'work'
    ? workRingColor
    : phase === 'short_break'
      ? '#60a5fa'
      : '#a78bfa'

  // Update document title with timer
  useEffect(() => {
    if (status === 'running') {
      document.title = `${formatTime(secondsLeft)} — AllMe`
    } else {
      document.title = 'AllMe'
    }
    return () => { document.title = 'AllMe' }
  }, [secondsLeft, status])

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Phase label */}
      <div className="flex items-center gap-2">
        <span className={cn('text-sm font-semibold', PHASE_COLORS[phase])}>
          {PHASE_LABELS[phase]}
        </span>
        {sessionsCompleted > 0 && (
          <span className="rounded-full bg-surface-elevated px-2 py-0.5 text-xs text-zinc-500">
            {sessionsCompleted} sessions
          </span>
        )}
      </div>

      {/* Circular progress ring */}
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} className="-rotate-90">
          {/* Background ring */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="#27272a"
            strokeWidth={STROKE}
          />
          {/* Progress ring */}
          <motion.circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={ringColor}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 0.5, ease: 'linear' }}
          />
        </svg>

        {/* Time display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-4xl font-bold tabular-nums text-zinc-100">
            {formatTime(secondsLeft)}
          </span>
          <span className="mt-1 text-xs text-zinc-500 capitalize">
            {status === 'idle' ? 'Ready' : status === 'running' ? 'Running' : status === 'paused' ? 'Paused' : 'Done!'}
          </span>
        </div>
      </div>

      {/* Session dots */}
      <div className="flex gap-1.5">
        {[...Array(settings.longBreakInterval)].map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-2 w-2 rounded-full transition-all',
              i < (sessionsCompleted % settings.longBreakInterval)
                ? 'bg-brand-500'
                : 'bg-surface-muted'
            )}
          />
        ))}
      </div>

      <PomodoroControls />
    </div>
  )
}
