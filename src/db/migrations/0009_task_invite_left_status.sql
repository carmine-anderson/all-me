-- ─────────────────────────────────────────────────────────────────────────────
-- AllMe — Add 'left' status to task_invites
-- Run this in your Supabase SQL Editor AFTER 0008_invitee_task_update.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- The task_invites.status column has a CHECK constraint from 0003 that only
-- allows 'pending', 'accepted', 'declined'. We need to drop and recreate it
-- to include 'left'.

-- 1. Drop the old CHECK constraint (Postgres names it automatically)
ALTER TABLE task_invites
  DROP CONSTRAINT IF EXISTS task_invites_status_check;

-- 2. Add the updated CHECK constraint including 'left'
ALTER TABLE task_invites
  ADD CONSTRAINT task_invites_status_check
  CHECK (status IN ('pending', 'accepted', 'declined', 'left'));

-- 3. Update column comment
COMMENT ON COLUMN task_invites.status IS
  'pending | accepted | declined | left — left means the invitee removed the task from their calendar';
