-- ─────────────────────────────────────────────────────────────────────────────
-- AllMe — Fix: Allow invitees to read tasks they have accepted
-- Run this in your Supabase SQL Editor AFTER 0003_friends_notifications.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- The original "Users can manage own tasks" policy (from 0001) uses FOR ALL,
-- which means its USING clause applies to SELECT too — blocking invitees from
-- reading tasks they don't own. We split it into explicit per-operation policies
-- and add a SELECT policy that also covers accepted invitees.

-- 1. Drop the original catch-all policy
DROP POLICY IF EXISTS "Users can manage own tasks" ON tasks;

-- 2. Owners can INSERT their own tasks
CREATE POLICY "Owners can insert tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. Owners can UPDATE their own tasks
CREATE POLICY "Owners can update tasks"
  ON tasks FOR UPDATE
  USING (auth.uid() = user_id);

-- 4. Owners can DELETE their own tasks
CREATE POLICY "Owners can delete tasks"
  ON tasks FOR DELETE
  USING (auth.uid() = user_id);

-- 5. SELECT: owners AND invitees with an accepted invite can read the task
CREATE POLICY "Users can view own and accepted shared tasks"
  ON tasks FOR SELECT
  USING (
    auth.uid() = user_id
    OR id IN (
      SELECT task_id
      FROM task_invites
      WHERE invitee_id = auth.uid()
        AND status = 'accepted'
    )
  );
