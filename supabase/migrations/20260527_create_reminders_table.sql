-- ============================================================
-- Migration: Create and Configure Reminders Table
-- Ensures the table exists with the exact columns, indexes,
-- and RLS policies required for the mobile app calendar scheduler.
-- ============================================================

-- 1. Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.reminders (
    id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title       text NOT NULL,
    all_day     boolean NOT NULL DEFAULT false,
    start_time  text NOT NULL DEFAULT '08:00 AM',
    end_time    text NOT NULL DEFAULT '09:00 AM',
    repeat      text NOT NULL DEFAULT 'Never',
    day         date NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- 2. Add individual columns in case the table exists but is missing fields (for robust backward compatibility)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reminders' AND column_name = 'user_id') THEN
        ALTER TABLE public.reminders ADD COLUMN user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reminders' AND column_name = 'title') THEN
        ALTER TABLE public.reminders ADD COLUMN title text NOT NULL DEFAULT '';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reminders' AND column_name = 'all_day') THEN
        ALTER TABLE public.reminders ADD COLUMN all_day boolean NOT NULL DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reminders' AND column_name = 'start_time') THEN
        ALTER TABLE public.reminders ADD COLUMN start_time text NOT NULL DEFAULT '08:00 AM';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reminders' AND column_name = 'end_time') THEN
        ALTER TABLE public.reminders ADD COLUMN end_time text NOT NULL DEFAULT '09:00 AM';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reminders' AND column_name = 'repeat') THEN
        ALTER TABLE public.reminders ADD COLUMN repeat text NOT NULL DEFAULT 'Never';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reminders' AND column_name = 'day') THEN
        ALTER TABLE public.reminders ADD COLUMN day date;
    END IF;
END $$;

-- Ensure the day column has NOT NULL constraint if it was added dynamically
ALTER TABLE public.reminders ALTER COLUMN day SET NOT NULL;

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- 4. Drop any duplicate policies to avoid conflict
DROP POLICY IF EXISTS "Users can manage own reminders" ON public.reminders;
DROP POLICY IF EXISTS "Users can view own reminders" ON public.reminders;
DROP POLICY IF EXISTS "Users can insert own reminders" ON public.reminders;
DROP POLICY IF EXISTS "Users can update own reminders" ON public.reminders;
DROP POLICY IF EXISTS "Users can delete own reminders" ON public.reminders;

-- 5. Create RLS Policies
-- SELECT: Users can only view their own reminders
CREATE POLICY "Users can view own reminders"
    ON public.reminders
    FOR SELECT
    USING (auth.uid() = user_id);

-- INSERT: Authenticated users can insert reminders for themselves
CREATE POLICY "Users can insert own reminders"
    ON public.reminders
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update their own reminders
CREATE POLICY "Users can update own reminders"
    ON public.reminders
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can delete their own reminders
CREATE POLICY "Users can delete own reminders"
    ON public.reminders
    FOR DELETE
    USING (auth.uid() = user_id);

-- 6. Add performance indexes for standard queries
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON public.reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_day ON public.reminders(day);
CREATE INDEX IF NOT EXISTS idx_reminders_user_day ON public.reminders(user_id, day);

-- 7. Grant access rights
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reminders TO authenticated;
