import type { Task, RecurrenceDay } from '@/types'

/**
 * Extract the real parent task UUID from a virtual instance ID.
 * Virtual IDs have the format: "virtual:{realUUID}:{YYYY-MM-DD}"
 * e.g. "virtual:550e8400-e29b-41d4-a716-446655440000:2026-02-25"
 */
export function getRealTaskId(id: string): string {
  if (!id.startsWith('virtual:')) return id
  // Split on ':' → ['virtual', uuid, 'YYYY-MM-DD']
  // UUID has no colons, date has no colons, so index 1 is always the UUID
  const parts = id.split(':')
  return parts[1] // the UUID
}

// Maps JS Date.getDay() (0=Sun) to RecurrenceDay strings
const DAY_INDEX_TO_KEY: RecurrenceDay[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

/**
 * Given a recurring task and a date window [windowStart, windowEnd] (YYYY-MM-DD inclusive),
 * returns an array of virtual task instances — one per matching recurrence date.
 *
 * Virtual instances have:
 *  - id prefixed with `virtual:${task.id}:${dateStr}` (never persisted)
 *  - dueDate set to the specific occurrence date
 *  - isVirtual = true
 *  - all other fields copied from the parent task
 */
export function expandRecurringTask(
  task: Task,
  windowStart: string,
  windowEnd: string
): Task[] {
  if (!task.isRecurring || task.recurrenceDays.length === 0) return []

  const recurrenceDaySet = new Set(task.recurrenceDays)

  // Effective start: the later of windowStart and task.createdAt date
  // (task.dueDate is not used for recurring tasks — they have no fixed due date)
  const taskOrigin = task.createdAt ? task.createdAt.slice(0, 10) : windowStart
  const effectiveStart = taskOrigin > windowStart ? taskOrigin : windowStart

  // Effective end: the earlier of windowEnd and recurrenceEndDate
  const effectiveEnd =
    task.recurrenceEndDate && task.recurrenceEndDate < windowEnd
      ? task.recurrenceEndDate
      : windowEnd

  if (effectiveStart > effectiveEnd) return []

  const instances: Task[] = []

  // Walk day by day through the window
  const cursor = parseDateStr(effectiveStart)
  const end = parseDateStr(effectiveEnd)

  while (cursor <= end) {
    const dayKey = DAY_INDEX_TO_KEY[cursor.getDay()]
    if (recurrenceDaySet.has(dayKey)) {
      const dateStr = toDateStr(cursor)
      instances.push({
        ...task,
        id: `virtual:${task.id}:${dateStr}`,
        dueDate: dateStr,
        isVirtual: true,
      })
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  return instances
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
