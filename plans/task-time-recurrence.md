# Plan: Task Times, 24-Hour Day View & Recurring Events

## Overview

Three major capabilities are being added to AllMe:
1. **Start/End times** on tasks (stored as `time` columns in Postgres)
2. **24-hour day view** when clicking a calendar day (Google Calendar-style timeline with overlap handling)
3. **Recurring tasks** with day-of-week selection and an end date

---

## Architecture Diagram

```
TaskForm
  └─ startTime, endTime, recurrence fields
       └─ useCreateTask / useUpdateTask
            └─ tasks table (start_time, end_time, is_recurring, recurrence_days, recurrence_end_date)
                 └─ useTasks / mapRow
                      └─ useRecurrenceExpander (lib/recurrence.ts)
                           ├─ CalendarPage tasksByDate (chips on month grid)
                           └─ DayPanel — 24hr Timeline
                                ├─ TimelineBlock (timed tasks, overlap columns)
                                └─ AllDayStrip (untimed tasks)
                      └─ TaskDetailPopup (time + recurrence display)
```

---

## Phase 1 — Database & Schema

### Migration `src/db/migrations/0007_task_times_recurrence.sql`

Adds 5 new nullable columns to the existing `tasks` table:

| Column | Type | Notes |
|---|---|---|
| `start_time` | `time` | nullable — HH:MM 24hr |
| `end_time` | `time` | nullable — HH:MM 24hr |
| `is_recurring` | `boolean` | default false |
| `recurrence_days` | `text[]` | e.g. `{mon,wed,fri}` |
| `recurrence_end_date` | `date` | nullable — when recurrence stops |

No separate recurrence table — all recurrence data lives inline on the task row (simple weekly recurrence only).

### `src/db/schema.ts`

Add the 5 new columns to the `tasks` table definition. Add corresponding type exports.

### `src/types/index.ts`

- Add `startTime`, `endTime`, `isRecurring`, `recurrenceDays`, `recurrenceEndDate` to the `Task` interface
- Add same fields to `TaskFormValues`
- Add `RecurrenceDay = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'` type

---

## Phase 2 — TaskForm UI

### `src/components/tasks/TaskForm.tsx`

New form sections added below the existing "Due Date" field:

**Time section** (always visible):
- `Start Time` — `<input type="time">` (24hr native picker)
- `End Time` — `<input type="time">` (validated: must be after start if both provided)

**Recurring section** (toggle to reveal):
- Toggle switch: "Make this recurring"
- When toggled ON, reveals:
  - **Day-of-week pill selector** — 7 pills (S M T W T F S), multi-select, at least one required
  - **Repeat until** — `<input type="date">` for the recurrence end date

Zod schema additions:
```ts
startTime: z.string().regex(/^\d{2}:\d{2}$/).optional()
endTime: z.string().regex(/^\d{2}:\d{2}$/).optional()
isRecurring: z.boolean().default(false)
recurrenceDays: z.array(z.enum(['sun','mon','tue','wed','thu','fri','sat'])).optional()
recurrenceEndDate: z.string().optional()
```
Refinement: if `isRecurring` is true, `recurrenceDays` must have >= 1 entry.

---

## Phase 3 — Data Layer

### `src/hooks/useTasks.ts`

- **`mapRow`** — map `start_time`, `end_time`, `is_recurring`, `recurrence_days`, `recurrence_end_date` from DB row
- **`useCreateTask`** — include new fields in the INSERT
- **`useUpdateTask`** — include new fields in the UPDATE

### New utility: `src/lib/recurrence.ts`

```ts
expandRecurringTask(task: Task, windowStart: string, windowEnd: string): Task[]
```

Given a recurring task and a date window (e.g. the current calendar month), returns an array of **virtual task instances** — one per matching recurrence date. Each virtual instance has:
- `id` prefixed with `virtual:${task.id}:${dateStr}` so they are never mutated
- `dueDate` set to the specific occurrence date
- All other fields copied from the parent task

Used by `CalendarPage.tsx` to populate `tasksByDate` with recurring occurrences.

---

## Phase 4 — 24-Hour Day View (DayPanel Redesign)

### `src/components/calendar/DayPanel.tsx`

The panel is redesigned from a simple task list into a Google Calendar-style 24-hour timeline.

**Layout structure:**
```
┌─────────────────────────────────────┐
│  Header: weekday, date, Today badge  │
│  [Add Task]                          │
├─────────────────────────────────────┤
│  All-day strip (tasks with no time)  │
├──────┬──────────────────────────────┤
│ 12am │                              │
│  1am │                              │
│  ...  │  Task A (9:00-10:00)        │
│  ...  │  Task B    Task C  (overlap) │
│ 11pm │                              │
└──────┴──────────────────────────────┘
```

**Implementation details:**

1. **Hour grid** — 24 rows, each 60px tall (1440px total scrollable height). Auto-scroll to current hour on open.
2. **Timed task blocks** — absolutely positioned. `top = (startHour * 60 + startMin) * px_per_min`. `height = duration_in_mins * px_per_min`.
3. **Overlap detection** — groups tasks whose time ranges intersect, assigns each a column index and width fraction (e.g. 2 overlapping tasks each get 50% width).
4. **All-day strip** — tasks with no `startTime` appear in a compact list above the timeline.
5. **Current time indicator** — a red horizontal line at the current time (only shown for today).
6. **Clicking a timed block** — opens `TaskDetailPopup`.
7. **Clicking an empty time slot** — opens `TaskForm` with `dueDate` and `startTime` pre-filled.

### `src/pages/CalendarPage.tsx`

- Import `expandRecurringTask` from `src/lib/recurrence.ts`
- In the `tasksByDate` memo, after mapping own tasks, iterate recurring tasks and call `expandRecurringTask` for the current month window, merging virtual instances into the map
- Virtual instances show on the calendar grid chips just like real tasks

---

## Phase 5 — TaskDetailPopup Updates

### `src/components/calendar/TaskDetailPopup.tsx`

Add two new info rows in the body:

- **Time row** — clock icon + "9:00 AM – 10:30 AM" (formatted from 24hr stored values)
- **Recurrence row** — repeat icon + "Every Mon, Wed, Fri until Mar 31, 2026"

Both rows are conditionally rendered (only when the data exists).

---

## File Change Summary

| File | Change Type |
|---|---|
| `src/db/migrations/0007_task_times_recurrence.sql` | **New** |
| `src/db/schema.ts` | **Modify** — add 5 columns |
| `src/types/index.ts` | **Modify** — extend Task, TaskFormValues, add RecurrenceDay |
| `src/components/tasks/TaskForm.tsx` | **Modify** — time pickers + recurrence UI |
| `src/hooks/useTasks.ts` | **Modify** — mapRow, create, update |
| `src/lib/recurrence.ts` | **New** — expansion utility |
| `src/components/calendar/DayPanel.tsx` | **Rewrite** — 24hr timeline |
| `src/components/calendar/TaskDetailPopup.tsx` | **Modify** — time + recurrence display |
| `src/pages/CalendarPage.tsx` | **Modify** — recurring task expansion in tasksByDate |

---

## Key Design Decisions

1. **No separate recurrence table** — weekly recurrence with a fixed end date is simple enough to store inline on the task row. This avoids complex JOIN queries and keeps the data model flat.
2. **Virtual instances** — recurring tasks are expanded client-side in a memo, not stored as separate DB rows. This keeps the DB clean and avoids row explosion.
3. **`time` type in Postgres** — stored as `HH:MM:SS`, displayed as `HH:MM`. Timezone-naive (user's local time), correct for a personal calendar.
4. **60px per hour** — gives enough height for readable event blocks while keeping the full 24hr view at 1440px (scrollable).
5. **Overlap algorithm** — a sweep-line approach: sort by start time, group overlapping intervals, assign column indices within each group.
