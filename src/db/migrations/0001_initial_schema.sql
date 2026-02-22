-- ─────────────────────────────────────────────────────────────────────────────
-- AllMe — Initial Schema Migration
-- Run this in your Supabase SQL Editor, or via: npx drizzle-kit migrate
-- ─────────────────────────────────────────────────────────────────────────────

-- ── profiles ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    text,
  avatar_url  text,
  timezone    text NOT NULL DEFAULT 'UTC',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- ── productivity_checkins ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS productivity_checkins (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  checkin_date  date NOT NULL,
  level         smallint NOT NULL CHECK (level BETWEEN 1 AND 5),
  note          text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, checkin_date)
);

ALTER TABLE productivity_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own checkins"
  ON productivity_checkins FOR ALL
  USING (auth.uid() = user_id);

-- ── tasks ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title         text NOT NULL,
  description   text,
  due_date      date,
  priority      text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status        text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  completed_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own tasks"
  ON tasks FOR ALL
  USING (auth.uid() = user_id);

-- ── pomodoro_sessions ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pomodoro_sessions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_id        uuid REFERENCES tasks(id) ON DELETE SET NULL,
  started_at     timestamptz NOT NULL,
  ended_at       timestamptz,
  duration_mins  smallint NOT NULL DEFAULT 25,
  session_type   text NOT NULL DEFAULT 'work' CHECK (session_type IN ('work', 'short_break', 'long_break')),
  completed      boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE pomodoro_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own pomodoro sessions"
  ON pomodoro_sessions FOR ALL
  USING (auth.uid() = user_id);

-- ── Trigger: auto-create profile on signup ────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── Trigger: auto-update updated_at ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Indexes for performance ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_checkins_user_date ON productivity_checkins (user_id, checkin_date DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_user_due ON tasks (user_id, due_date ASC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks (user_id, status);
CREATE INDEX IF NOT EXISTS idx_pomodoro_user ON pomodoro_sessions (user_id, started_at DESC);
