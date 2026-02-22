-- ─────────────────────────────────────────────────────────────────────────────
-- AllMe — Friends, Notifications & Task Invites Migration
-- Run this in your Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ── friendships ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS friendships (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status        text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (requester_id, addressee_id),
  CHECK (requester_id != addressee_id)
);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Either party can view the friendship row
CREATE POLICY "Users can view their own friendships"
  ON friendships FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Only the requester can create a friendship request
CREATE POLICY "Users can send friend requests"
  ON friendships FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

-- Addressee can accept/decline; requester can cancel (delete handled separately)
CREATE POLICY "Users can update friendships they are part of"
  ON friendships FOR UPDATE
  USING (auth.uid() = addressee_id OR auth.uid() = requester_id);

-- Either party can remove the friendship
CREATE POLICY "Users can delete their own friendships"
  ON friendships FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- ── notifications ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  actor_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type          text NOT NULL CHECK (type IN ('friend_request', 'task_invite')),
  reference_id  uuid NOT NULL,  -- friendship.id OR task_invite.id
  read          boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.uid() = actor_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- ── task_invites ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_invites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  inviter_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invitee_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status      text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, invitee_id),
  CHECK (inviter_id != invitee_id)
);

ALTER TABLE task_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view task invites they are part of"
  ON task_invites FOR SELECT
  USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

CREATE POLICY "Users can create task invites"
  ON task_invites FOR INSERT
  WITH CHECK (auth.uid() = inviter_id);

CREATE POLICY "Invitee can respond to task invites"
  ON task_invites FOR UPDATE
  USING (auth.uid() = invitee_id OR auth.uid() = inviter_id);

CREATE POLICY "Users can delete task invites they created"
  ON task_invites FOR DELETE
  USING (auth.uid() = inviter_id);

-- ── Profiles: allow friends to read each other's profiles ─────────────────────
-- Drop the old restrictive policy first
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (
    auth.uid() = id
    OR id IN (
      SELECT CASE
        WHEN requester_id = auth.uid() THEN addressee_id
        ELSE requester_id
      END
      FROM friendships
      WHERE (requester_id = auth.uid() OR addressee_id = auth.uid())
        AND status = 'accepted'
    )
  );

-- ── RPC: search profiles by email (SECURITY DEFINER to access auth.users) ─────
CREATE OR REPLACE FUNCTION search_profiles_by_email(search_email text)
RETURNS TABLE (
  id          uuid,
  username    text,
  avatar_url  text,
  email       text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.username,
    p.avatar_url,
    u.email
  FROM profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE lower(u.email) = lower(trim(search_email))
    AND u.id != auth.uid()
  LIMIT 10;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION search_profiles_by_email(text) TO authenticated;

-- ── RPC: get friends list with email ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_friends_with_email(p_user_id uuid)
RETURNS TABLE (
  friendship_id  uuid,
  friend_id      uuid,
  username       text,
  avatar_url     text,
  email          text,
  status         text,
  requester_id   uuid,
  addressee_id   uuid,
  created_at     timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    f.id AS friendship_id,
    CASE WHEN f.requester_id = p_user_id THEN f.addressee_id ELSE f.requester_id END AS friend_id,
    p.username,
    p.avatar_url,
    u.email,
    f.status,
    f.requester_id,
    f.addressee_id,
    f.created_at
  FROM friendships f
  JOIN profiles p ON p.id = CASE WHEN f.requester_id = p_user_id THEN f.addressee_id ELSE f.requester_id END
  JOIN auth.users u ON u.id = p.id
  WHERE (f.requester_id = p_user_id OR f.addressee_id = p_user_id)
  ORDER BY f.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION get_friends_with_email(uuid) TO authenticated;

-- ── RPC: get notifications with actor info ────────────────────────────────────
CREATE OR REPLACE FUNCTION get_notifications_with_actor(p_user_id uuid)
RETURNS TABLE (
  id            uuid,
  user_id       uuid,
  actor_id      uuid,
  type          text,
  reference_id  uuid,
  read          boolean,
  created_at    timestamptz,
  actor_username  text,
  actor_avatar    text,
  actor_email     text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    n.id,
    n.user_id,
    n.actor_id,
    n.type,
    n.reference_id,
    n.read,
    n.created_at,
    p.username AS actor_username,
    p.avatar_url AS actor_avatar,
    u.email AS actor_email
  FROM notifications n
  JOIN profiles p ON p.id = n.actor_id
  JOIN auth.users u ON u.id = n.actor_id
  WHERE n.user_id = p_user_id
  ORDER BY n.created_at DESC
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION get_notifications_with_actor(uuid) TO authenticated;

-- ── Trigger: auto-update updated_at on friendships ───────────────────────────
CREATE TRIGGER friendships_updated_at
  BEFORE UPDATE ON friendships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER task_invites_updated_at
  BEFORE UPDATE ON task_invites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships (requester_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships (addressee_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_invites_invitee ON task_invites (invitee_id, status);
CREATE INDEX IF NOT EXISTS idx_task_invites_task ON task_invites (task_id);
