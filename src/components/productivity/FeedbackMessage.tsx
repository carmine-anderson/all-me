import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { useUIStore } from '@/store/uiStore'
import { Button } from '@/components/ui/Button'
import { getFeedback } from '@/lib/feedbackMessages'
import type { ProductivityLevel } from '@/types'

export function FeedbackMessage() {
  const { feedbackVisible, feedbackLevel, hideFeedback } = useUIStore()
  const hasConfettied = useRef(false)

  const feedback =
    feedbackLevel !== null ? getFeedback(feedbackLevel as ProductivityLevel) : null

  useEffect(() => {
    if (feedbackVisible && feedback?.celebrate && !hasConfettied.current) {
      hasConfettied.current = true
      // Fire confetti
      const duration = 2500
      const end = Date.now() + duration
      const colors = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0']

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors,
        })
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors,
        })
        if (Date.now() < end) requestAnimationFrame(frame)
      }
      frame()
    }

    if (!feedbackVisible) {
      hasConfettied.current = false
    }
  }, [feedbackVisible, feedback?.celebrate])

  // Auto-dismiss after 6 seconds
  useEffect(() => {
    if (!feedbackVisible) return
    const timer = setTimeout(hideFeedback, 6000)
    return () => clearTimeout(timer)
  }, [feedbackVisible, hideFeedback])

  return (
    <AnimatePresence>
      {feedbackVisible && feedback && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={hideFeedback}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="mx-4 max-w-md rounded-2xl border border-surface-border bg-surface-card p-8 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 400, damping: 20 }}
              className="mb-4 text-6xl"
            >
              {feedback.emoji}
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`text-lg font-semibold leading-relaxed ${feedback.color}`}
            >
              {feedback.message}
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-6"
            >
              <Button variant="secondary" onClick={hideFeedback} size="sm">
                Thanks! 👋
              </Button>
            </motion.div>

            <p className="mt-3 text-xs text-zinc-600">Click anywhere to dismiss</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
