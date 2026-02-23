import { useState } from 'react'
import { motion } from 'framer-motion'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import { useUIStore } from '@/store/uiStore'
import { useUpsertCheckin, useTodayCheckin } from '@/hooks/useProductivity'
import { cn } from '@/lib/utils'
import type { ProductivityLevel } from '@/types'
import toast from 'react-hot-toast'

const LEVELS: { level: ProductivityLevel; emoji: string; label: string; description: string }[] = [
  { level: 1, emoji: '😔', label: 'Very Low', description: 'Struggled today' },
  { level: 2, emoji: '😐', label: 'Low', description: 'Below average' },
  { level: 3, emoji: '🙂', label: 'Moderate', description: 'Decent day' },
  { level: 4, emoji: '😊', label: 'High', description: 'Productive!' },
  { level: 5, emoji: '🚀', label: 'Excellent', description: 'Crushed it!' },
]

export function ProductivityCheckin() {
  const { checkinModalOpen, setCheckinModalOpen, showFeedback } = useUIStore()
  const todayCheckin = useTodayCheckin()
  const { mutateAsync: upsertCheckin, isPending } = useUpsertCheckin()

  const [selectedLevel, setSelectedLevel] = useState<ProductivityLevel | null>(
    todayCheckin?.level ?? null
  )
  const [note, setNote] = useState(todayCheckin?.note ?? '')

  const handleSubmit = async () => {
    if (!selectedLevel) return
    try {
      await upsertCheckin({ level: selectedLevel, note: note || undefined })
      setCheckinModalOpen(false)
      showFeedback(selectedLevel)
    } catch {
      toast.error('Failed to save check-in. Please try again.')
    }
  }

  const alreadyCheckedIn = !!todayCheckin

  return (
    <Modal
      open={checkinModalOpen}
      onClose={() => setCheckinModalOpen(false)}
      title="How productive were you today?"
      size="md"
    >
      {alreadyCheckedIn ? (
        <div className="space-y-6">
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <span className="text-5xl">
              {LEVELS.find((l) => l.level === todayCheckin.level)?.emoji ?? '✅'}
            </span>
            <p className="text-base font-medium text-zinc-200">
              You've already checked in today!
            </p>
            <p className="text-sm text-zinc-400">
              You rated your productivity as{' '}
              <span className="font-semibold text-brand-400">
                {LEVELS.find((l) => l.level === todayCheckin.level)?.label}
              </span>
              {todayCheckin.note && (
                <>
                  {' '}with the note: <span className="italic">"{todayCheckin.note}"</span>
                </>
              )}
              .
            </p>
            <p className="text-xs text-zinc-500">Come back tomorrow to check in again.</p>
          </div>
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => setCheckinModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Level selector */}
          <div className="grid grid-cols-5 gap-2">
            {LEVELS.map(({ level, emoji, label, description }) => (
              <motion.button
                key={level}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedLevel(level)}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all duration-150',
                  selectedLevel === level
                    ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                    : 'border-surface-border bg-surface-elevated text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                )}
              >
                <span className="text-2xl">{emoji}</span>
                <span className="text-xs font-medium">{label}</span>
                <span className="hidden text-[10px] text-zinc-500 sm:block">{description}</span>
              </motion.button>
            ))}
          </div>

          {/* Note */}
          <Textarea
            label="Add a note (optional)"
            placeholder="What did you work on? Any wins or blockers?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
          />

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setCheckinModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!selectedLevel}
              loading={isPending}
              onClick={handleSubmit}
            >
              Save Check-in
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
