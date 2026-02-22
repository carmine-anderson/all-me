-- ─────────────────────────────────────────────────────────────────────────────
-- AllMe — Task Invites with Invitee Profile RPC
-- Run this in your Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ── RPC: get all invites for a task, enriched with invitee profile info ────────
-- SECURITY DEFINER so we can join auth.users for the invitee's email.
-- The caller must own the task (inviter_id = auth.uid()) OR be an invitee.
CREATE OR REPLACE FUNCTION get_task_invites_with_invitee(p_task_id uuid)
RETURNS TABLE (
  invite_id     uuid,
  task_id       uuid,
  inviter_id    uuid,
  invitee_id    uuid,
  status        text,
  created_at    timestamptz,
  updated_at    timestamptz,
  invitee_username  text,
  invitee_avatar    text,
  invitee_email     text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ti.id           AS invite_id,
    ti.task_id,
    ti.inviter_id,
    ti.invitee_id,
    ti.status,
    ti.created_at,
    ti.updated_at,
    p.username      AS invitee_username,
    p.avatar_url    AS invitee_avatar,
    u.email         AS invitee_email
  FROM task_invites ti
  JOIN profiles p ON p.id = ti.invitee_id
  JOIN auth.users u ON u.id = ti.invitee_id
  WHERE ti.task_id = p_task_id
    AND (
      -- Only the task owner (inviter) or an invitee can see the invite list
      ti.inviter_id = auth.uid()
      OR ti.invitee_id = auth.uid()
    )
  ORDER BY ti.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION get_task_invites_with_invitee(uuid) TO authenticated;
