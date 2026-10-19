-- ============================================================
-- Migration: Fix countdowns table RLS policies
-- Ensures authenticated users can INSERT/SELECT/UPDATE/DELETE
-- their own rows only (user_id = auth.uid()).
-- ============================================================

-- 1. Create the table if it does not yet exist
CREATE TABLE IF NOT EXISTS public.countdowns (
    id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_name  text NOT NULL,
    target_date date NOT NULL,
    is_active   boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable Row Level Security
ALTER TABLE public.countdowns ENABLE ROW LEVEL SECURITY;

-- 3. Drop any stale policies so we can re-create them cleanly
DROP POLICY IF EXISTS "Users can view own countdowns"   ON public.countdowns;
DROP POLICY IF EXISTS "Users can insert own countdowns" ON public.countdowns;
DROP POLICY IF EXISTS "Users can update own countdowns" ON public.countdowns;
DROP POLICY IF EXISTS "Users can delete own countdowns" ON public.countdowns;

-- 4. SELECT — users may only read their own rows
CREATE POLICY "Users can view own countdowns"
    ON public.countdowns
    FOR SELECT
    USING (auth.uid() = user_id);

-- 5. INSERT — authenticated users may insert rows where user_id matches their UID
CREATE POLICY "Users can insert own countdowns"
    ON public.countdowns
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 6. UPDATE — users may only update their own rows
CREATE POLICY "Users can update own countdowns"
    ON public.countdowns
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 7. DELETE — users may only delete their own rows
CREATE POLICY "Users can delete own countdowns"
    ON public.countdowns
    FOR DELETE
    USING (auth.uid() = user_id);

-- 8. Grant table usage to the anon/authenticated roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.countdowns TO authenticated;
