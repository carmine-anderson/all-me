import type { ProductivityLevel } from '@/types'

export interface FeedbackConfig {
  messages: string[]
  emoji: string
  color: string
  celebrate: boolean // trigger confetti for high levels
}

export const feedbackConfig: Record<ProductivityLevel, FeedbackConfig> = {
  1: {
    emoji: '🌱',
    color: 'text-zinc-300',
    celebrate: false,
    messages: [
      "Hey, you showed up. That's everything. Tomorrow is a fresh start 🌱",
      "Even the slowest days move you forward. Rest up, champ 💪",
      "Not every day is a 10/10 — and that's perfectly okay. You're still here.",
      "The fact that you checked in means you care. That matters more than you know.",
      "Rest is productive too. Recharge tonight, we'll get 'em tomorrow 🌙",
    ],
  },
  2: {
    emoji: '🌤️',
    color: 'text-zinc-200',
    celebrate: false,
    messages: [
      "A little progress is still progress. You moved the needle today 🌤️",
      "Some days are warm-up days. You're building momentum.",
      "Not your best, but you showed up — and that's the hardest part.",
      "Every small step counts. You're further along than you were yesterday.",
      "Low-key days are part of the journey. Keep going 🚶",
    ],
  },
  3: {
    emoji: '⚡',
    color: 'text-brand-300',
    celebrate: false,
    messages: [
      "Solid day! You kept the engine running ⚡",
      "Steady and consistent — that's how goals get reached.",
      "A good, honest day's work. Be proud of that.",
      "Middle of the road is still moving forward. Nice work!",
      "Consistency beats intensity every time. You're doing great 🎯",
    ],
  },
  4: {
    emoji: '🔥',
    color: 'text-amber-300',
    celebrate: true,
    messages: [
      "You're on fire today! 🔥 Keep that energy going!",
      "High-output day — you should be really proud of yourself.",
      "That's what we're talking about! Crushing it 💪",
      "You brought your A-game today. Seriously impressive.",
      "Days like this are why you started. Amazing work! 🚀",
    ],
  },
  5: {
    emoji: '🏆',
    color: 'text-brand-400',
    celebrate: true,
    messages: [
      "LEGENDARY day. You absolutely crushed it! 🏆",
      "Top tier performance. You should be incredibly proud 🌟",
      "This is what peak looks like. Absolutely phenomenal!",
      "You didn't just meet the bar — you raised it. Outstanding! ⭐",
      "Maximum productivity unlocked! You're unstoppable today 🚀🔥",
    ],
  },
}

export function getFeedback(level: ProductivityLevel): { message: string } & Omit<FeedbackConfig, 'messages'> {
  const config = feedbackConfig[level]
  const message = config.messages[Math.floor(Math.random() * config.messages.length)]
  return {
    message,
    emoji: config.emoji,
    color: config.color,
    celebrate: config.celebrate,
  }
}
