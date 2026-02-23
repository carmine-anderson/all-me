-- ─────────────────────────────────────────────────────────────────────────────
-- AllMe — Task Occurrence Completions
-- Tracks which specific dates of a recurring task have been individually
-- completed, without changing the parent task's status.
-- Run this in your Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS task_occurrence_completions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  occurrence_date date NOT NULL,
  completed_at    timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, user_id, occurrence_date)
);

COMMENT ON TABLE task_occurrence_completions IS
  'Records individual occurrence completions for recurring tasks. '
  'One row per (task, user, date) — the parent task row status is unaffected.';

-- ── Row-Level Security ────────────────────────────────────────────────────────

ALTER TABLE task_occurrence_completions ENABLE ROW LEVEL SECURITY;

-- Users can read their own completions
CREATE POLICY "Users can read own occurrence completions"
  ON task_occurrence_completions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own completions
CREATE POLICY "Users can insert own occurrence completions"
  ON task_occurrence_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own completions (needed for upsert conflict resolution)
CREATE POLICY "Users can update own occurrence completions"
  ON task_occurrence_completions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete (un-complete) their own completions
CREATE POLICY "Users can delete own occurrence completions"
  ON task_occurrence_completions FOR DELETE
  USING (auth.uid() = user_id);

-- ── Index for fast lookups by task ────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_occurrence_completions_task_user
  ON task_occurrence_completions (task_id, user_id);

-- ── RPC: safe upsert that never errors on duplicate ───────────────────────────
-- Called by the frontend instead of a raw INSERT to avoid 409 conflicts.

CREATE OR REPLACE FUNCTION complete_task_occurrence(
  p_task_id         uuid,
  p_user_id         uuid,
  p_occurrence_date date,
  p_completed_at    timestamptz DEFAULT now()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO task_occurrence_completions
    (task_id, user_id, occurrence_date, completed_at)
  VALUES
    (p_task_id, p_user_id, p_occurrence_date, p_completed_at)
  ON CONFLICT (task_id, user_id, occurrence_date)
  DO NOTHING;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION complete_task_occurrence TO authenticated;
