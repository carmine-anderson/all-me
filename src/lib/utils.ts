import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, isToday, isYesterday, isPast, parseISO } from 'date-fns'

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a date string for display */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const date = parseISO(dateStr)
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'MMM d, yyyy')
}

/** Format a date for relative display with overdue detection */
export function formatDueDate(dateStr: string | null | undefined): {
  label: string
  isOverdue: boolean
} {
  if (!dateStr) return { label: 'No due date', isOverdue: false }
  const date = parseISO(dateStr)
  const isOverdue = isPast(date) && !isToday(date)
  return {
    label: formatDate(dateStr),
    isOverdue,
  }
}

/** Format seconds into MM:SS */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** Get YYYY-MM-DD string for today */
export function todayString(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

/** Generate all dates for the past N weeks as YYYY-MM-DD strings */
export function generateHeatmapDates(weeks = 52): string[] {
  const dates: string[] = []
  const today = new Date()
  // Start from the Sunday of the week 52 weeks ago
  const start = new Date(today)
  start.setDate(today.getDate() - weeks * 7)
  // Align to Sunday
  start.setDate(start.getDate() - start.getDay())

  const current = new Date(start)
  while (current <= today) {
    dates.push(format(current, 'yyyy-MM-dd'))
    current.setDate(current.getDate() + 1)
  }
  return dates
}

/** Priority color mapping */
export const priorityColors: Record<string, string> = {
  low: 'text-blue-400 bg-blue-400/10',
  medium: 'text-amber-400 bg-amber-400/10',
  high: 'text-red-400 bg-red-400/10',
}

/** Status color mapping */
export const statusColors: Record<string, string> = {
  todo: 'text-zinc-400 bg-zinc-400/10',
  in_progress: 'text-brand-400 bg-brand-400/10',
  done: 'text-emerald-400 bg-emerald-400/10',
}

/** Productivity level to heatmap color */
export function heatmapColor(level: number): string {
  switch (level) {
    case 0:
      return 'bg-zinc-800 hover:bg-zinc-700'
    case 1:
      return 'bg-brand-950 hover:bg-brand-900'
    case 2:
      return 'bg-brand-800 hover:bg-brand-700'
    case 3:
      return 'bg-brand-600 hover:bg-brand-500'
    case 4:
      return 'bg-brand-500 hover:bg-brand-400'
    case 5:
      return 'bg-brand-400 hover:bg-brand-300'
    default:
      return 'bg-zinc-800'
  }
}

/** Productivity level label */
export function levelLabel(level: number): string {
  switch (level) {
    case 1: return 'Very low'
    case 2: return 'Low'
    case 3: return 'Moderate'
    case 4: return 'High'
    case 5: return 'Excellent'
    default: return 'No entry'
  }
}

/** Pick a random item from an array */
export function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
