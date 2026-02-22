import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PomodoroPhase, PomodoroStatus, PomodoroSettings } from '@/types'

interface PomodoroState {
  // Settings
  settings: PomodoroSettings

  // Timer state
  phase: PomodoroPhase
  status: PomodoroStatus
  secondsLeft: number
  sessionsCompleted: number
  linkedTaskId: string | null

  // Session tracking
  sessionStartedAt: string | null

  // Actions
  start: () => void
  pause: () => void
  resume: () => void
  reset: () => void
  skip: () => void
  tick: () => void
  setLinkedTask: (taskId: string | null) => void
  updateSettings: (settings: Partial<PomodoroSettings>) => void
  completeSession: () => void
}

const DEFAULT_SETTINGS: PomodoroSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartWork: false,
  soundEnabled: true,
}

function phaseDuration(phase: PomodoroPhase, settings: PomodoroSettings): number {
  switch (phase) {
    case 'work':
      return settings.workDuration * 60
    case 'short_break':
      return settings.shortBreakDuration * 60
    case 'long_break':
      return settings.longBreakDuration * 60
  }
}

function nextPhase(
  current: PomodoroPhase,
  sessionsCompleted: number,
  settings: PomodoroSettings
): PomodoroPhase {
  if (current !== 'work') return 'work'
  const newCount = sessionsCompleted + 1
  if (newCount % settings.longBreakInterval === 0) return 'long_break'
  return 'short_break'
}

export const usePomodoroStore = create<PomodoroState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      phase: 'work',
      status: 'idle',
      secondsLeft: DEFAULT_SETTINGS.workDuration * 60,
      sessionsCompleted: 0,
      linkedTaskId: null,
      sessionStartedAt: null,

      start: () =>
        set({
          status: 'running',
          sessionStartedAt: new Date().toISOString(),
        }),

      pause: () => set({ status: 'paused' }),

      resume: () => set({ status: 'running' }),

      reset: () => {
        const { phase, settings } = get()
        set({
          status: 'idle',
          secondsLeft: phaseDuration(phase, settings),
          sessionStartedAt: null,
        })
      },

      skip: () => {
        const { phase, sessionsCompleted, settings } = get()
        const next = nextPhase(phase, sessionsCompleted, settings)
        set({
          phase: next,
          status: 'idle',
          secondsLeft: phaseDuration(next, settings),
          sessionStartedAt: null,
        })
      },

      tick: () => {
        const { secondsLeft } = get()
        if (secondsLeft > 0) {
          set({ secondsLeft: secondsLeft - 1 })
        } else {
          get().completeSession()
        }
      },

      completeSession: () => {
        const { phase, sessionsCompleted, settings } = get()
        const newCount = phase === 'work' ? sessionsCompleted + 1 : sessionsCompleted
        const next = nextPhase(phase, sessionsCompleted, settings)
        const autoStart =
          next === 'work' ? settings.autoStartWork : settings.autoStartBreaks

        set({
          phase: next,
          status: autoStart ? 'running' : 'finished',
          secondsLeft: phaseDuration(next, settings),
          sessionsCompleted: newCount,
          sessionStartedAt: autoStart ? new Date().toISOString() : null,
        })
      },

      setLinkedTask: (taskId) => set({ linkedTaskId: taskId }),

      updateSettings: (newSettings) => {
        const { settings, phase, status } = get()
        const merged = { ...settings, ...newSettings }
        // If idle, update secondsLeft to reflect new duration
        const secondsLeft =
          status === 'idle' ? phaseDuration(phase, merged) : get().secondsLeft
        set({ settings: merged, secondsLeft })
      },
    }),
    {
      name: 'allme-pomodoro',
      // Only persist settings and session count, not running state
      partialize: (state) => ({
        settings: state.settings,
        sessionsCompleted: state.sessionsCompleted,
      }),
    }
  )
)
