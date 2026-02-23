-- ─────────────────────────────────────────────────────────────────────────────
-- AllMe — Task Times & Recurrence
-- Run this in your Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Add time and recurrence columns to tasks ──────────────────────────────────

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS start_time    time,
  ADD COLUMN IF NOT EXISTS end_time      time,
  ADD COLUMN IF NOT EXISTS is_recurring  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurrence_days text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS recurrence_end_date date;

-- ── Comment the new columns ───────────────────────────────────────────────────

COMMENT ON COLUMN tasks.start_time           IS 'Optional start time for the task (24hr, local time)';
COMMENT ON COLUMN tasks.end_time             IS 'Optional end time for the task (24hr, local time)';
COMMENT ON COLUMN tasks.is_recurring         IS 'Whether this task repeats on a weekly schedule';
COMMENT ON COLUMN tasks.recurrence_days      IS 'Days of week the task recurs: sun mon tue wed thu fri sat';
COMMENT ON COLUMN tasks.recurrence_end_date  IS 'Last date the recurrence applies (inclusive)';
