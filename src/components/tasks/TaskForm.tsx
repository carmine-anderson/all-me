import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

/** Returns true when the viewport matches the given media query string. */
function useMediaQuery(query: string): boolean {
  const subscribe = (cb: () => void) => {
    const mql = window.matchMedia(query)
    mql.addEventListener('change', cb)
    return () => mql.removeEventListener('change', cb)
  }
  const getSnapshot = () => window.matchMedia(query).matches
  const getServerSnapshot = () => false
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { useCreateTask, useUpdateTask, useTasks } from '@/hooks/useTasks'
import { useSendTaskInvites } from '@/hooks/useTaskInvites'
import { useUIStore } from '@/store/uiStore'
import { InviteFriendPicker } from '@/components/friends/InviteFriendPicker'
import { cn } from '@/lib/utils'
import type { TaskFormValues, RecurrenceDay } from '@/types'
import toast from 'react-hot-toast'

const RECURRENCE_DAYS: { key: RecurrenceDay; label: string }[] = [
  { key: 'sun', label: 'S' },
  { key: 'mon', label: 'M' },
  { key: 'tue', label: 'T' },
  { key: 'wed', label: 'W' },
  { key: 'thu', label: 'T' },
  { key: 'fri', label: 'F' },
  { key: 'sat', label: 'S' },
]

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/

const schema = z
  .object({
    title: z.string().min(1, 'Title is required').max(200),
    description: z.string().max(1000).optional(),
    dueDate: z.string().optional(),
    startTime: z.string().regex(timeRegex, 'Invalid time').optional().or(z.literal('')),
    endTime: z.string().regex(timeRegex, 'Invalid time').optional().or(z.literal('')),
    isRecurring: z.boolean().default(false),
    recurrenceDays: z.array(z.enum(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'])).optional(),
    recurrenceEndDate: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high']),
    status: z.enum(['todo', 'in_progress', 'done']),
  })
  .superRefine((data, ctx) => {
    if (data.startTime && data.endTime && data.endTime <= data.startTime) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'End time must be after start time', path: ['endTime'] })
    }
    if (data.isRecurring && (!data.recurrenceDays || data.recurrenceDays.length === 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Select at least one day', path: ['recurrenceDays'] })
    }
  })

type FormValues = z.infer<typeof schema>

const nativeInputCls = [
  'w-full rounded-lg border bg-surface-card px-3 py-2.5 text-sm text-zinc-100 transition-colors',
  'placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50',
  'border-surface-border hover:border-zinc-600',
].join(' ')

const nativeInputStyle: React.CSSProperties = { colorScheme: 'dark' }

function SectionRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center text-zinc-500">
        {icon}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

const CalendarIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

const ClockIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const RecurIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
)

const PriorityIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
  </svg>
)

const StatusIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const PeopleIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

const STATUS_OPTIONS = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
]

export function TaskForm() {
  const isDesktop = useMediaQuery('(min-width: 640px)')
  const { taskFormOpen, editingTaskId, taskFormPrefillDate, closeTaskForm } = useUIStore()
  const { data: tasks = [] } = useTasks()
  const { mutateAsync: createTask, isPending: isCreating } = useCreateTask()
  const { mutateAsync: updateTask, isPending: isUpdating } = useUpdateTask()
  const { mutateAsync: sendTaskInvites } = useSendTaskInvites()
  const [invitedFriendIds, setInvitedFriendIds] = useState<string[]>([])

  const editingTask = editingTaskId ? tasks.find((t) => t.id === editingTaskId) : null
  const isEditing = !!editingTask

  const { register, handleSubmit, reset, watch, control, setValue, formState: { errors } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: {
        title: '', description: '', dueDate: '', startTime: '', endTime: '',
        isRecurring: false, recurrenceDays: [], recurrenceEndDate: '',
        priority: 'medium', status: 'todo',
      },
    })

  const isRecurring = watch('isRecurring')
  const recurrenceDays = watch('recurrenceDays') ?? []

  // Only reset when the panel transitions closed → open.
  // This prevents toggling recurring / selecting days from wiping typed values.
  const wasOpen = useRef(false)
  useEffect(() => {
    const justOpened = taskFormOpen && !wasOpen.current
    wasOpen.current = taskFormOpen
    if (!justOpened) return

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
        title: '', description: '', dueDate: taskFormPrefillDate ?? '',
        startTime: '', endTime: '', isRecurring: false, recurrenceDays: [],
        recurrenceEndDate: '', priority: 'medium', status: 'todo',
      })
    }
    setInvitedFriendIds([])
  }, [taskFormOpen, editingTask, taskFormPrefillDate, reset])

  const toggleRecurrenceDay = (day: RecurrenceDay) => {
    const current = recurrenceDays as RecurrenceDay[]
    const next = current.includes(day) ? current.filter((d) => d !== day) : [...current, day]
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
        if (invitedFriendIds.length > 0 && newTask?.id) {
          try {
            await sendTaskInvites({ taskId: newTask.id, inviteeIds: invitedFriendIds })
            const count = invitedFriendIds.length
            toast.success(`Task created! Invite sent to ${count} friend${count > 1 ? 's' : ''}.`)
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

  // Recurring toggle — single Controller instance shared across layouts via JSX variable
  const RecurringToggleSwitch = (
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
            'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent',
            'transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500/50',
            field.value ? 'bg-brand-500' : 'bg-zinc-700',
          )}
        >
          <span className={cn(
            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
            field.value ? 'translate-x-5' : 'translate-x-0',
          )} />
        </button>
      )}
    />
  )

  // Recurrence day picker — single instance shared across layouts
  const RecurrenceDayPicker = (
    <AnimatePresence>
      {isRecurring && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="mt-3 flex flex-col gap-3">
            <div>
              <p className="mb-1.5 text-xs text-zinc-600">Repeat on</p>
              <div className="flex gap-1.5">
                {RECURRENCE_DAYS.map(({ key, label }) => {
                  const sel = (recurrenceDays as RecurrenceDay[]).includes(key)
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleRecurrenceDay(key)}
                      className={cn(
                        'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all duration-150',
                        sel ? 'bg-brand-500 text-white' : 'bg-surface-elevated text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200',
                      )}
                      title={key}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
              {errors.recurrenceDays && (
                <p className="mt-1 text-[11px] text-red-400">{errors.recurrenceDays.message}</p>
              )}
            </div>
            <div>
              <p className="mb-1 text-xs text-zinc-600">Repeat until (optional)</p>
              <input
                type="date"
                className={cn(nativeInputCls, 'max-w-[200px]')}
                style={nativeInputStyle}
                {...register('recurrenceEndDate')}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )

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

          {/* Panel */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={cn(
              'fixed bottom-0 left-0 right-0 z-[60] flex h-[96dvh] flex-col overflow-x-hidden',
              'rounded-t-2xl border border-surface-border bg-surface-card shadow-2xl',
              'sm:bottom-auto sm:left-auto sm:right-0 sm:top-0 sm:h-full sm:w-full sm:max-w-md sm:rounded-none sm:border-l sm:border-t-0',
            )}
          >
            {/* Drag handle — mobile only */}
            {!isDesktop && (
              <div className="flex justify-center pt-3 pb-1">
                <div className="h-1 w-10 rounded-full bg-zinc-600" />
              </div>
            )}

            {/* ── Single <form> — one registration per field, no double-binding ── */}
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">

              {/* Mobile header */}
              {!isDesktop && <div className="flex items-start justify-between border-b border-surface-border px-5 py-4">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center text-brand-400">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Task title…"
                    className={cn(
                      'min-w-0 flex-1 bg-transparent text-base font-semibold text-zinc-100 placeholder-zinc-500 focus:outline-none',
                      errors.title && 'placeholder-red-400',
                    )}
                    {...register('title')}
                  />
                </div>
                <button
                  type="button"
                  onClick={closeTaskForm}
                  className="ml-3 flex-shrink-0 rounded-lg p-1 text-zinc-400 transition-colors hover:bg-surface-elevated hover:text-zinc-100"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>}
              {errors.title && !isDesktop && (
                <p className="px-5 pt-1 text-[11px] text-red-400">{errors.title.message}</p>
              )}

              {/* Desktop header */}
              {isDesktop && (
                <div className="flex items-center justify-between border-b border-surface-border px-6 py-4">
                  <h2 className="text-base font-semibold text-zinc-100">
                    {isEditing ? 'Edit Task' : 'New Task'}
                  </h2>
                  <button
                    type="button"
                    onClick={closeTaskForm}
                    className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-surface-elevated hover:text-zinc-100"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Scrollable body */}
              <div className="flex-1 overflow-x-hidden overflow-y-auto">

                {/* ══ MOBILE body ══ */}
                {!isDesktop && <div className="flex flex-col gap-5 px-5 py-5">

                  {/* Description */}
                  <SectionRow icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h12M4 18h8" /></svg>}>
                    <textarea
                      rows={2}
                      placeholder="Add description…"
                      className="w-full resize-none bg-transparent text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none"
                      {...register('description')}
                    />
                    {errors.description && <p className="mt-0.5 text-[11px] text-red-400">{errors.description.message}</p>}
                  </SectionRow>

                  {/* Due Date */}
                  {!isRecurring && (
                    <SectionRow icon={<CalendarIcon />}>
                      <label className="mb-1 block text-xs font-medium text-zinc-500">Due Date</label>
                      <input type="date" className={cn(nativeInputCls, 'max-w-[200px]')} style={nativeInputStyle} {...register('dueDate')} />
                      {errors.dueDate && <p className="mt-0.5 text-[11px] text-red-400">{errors.dueDate.message}</p>}
                    </SectionRow>
                  )}

                  {/* Time */}
                  <SectionRow icon={<ClockIcon />}>
                    <label className="mb-1 block text-xs font-medium text-zinc-500">Time (optional)</label>
                    <div className="flex flex-col gap-3">
                      <div>
                        <p className="mb-1 text-[11px] text-zinc-600">Start</p>
                        <input type="time" className={cn(nativeInputCls, 'max-w-[200px]')} style={nativeInputStyle} {...register('startTime')} />
                        {errors.startTime && <p className="mt-0.5 text-[11px] text-red-400">{errors.startTime.message}</p>}
                      </div>
                      <div>
                        <p className="mb-1 text-[11px] text-zinc-600">End</p>
                        <input type="time" className={cn(nativeInputCls, 'max-w-[200px]')} style={nativeInputStyle} {...register('endTime')} />
                        {errors.endTime && <p className="mt-0.5 text-[11px] text-red-400">{errors.endTime.message}</p>}
                      </div>
                    </div>
                  </SectionRow>

                  {/* Recurring */}
                  <SectionRow icon={<RecurIcon />}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-zinc-300">Recurring</p>
                        <p className="text-xs text-zinc-600">Repeat on selected days</p>
                      </div>
                      {RecurringToggleSwitch}
                    </div>
                    {RecurrenceDayPicker}
                  </SectionRow>

                  {/* Priority */}
                  <SectionRow icon={<PriorityIcon />}>
                    <label className="mb-1 block text-xs font-medium text-zinc-500">Priority</label>
                    <Select options={PRIORITY_OPTIONS} error={errors.priority?.message} {...register('priority')} />
                  </SectionRow>

                  {/* Status */}
                  <SectionRow icon={<StatusIcon />}>
                    <label className="mb-1 block text-xs font-medium text-zinc-500">Status</label>
                    <Select options={STATUS_OPTIONS} error={errors.status?.message} {...register('status')} />
                  </SectionRow>

                  {/* Invite friends */}
                  {!isEditing && (
                    <SectionRow icon={<PeopleIcon />}>
                      <InviteFriendPicker selectedIds={invitedFriendIds} onChange={setInvitedFriendIds} />
                      {invitedFriendIds.length > 0 && (
                        <p className="mt-1 text-xs text-zinc-500">
                          Selected friends will receive a notification to accept or deny this task.
                        </p>
                      )}
                    </SectionRow>
                  )}
                </div>}

                {/* ══ DESKTOP body ══ */}
                {isDesktop && <div className="flex flex-col gap-5 px-6 py-6">

                  {/* Title */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-zinc-400">Title *</label>
                    <input
                      type="text"
                      placeholder="What needs to be done?"
                      className={nativeInputCls}
                      style={nativeInputStyle}
                      {...register('title')}
                    />
                    {errors.title && <p className="text-[11px] text-red-400">{errors.title.message}</p>}
                  </div>

                  {/* Description */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-zinc-400">Description</label>
                    <textarea
                      rows={3}
                      placeholder="Add more details..."
                      className={cn(nativeInputCls, 'resize-none')}
                      style={nativeInputStyle}
                      {...register('description')}
                    />
                    {errors.description && <p className="text-[11px] text-red-400">{errors.description.message}</p>}
                  </div>

                  {/* Due Date */}
                  {!isRecurring && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-zinc-400">Due Date</label>
                      <input type="date" className={cn(nativeInputCls, 'max-w-[220px]')} style={nativeInputStyle} {...register('dueDate')} />
                      {errors.dueDate && <p className="text-[11px] text-red-400">{errors.dueDate.message}</p>}
                    </div>
                  )}

                  {/* Time */}
                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs font-medium text-zinc-400">Time (optional)</p>
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] text-zinc-500">Start</label>
                        <input type="time" className={cn(nativeInputCls, 'max-w-[220px]')} style={nativeInputStyle} {...register('startTime')} />
                        {errors.startTime && <p className="text-[11px] text-red-400">{errors.startTime.message}</p>}
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] text-zinc-500">End</label>
                        <input type="time" className={cn(nativeInputCls, 'max-w-[220px]')} style={nativeInputStyle} {...register('endTime')} />
                        {errors.endTime && <p className="text-[11px] text-red-400">{errors.endTime.message}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Recurring */}
                  <div className="flex flex-col gap-3 rounded-xl border border-surface-border bg-surface p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-zinc-200">Recurring</p>
                        <p className="text-xs text-zinc-500">Repeat this task on selected days</p>
                      </div>
                      {RecurringToggleSwitch}
                    </div>
                    {RecurrenceDayPicker}
                  </div>

                  {/* Priority */}
                  <Select label="Priority" options={PRIORITY_OPTIONS} error={errors.priority?.message} {...register('priority')} />

                  {/* Status */}
                  <Select label="Status" options={STATUS_OPTIONS} error={errors.status?.message} {...register('status')} />

                  {/* Invite friends */}
                  {!isEditing && (
                    <div className="flex flex-col gap-1.5">
                      <InviteFriendPicker selectedIds={invitedFriendIds} onChange={setInvitedFriendIds} />
                      {invitedFriendIds.length > 0 && (
                        <p className="text-xs text-zinc-500 pl-1">
                          Selected friends will receive a notification to accept or deny this task.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Footer buttons */}
                  <div
                    className="mt-auto flex gap-3 pt-4"
                    style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
                  >
                    <Button type="button" variant="secondary" className="flex-1" onClick={closeTaskForm}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" className="flex-1" loading={isCreating || isUpdating}>
                      {isEditing ? 'Save Changes' : 'Create Task'}
                    </Button>
                  </div>
                </div>}
              </div>

              {/* Mobile footer */}
              {!isDesktop && (
                <div
                  className="flex gap-3 border-t border-surface-border px-5 py-4"
                  style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
                >
                  <Button type="button" variant="secondary" className="flex-1" onClick={closeTaskForm}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" className="flex-1" loading={isCreating || isUpdating}>
                    {isEditing ? 'Save Changes' : 'Create Task'}
                  </Button>
                </div>
              )}

            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
