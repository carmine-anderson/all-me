-- ─────────────────────────────────────────────────────────────────────────────
-- AllMe — Notification Auto-Delete Migration
-- Run this in your Supabase SQL Editor
--
-- Requires the pg_cron extension to be enabled in your Supabase project.
-- Enable it via: Dashboard → Database → Extensions → pg_cron
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Enable pg_cron (idempotent) ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ── Grant pg_cron usage to postgres role (required by Supabase) ───────────────
GRANT USAGE ON SCHEMA cron TO postgres;

-- ── Scheduled job: delete notifications older than 3 days ────────────────────
-- Runs every hour so stale rows are cleaned up promptly without hammering the DB.
SELECT cron.schedule(
  'delete-old-notifications',   -- unique job name (idempotent if re-run)
  '0 * * * *',                  -- every hour at :00
  $$
    DELETE FROM public.notifications
    WHERE created_at < now() - INTERVAL '3 days';
  $$
);

-- ── (Optional) immediate one-off cleanup of any already-stale rows ────────────
DELETE FROM public.notifications
WHERE created_at < now() - INTERVAL '3 days';
