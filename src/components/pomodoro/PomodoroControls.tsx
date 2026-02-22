import { usePomodoro } from '@/hooks/usePomodoro'
import { useUIStore } from '@/store/uiStore'
import { Button } from '@/components/ui/Button'

export function PomodoroControls() {
  const { status, start, pause, resume, reset, skip } = usePomodoro()
  const setPomodoroSettingsOpen = useUIStore((s) => s.setPomodoroSettingsOpen)

  return (
    <div className="flex items-center gap-2">
      {/* Reset */}
      <Button
        variant="ghost"
        size="sm"
        className="h-9 w-9 p-0"
        onClick={reset}
        aria-label="Reset timer"
        title="Reset"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </Button>

      {/* Main action */}
      {status === 'idle' || status === 'finished' ? (
        <Button variant="primary" size="lg" onClick={start} className="min-w-[120px]">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          Start
        </Button>
      ) : status === 'running' ? (
        <Button variant="secondary" size="lg" onClick={pause} className="min-w-[120px]">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
          Pause
        </Button>
      ) : (
        <Button variant="primary" size="lg" onClick={resume} className="min-w-[120px]">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          Resume
        </Button>
      )}

      {/* Skip */}
      <Button
        variant="ghost"
        size="sm"
        className="h-9 w-9 p-0"
        onClick={skip}
        aria-label="Skip to next phase"
        title="Skip"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
        </svg>
      </Button>

      {/* Settings */}
      <Button
        variant="ghost"
        size="sm"
        className="h-9 w-9 p-0"
        onClick={() => setPomodoroSettingsOpen(true)}
        aria-label="Timer settings"
        title="Settings"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </Button>
    </div>
  )
}
