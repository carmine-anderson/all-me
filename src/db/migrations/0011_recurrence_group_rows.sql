-- ─────────────────────────────────────────────────────────────────────────────
-- AllMe — Recurrence Group Rows
-- Switches recurring tasks from virtual client-side expansion to real DB rows.
-- Each occurrence gets its own task row linked by recurrence_group_id.
-- Run this in your Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Add recurrence_group_id to tasks ──────────────────────────────────────
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS recurrence_group_id uuid;

COMMENT ON COLUMN tasks.recurrence_group_id IS
  'Groups all occurrence rows of a recurring series. '
  'The template task and all generated occurrences share the same value. '
  'NULL for non-recurring tasks.';

CREATE INDEX IF NOT EXISTS idx_tasks_recurrence_group_id
  ON tasks (recurrence_group_id)
  WHERE recurrence_group_id IS NOT NULL;

-- ── 2. Drop the occurrence completions table (no longer needed) ───────────────
DROP TABLE IF EXISTS task_occurrence_completions CASCADE;

-- ── 3. Drop the helper RPC (no longer needed) ────────────────────────────────
DROP FUNCTION IF EXISTS complete_task_occurrence(uuid, uuid, date, timestamptz);
