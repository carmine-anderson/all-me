import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useUIStore } from '@/store/uiStore'
import { usePomodoroStore } from '@/store/pomodoroStore'
import type { PomodoroSettings as PomodoroSettingsType } from '@/types'

const schema = z.object({
  workDuration: z.coerce.number().min(1).max(120),
  shortBreakDuration: z.coerce.number().min(1).max(60),
  longBreakDuration: z.coerce.number().min(1).max(120),
  longBreakInterval: z.coerce.number().min(1).max(10),
  autoStartBreaks: z.boolean(),
  autoStartWork: z.boolean(),
  soundEnabled: z.boolean(),
})

export function PomodoroSettings() {
  const { pomodoroSettingsOpen, setPomodoroSettingsOpen } = useUIStore()
  const { settings, updateSettings } = usePomodoroStore()

  const { register, handleSubmit, formState: { errors } } = useForm<PomodoroSettingsType>({
    resolver: zodResolver(schema),
    defaultValues: settings,
  })

  const onSubmit = (values: PomodoroSettingsType) => {
    updateSettings(values)
    setPomodoroSettingsOpen(false)
  }

  return (
    <Modal
      open={pomodoroSettingsOpen}
      onClose={() => setPomodoroSettingsOpen(false)}
      title="Timer Settings"
      size="sm"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Focus (min)"
            type="number"
            min={1}
            max={120}
            error={errors.workDuration?.message}
            {...register('workDuration')}
          />
          <Input
            label="Short Break (min)"
            type="number"
            min={1}
            max={60}
            error={errors.shortBreakDuration?.message}
            {...register('shortBreakDuration')}
          />
          <Input
            label="Long Break (min)"
            type="number"
            min={1}
            max={120}
            error={errors.longBreakDuration?.message}
            {...register('longBreakDuration')}
          />
          <Input
            label="Sessions before long break"
            type="number"
            min={1}
            max={10}
            error={errors.longBreakInterval?.message}
            {...register('longBreakInterval')}
          />
        </div>

        <div className="space-y-3 border-t border-surface-border pt-3">
          {[
            { name: 'autoStartBreaks' as const, label: 'Auto-start breaks' },
            { name: 'autoStartWork' as const, label: 'Auto-start work sessions' },
            { name: 'soundEnabled' as const, label: 'Sound notifications' },
          ].map(({ name, label }) => (
            <label key={name} className="flex cursor-pointer items-center justify-between">
              <span className="text-sm text-zinc-300">{label}</span>
              <input
                type="checkbox"
                className="h-4 w-4 rounded accent-brand-500"
                {...register(name)}
              />
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={() => setPomodoroSettingsOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Save Settings
          </Button>
        </div>
      </form>
    </Modal>
  )
}
