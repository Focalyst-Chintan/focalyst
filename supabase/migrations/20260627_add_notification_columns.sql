-- ============================================================
-- Migration: Add Notification Infrastructure Columns to Users
-- Adds push token storage, notification preference toggles,
-- and timezone for server-driven push notification scheduling.
-- ============================================================

-- 1. Add push token column for Expo Push Notifications
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS expo_push_token TEXT;

-- 2. Add notification preference toggles (all default to TRUE)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS task_reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS habit_reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS pomodoro_alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE;

-- 3. Add timezone column for local-time-aware server notifications
-- Stores IANA timezone string, e.g. 'Asia/Kolkata', 'America/New_York'
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS timezone TEXT;

-- 4. Add indexes for cron query patterns (edge functions filter by preference)
CREATE INDEX IF NOT EXISTS idx_users_task_reminders
  ON public.users(task_reminders_enabled)
  WHERE task_reminders_enabled = TRUE;

CREATE INDEX IF NOT EXISTS idx_users_habit_reminders
  ON public.users(habit_reminders_enabled)
  WHERE habit_reminders_enabled = TRUE;

CREATE INDEX IF NOT EXISTS idx_users_push_token
  ON public.users(expo_push_token)
  WHERE expo_push_token IS NOT NULL;

-- 5. Backward compatibility: drop old unqualified columns if they exist
-- The profile screen was previously writing to task_reminders / habit_reminders / pomodoro_alerts
-- without the _enabled suffix. We migrate the data then drop the old columns.
DO $$
BEGIN
  -- Migrate task_reminders → task_reminders_enabled
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'task_reminders'
  ) THEN
    UPDATE public.users
      SET task_reminders_enabled = task_reminders
      WHERE task_reminders IS NOT NULL;
    ALTER TABLE public.users DROP COLUMN task_reminders;
  END IF;

  -- Migrate habit_reminders → habit_reminders_enabled
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'habit_reminders'
  ) THEN
    UPDATE public.users
      SET habit_reminders_enabled = habit_reminders
      WHERE habit_reminders IS NOT NULL;
    ALTER TABLE public.users DROP COLUMN habit_reminders;
  END IF;

  -- Migrate pomodoro_alerts → pomodoro_alerts_enabled
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'pomodoro_alerts'
  ) THEN
    UPDATE public.users
      SET pomodoro_alerts_enabled = pomodoro_alerts
      WHERE pomodoro_alerts IS NOT NULL;
    ALTER TABLE public.users DROP COLUMN pomodoro_alerts;
  END IF;
END $$;
