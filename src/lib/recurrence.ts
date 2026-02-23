import type { Task, RecurrenceDay } from '@/types'

// Maps JS Date.getDay() (0=Sun) to RecurrenceDay strings
const DAY_INDEX_TO_KEY: RecurrenceDay[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

/**
 * Given a recurring task template and a date window [windowStart, windowEnd]
 * (YYYY-MM-DD inclusive), returns an array of YYYY-MM-DD strings for every
 * day in the window that matches the task's recurrence schedule.
 *
 * Used when creating a recurring task to pre-generate all occurrence rows.
 */
export function generateOccurrenceDates(
  task: Pick<Task, 'recurrenceDays' | 'recurrenceEndDate' | 'createdAt'>,
  windowStart: string,
  windowEnd: string
): string[] {
  if (task.recurrenceDays.length === 0) return []

  const recurrenceDaySet = new Set(task.recurrenceDays)

  // Effective start: the later of windowStart and task creation date
  const taskOrigin = task.createdAt ? task.createdAt.slice(0, 10) : windowStart
  const effectiveStart = taskOrigin > windowStart ? taskOrigin : windowStart

  // Effective end: the earlier of windowEnd and recurrenceEndDate
  const effectiveEnd =
    task.recurrenceEndDate && task.recurrenceEndDate < windowEnd
      ? task.recurrenceEndDate
      : windowEnd

  if (effectiveStart > effectiveEnd) return []

  const dates: string[] = []
  const cursor = parseDateStr(effectiveStart)
  const end = parseDateStr(effectiveEnd)

  while (cursor <= end) {
    const dayKey = DAY_INDEX_TO_KEY[cursor.getDay()]
    if (recurrenceDaySet.has(dayKey)) {
      dates.push(toDateStr(cursor))
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  return dates
}

/** Parse a YYYY-MM-DD string into a local Date (midnight) */
function parseDateStr(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Format a local Date to YYYY-MM-DD */
function toDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Format a 24hr time string (HH:MM or HH:MM:SS) to a human-readable 12hr string.
 * e.g. "09:00" → "9:00 AM", "13:30" → "1:30 PM"
 */
export function formatTime(time: string | null | undefined): string {
  if (!time) return ''
  const [hourStr, minStr] = time.split(':')
  const hour = parseInt(hourStr, 10)
  const min = minStr ?? '00'
  const period = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  return `${h12}:${min} ${period}`
}

/**
 * Format a time range from two 24hr strings.
 * e.g. "09:00", "10:30" → "9:00 AM – 10:30 AM"
 */
export function formatTimeRange(start: string | null, end: string | null): string {
  if (!start) return ''
  if (!end) return formatTime(start)
  return `${formatTime(start)} – ${formatTime(end)}`
}

/**
 * Convert a HH:MM time string to total minutes from midnight.
 */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/**
 * Format recurrence days array to a human-readable string.
 * e.g. ['mon','wed','fri'] → "Mon, Wed, Fri"
 */
export function formatRecurrenceDays(days: RecurrenceDay[]): string {
  const labels: Record<RecurrenceDay, string> = {
    sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed',
    thu: 'Thu', fri: 'Fri', sat: 'Sat',
  }
  // Sort by day order
  const order: RecurrenceDay[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  return days
    .slice()
    .sort((a, b) => order.indexOf(a) - order.indexOf(b))
    .map((d) => labels[d])
    .join(', ')
}
