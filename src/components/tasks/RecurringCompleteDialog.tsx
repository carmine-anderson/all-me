import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

type DialogMode = 'complete' | 'delete'

interface RecurringDialogProps {
  open: boolean
  mode: DialogMode
  taskTitle: string
  onThisOne: () => void
  onAllOccurrences: () => void
  onClose: () => void
}

/**
 * Shown when the user marks a recurring task as complete OR deletes one.
 * Lets them choose between acting on just this occurrence or all occurrences.
 * Uses z-[70] so it always renders above TaskDetailPopup (z-[60]) and DayPanel (z-50).
 */
export function RecurringCompleteDialog({
  open,
  mode,
  taskTitle,
  onThisOne,
  onAllOccurrences,
  onClose,
}: RecurringDialogProps) {
  const isDelete = mode === 'delete'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isDelete ? 'Delete recurring task' : 'Complete recurring task'}
      size="sm"
      containerClassName="z-[70]"
    >
      <div className="space-y-4">
        <p className="text-sm text-zinc-400">
          <span className="font-medium text-zinc-100">"{taskTitle}"</span> is a recurring task.
          {isDelete
            ? ' Would you like to delete just this occurrence, or delete all occurrences?'
            : ' Would you like to complete just this occurrence, or mark all occurrences as complete?'}
        </p>

        <div className="flex flex-col gap-2">
          <Button
            variant={isDelete ? 'danger' : 'primary'}
            className="w-full justify-center"
            onClick={() => {
              onThisOne()
              onClose()
            }}
          >
            {isDelete ? 'Delete this occurrence only' : 'Complete this occurrence only'}
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-center border border-surface-border"
            onClick={() => {
              onAllOccurrences()
              onClose()
            }}
          >
            {isDelete ? 'Delete all occurrences' : 'Complete all occurrences'}
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-center text-zinc-500"
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  )
}
