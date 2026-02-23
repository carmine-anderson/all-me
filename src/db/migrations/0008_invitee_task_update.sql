-- ─────────────────────────────────────────────────────────────────────────────
-- AllMe — Allow accepted invitees to update task status
-- Run this in your Supabase SQL Editor AFTER 0007_task_times_recurrence.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- Accepted invitees can update status/completed_at on tasks they were invited to.
-- Owners already have full UPDATE via "Owners can update tasks" (from 0004).
CREATE POLICY "Invitees can update accepted shared tasks"
  ON tasks FOR UPDATE
  USING (
    id IN (
      SELECT task_id
      FROM task_invites
      WHERE invitee_id = auth.uid()
        AND status = 'accepted'
    )
  );
