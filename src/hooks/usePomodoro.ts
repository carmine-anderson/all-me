import { useEffect, useRef, useCallback } from 'react'
import { usePomodoroStore } from '@/store/pomodoroStore'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/AuthProvider'
import toast from 'react-hot-toast'

const PHASE_LABELS = {
  work: 'Focus time',
  short_break: 'Short break',
  long_break: 'Long break',
}

export function usePomodoro() {
  const store = usePomodoroStore()
  const { user } = useAuth()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevStatusRef = useRef(store.status)
  const prevPhaseRef = useRef(store.phase)

  // Tick interval
  useEffect(() => {
    if (store.status === 'running') {
      intervalRef.current = setInterval(() => {
        store.tick()
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [store.status, store.tick])

  // Detect phase completion → notify + log session
  useEffect(() => {
    const wasRunning = prevStatusRef.current === 'running'
    const phaseChanged = prevPhaseRef.current !== store.phase
    const isFinishedOrAutoStarted =
      store.status === 'finished' || (store.status === 'running' && phaseChanged)

    if (wasRunning && phaseChanged && isFinishedOrAutoStarted) {
      const completedPhase = prevPhaseRef.current
      const label = PHASE_LABELS[completedPhase]

      // Browser notification
      if (Notification.permission === 'granted') {
        new Notification('AllMe', {
          body: `${label} complete! Time for ${PHASE_LABELS[store.phase]}.`,
          icon: '/icons/icon-192.png',
        })
      }

      // Toast
      toast.success(`${label} complete! 🎉`, { duration: 4000 })

      // Log completed work session to DB
      if (completedPhase === 'work' && user && store.sessionStartedAt) {
        supabase
          .from('pomodoro_sessions')
          .insert({
            user_id: user.id,
            task_id: store.linkedTaskId,
            started_at: store.sessionStartedAt,
            ended_at: new Date().toISOString(),
            duration_mins: store.settings.workDuration,
            session_type: 'work',
            completed: true,
          })
          .then(({ error }) => {
            if (error) console.error('Failed to log pomodoro session:', error)
          })
      }
    }

    prevStatusRef.current = store.status
    prevPhaseRef.current = store.phase
  }, [store.phase, store.status])

  // Request notification permission on first start
  const start = useCallback(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
    store.start()
  }, [store])

  return {
    ...store,
    start,
  }
}
