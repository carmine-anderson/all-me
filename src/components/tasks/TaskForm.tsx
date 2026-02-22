import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
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
import type { TaskFormValues } from '@/types'
import toast from 'react-hot-toast'

const schema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  dueDate: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']),
  status: z.enum(['todo', 'in_progress', 'done']),
})

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
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      dueDate: '',
      priority: 'medium',
      status: 'todo',
    },
  })

  // Populate form when editing or prefilling date
  useEffect(() => {
    if (editingTask) {
      reset({
        title: editingTask.title,
        description: editingTask.description ?? '',
        dueDate: editingTask.dueDate ?? '',
        priority: editingTask.priority,
        status: editingTask.status,
      })
    } else {
      reset({
        title: '',
        description: '',
        dueDate: taskFormPrefillDate ?? '',
        priority: 'medium',
        status: 'todo',
      })
    }
    // Reset invite selection whenever the form opens/changes mode
    setInvitedFriendIds([])
  }, [editingTask, taskFormPrefillDate, reset])

  const onSubmit = async (values: TaskFormValues) => {
    try {
      if (isEditing && editingTaskId) {
        await updateTask({ id: editingTaskId, values })
        toast.success('Task updated!')
      } else {
        // 1. Create the task
        const newTask = await createTask(values)

        // 2. Send invites if any friends were selected
        if (invitedFriendIds.length > 0) {
          try {
            await sendTaskInvites({ taskId: newTask.id, inviteeIds: invitedFriendIds })
            const count = invitedFriendIds.length
            toast.success(
              `Task created! Invite sent to ${count} friend${count > 1 ? 's' : ''}.`
            )
          } catch {
            // Task was created successfully; invite failure is non-blocking
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
          {/* Backdrop — above DayPanel (z-50) so the form always floats on top */}
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
            className="fixed right-0 top-0 z-[60] flex h-full w-full max-w-md flex-col border-l border-surface-border bg-surface-card shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-surface-border px-6 py-4">
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
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col gap-5 overflow-y-auto p-6">
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

              <Input
                label="Due Date"
                type="date"
                error={errors.dueDate?.message}
                {...register('dueDate')}
              />

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

              <div className="mt-auto flex gap-3 pt-4">
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
