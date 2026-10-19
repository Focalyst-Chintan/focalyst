-- Migration: Add custom repeat options columns to reminders table

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reminders' AND column_name = 'custom_repeat_frequency') THEN
        ALTER TABLE public.reminders ADD COLUMN custom_repeat_frequency text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reminders' AND column_name = 'custom_repeat_every') THEN
        ALTER TABLE public.reminders ADD COLUMN custom_repeat_every integer;
    END IF;
END $$;
