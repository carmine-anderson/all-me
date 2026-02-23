import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useCreateTask, useUpdateTask, useTasks } from '@/hooks/useTasks'
import { useSendTaskInvites } from '@/hooks/useTaskInvites'
import { useUIStore } from '@/store/uiStore'
import { InviteFriendPicker } from '@/components/friends/InviteFriendPicker'
import { cn } from '@/lib/utils'
import type { TaskFormValues, RecurrenceDay } from '@/types'
import toast from 'react-hot-toast'

// ─── Recurrence day config ────────────────────────────────────────────────────

const RECURRENCE_DAYS: { key: RecurrenceDay; label: string }[] = [
  { key: 'sun', label: 'S' },
  { key: 'mon', label: 'M' },
  { key: 'tue', label: 'T' },
  { key: 'wed', label: 'W' },
  { key: 'thu', label: 'T' },
  { key: 'fri', label: 'F' },
  { key: 'sat', label: 'S' },
]

// ─── Zod schema ───────────────────────────────────────────────────────────────

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/

const schema = z
  .object({
    title: z.string().min(1, 'Title is required').max(200),
    description: z.string().max(1000).optional(),
    dueDate: z.string().optional(),
    startTime: z.string().regex(timeRegex, 'Invalid time').optional().or(z.literal('')),
    endTime: z.string().regex(timeRegex, 'Invalid time').optional().or(z.literal('')),
    isRecurring: z.boolean().default(false),
    recurrenceDays: z
      .array(z.enum(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']))
      .optional(),
    recurrenceEndDate: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high']),
    status: z.enum(['todo', 'in_progress', 'done']),
  })
  .superRefine((data, ctx) => {
    // End time must be after start time if both provided
    if (data.startTime && data.endTime && data.endTime <= data.startTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End time must be after start time',
        path: ['endTime'],
      })
    }
    // Recurring tasks must have at least one day selected
    if (data.isRecurring && (!data.recurrenceDays || data.recurrenceDays.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Select at least one day',
        path: ['recurrenceDays'],
      })
    }
  })

type FormValues = z.infer<typeof schema>

// ─── TaskForm ─────────────────────────────────────────────────────────────────

export function TaskForm() {
  const { taskFormOpen, editingTaskId, taskFormPrefillDate, closeTaskForm } = useUIStore()
  const { data: tasks = [] } = useTasks()
  const { mutateAsync: createTask, isPending: isCreating } = useCreateTask()
  const { mutateAsync: updateTask, isPending: isUpdating } = useUpdateTask()
  const { mutateAsync: sendTaskInvites } = useSendTaskInvites()

  // Invited friend IDs — only used when creating a new task
  const [invitedFriendIds, setInvitedFriendIds] = useState<string[]>([])

  const editingTask = editingTaskId ? tasks.find((t) => t.id === editingTaskId) : null
  const isEditing = !!editingTask

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      dueDate: '',
      startTime: '',
      endTime: '',
      isRecurring: false,
      recurrenceDays: [],
      recurrenceEndDate: '',
      priority: 'medium',
      status: 'todo',
    },
  })

  const isRecurring = watch('isRecurring')
  const recurrenceDays = watch('recurrenceDays') ?? []

  // Clear due date when recurring is toggled on
  useEffect(() => {
    if (isRecurring) {
      setValue('dueDate', '', { shouldValidate: false })
    }
  }, [isRecurring, setValue])

  // Populate form when editing or prefilling date
  useEffect(() => {
    if (editingTask) {
      reset({
        title: editingTask.title,
        description: editingTask.description ?? '',
        dueDate: editingTask.dueDate ?? '',
        startTime: editingTask.startTime ? editingTask.startTime.slice(0, 5) : '',
        endTime: editingTask.endTime ? editingTask.endTime.slice(0, 5) : '',
        isRecurring: editingTask.isRecurring,
        recurrenceDays: editingTask.recurrenceDays,
        recurrenceEndDate: editingTask.recurrenceEndDate ?? '',
        priority: editingTask.priority,
        status: editingTask.status,
      })
    } else {
      reset({
        title: '',
        description: '',
        dueDate: taskFormPrefillDate ?? '',
        startTime: '',
        endTime: '',
        isRecurring: false,
        recurrenceDays: [],
        recurrenceEndDate: '',
        priority: 'medium',
        status: 'todo',
      })
    }
    setInvitedFriendIds([])
  }, [editingTask, taskFormPrefillDate, reset])

  const toggleRecurrenceDay = (day: RecurrenceDay) => {
    const current = recurrenceDays as RecurrenceDay[]
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day]
    setValue('recurrenceDays', next, { shouldValidate: true })
  }

  const onSubmit = async (values: FormValues) => {
    try {
      const taskValues: TaskFormValues = {
        title: values.title,
        description: values.description,
        dueDate: values.dueDate,
        startTime: values.startTime || undefined,
        endTime: values.endTime || undefined,
        isRecurring: values.isRecurring,
        recurrenceDays: values.isRecurring ? (values.recurrenceDays as RecurrenceDay[]) : [],
        recurrenceEndDate: values.isRecurring ? values.recurrenceEndDate : undefined,
        priority: values.priority,
        status: values.status,
      }

      if (isEditing && editingTaskId) {
        await updateTask({ id: editingTaskId, values: taskValues })
        toast.success('Task updated!')
      } else {
        const newTask = await createTask(taskValues)

        // newTask is null for recurring tasks (multiple rows inserted, no single return)
        if (invitedFriendIds.length > 0 && newTask?.id) {
          try {
            await sendTaskInvites({ taskId: newTask.id, inviteeIds: invitedFriendIds })
            const count = invitedFriendIds.length
            toast.success(
              `Task created! Invite sent to ${count} friend${count > 1 ? 's' : ''}.`
            )
          } catch {
            toast.success('Task created!')
            toast.error('Could not send all invites. Please try again from the task.')
          }
        } else {
          toast.success('Task created!')
        }
      }
      closeTaskForm()
    } catch {
      toast.error('Failed to save task. Please try again.')
    }
  }

  return (
    <AnimatePresence>
      {taskFormOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[59] bg-black/50 backdrop-blur-sm"
            onClick={closeTaskForm}
          />

          {/* Slide-over panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 z-[60] flex h-full w-full max-w-md flex-col overflow-hidden border-l border-surface-border bg-surface-card shadow-2xl"
            style={{ maxWidth: 'min(448px, 100vw)', width: '100vw' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-surface-border px-4 py-4 sm:px-6">
              <h2 className="text-base font-semibold text-zinc-100">
                {isEditing ? 'Edit Task' : 'New Task'}
              </h2>
              <button
                onClick={closeTaskForm}
                className="rounded-lg p-1 text-zinc-400 transition-colors hover:bg-surface-elevated hover:text-zinc-100"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-6 sm:px-6">
              <Input
                label="Title *"
                placeholder="What needs to be done?"
                error={errors.title?.message}
                {...register('title')}
              />

              <Textarea
                label="Description"
                placeholder="Add more details..."
                error={errors.description?.message}
                {...register('description')}
              />

              {/* Due Date — hidden when recurring is on (recurring tasks have no fixed due date) */}
              {!isRecurring && (
                <Input
                  label="Due Date"
                  type="date"
                  error={errors.dueDate?.message}
                  {...register('dueDate')}
                />
              )}

              {/* ── Time section ── */}
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-medium text-zinc-400">Time (optional)</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex min-w-0 flex-col gap-1">
                    <label className="text-[11px] text-zinc-500">Start</label>
                    <input
                      type="time"
                      className={cn(
                        'w-full min-w-0 rounded-lg border bg-surface px-2 py-2 text-sm text-zinc-100 transition-colors',
                        'focus:outline-none focus:ring-2 focus:ring-brand-500/50',
                        errors.startTime
                          ? 'border-red-500/50 focus:ring-red-500/30'
                          : 'border-surface-border hover:border-zinc-600'
                      )}
                      {...register('startTime')}
                    />
                    {errors.startTime && (
                      <p className="text-[11px] text-red-400">{errors.startTime.message}</p>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-col gap-1">
                    <label className="text-[11px] text-zinc-500">End</label>
                    <input
                      type="time"
                      className={cn(
                        'w-full min-w-0 rounded-lg border bg-surface px-2 py-2 text-sm text-zinc-100 transition-colors',
                        'focus:outline-none focus:ring-2 focus:ring-brand-500/50',
                        errors.endTime
                          ? 'border-red-500/50 focus:ring-red-500/30'
                          : 'border-surface-border hover:border-zinc-600'
                      )}
                      {...register('endTime')}
                    />
                    {errors.endTime && (
                      <p className="text-[11px] text-red-400">{errors.endTime.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Recurring section ── */}
              <div className="flex flex-col gap-3 rounded-xl border border-surface-border bg-surface p-4">
                {/* Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-200">Recurring</p>
                    <p className="text-xs text-zinc-500">Repeat this task on selected days</p>
                  </div>
                  <Controller
                    name="isRecurring"
                    control={control}
                    render={({ field }) => (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={field.value}
                        onClick={() => field.onChange(!field.value)}
                        className={cn(
                          'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500/50',
                          field.value ? 'bg-brand-500' : 'bg-zinc-700'
                        )}
                      >
                        <span
                          className={cn(
                            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                            field.value ? 'translate-x-5' : 'translate-x-0'
                          )}
                        />
                      </button>
                    )}
                  />
                </div>

                {/* Recurrence options — shown when toggled on */}
                <AnimatePresence>
                  {isRecurring && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-col gap-3 pt-1">
                        {/* Day-of-week pills */}
                        <div className="flex flex-col gap-1.5">
                          <p className="text-xs text-zinc-500">Repeat on</p>
                          <div className="flex gap-1.5">
                            {RECURRENCE_DAYS.map(({ key, label }) => {
                              const isSelected = (recurrenceDays as RecurrenceDay[]).includes(key)
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => toggleRecurrenceDay(key)}
                                  className={cn(
                                    'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all duration-150',
                                    isSelected
                                      ? 'bg-brand-500 text-white'
                                      : 'bg-surface-elevated text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                                  )}
                                  title={key}
                                >
                                  {label}
                                </button>
                              )
                            })}
                          </div>
                          {errors.recurrenceDays && (
                            <p className="text-[11px] text-red-400">
                              {errors.recurrenceDays.message}
                            </p>
                          )}
                        </div>

                        {/* End date */}
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-zinc-500">Repeat until (optional)</label>
                          <input
                            type="date"
                            className={cn(
                              'w-full rounded-lg border bg-surface px-3 py-2 text-sm text-zinc-100 transition-colors',
                              'focus:outline-none focus:ring-2 focus:ring-brand-500/50',
                              'border-surface-border hover:border-zinc-600'
                            )}
                            {...register('recurrenceEndDate')}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Select
                label="Priority"
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                ]}
                error={errors.priority?.message}
                {...register('priority')}
              />

              <Select
                label="Status"
                options={[
                  { value: 'todo', label: 'To Do' },
                  { value: 'in_progress', label: 'In Progress' },
                  { value: 'done', label: 'Done' },
                ]}
                error={errors.status?.message}
                {...register('status')}
              />

              {/* Invite friends — only shown when creating a new task */}
              {!isEditing && (
                <div className="flex flex-col gap-1.5">
                  <InviteFriendPicker
                    selectedIds={invitedFriendIds}
                    onChange={setInvitedFriendIds}
                  />
                  {invitedFriendIds.length > 0 && (
                    <p className="text-xs text-zinc-500 pl-1">
                      Selected friends will receive a notification to accept or deny this task.
                    </p>
                  )}
                </div>
              )}

              <div className="mt-auto flex gap-3 pt-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
                <Button type="button" variant="secondary" className="flex-1" onClick={closeTaskForm}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  loading={isCreating || isUpdating}
                >
                  {isEditing ? 'Save Changes' : 'Create Task'}
                </Button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
