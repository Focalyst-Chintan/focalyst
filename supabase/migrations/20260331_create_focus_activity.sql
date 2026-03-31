-- Create daily_focus_activity table
CREATE TABLE IF NOT EXISTS public.daily_focus_activity (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    focus_time_minutes FLOAT DEFAULT 0,
    break_time_minutes FLOAT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, date)
);

-- RLS policies
ALTER TABLE public.daily_focus_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own focus activity"
    ON public.daily_focus_activity FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own focus activity"
    ON public.daily_focus_activity FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own focus activity"
    ON public.daily_focus_activity FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own focus activity"
    ON public.daily_focus_activity FOR DELETE
    USING (auth.uid() = user_id);
