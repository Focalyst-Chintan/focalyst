-- ============================================================
-- Migration: Deduplicate Active Countdowns
-- Keeps only the earliest created active countdown row when
-- user_id, lower(trim(event_name)), and target calendar date are identical.
-- ============================================================

-- 1. Deactivate redundant duplicate active countdowns
WITH duplicates AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY user_id, LOWER(TRIM(event_name)), (target_date AT TIME ZONE 'UTC')::date
               ORDER BY created_at ASC, id ASC
           ) AS rn
    FROM public.countdowns
    WHERE is_active = true
)
UPDATE public.countdowns
SET is_active = false
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);

-- 2. Optional: Delete completely redundant inactive duplicate rows created above
DELETE FROM public.countdowns
WHERE id IN (
    WITH dupes_all AS (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY user_id, LOWER(TRIM(event_name)), (target_date AT TIME ZONE 'UTC')::date
                   ORDER BY is_active DESC, created_at ASC, id ASC
               ) AS rn
        FROM public.countdowns
    )
    SELECT id FROM dupes_all WHERE rn > 1
);
