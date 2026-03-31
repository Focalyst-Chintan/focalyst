CREATE OR REPLACE FUNCTION increment_daily_focus(
    p_user_id UUID,
    p_date DATE,
    p_focus_mins FLOAT,
    p_break_mins FLOAT
) RETURNS void AS $$
BEGIN
    INSERT INTO public.daily_focus_activity (user_id, date, focus_time_minutes, break_time_minutes)
    VALUES (p_user_id, p_date, p_focus_mins, p_break_mins)
    ON CONFLICT (user_id, date) DO UPDATE 
    SET 
        focus_time_minutes = daily_focus_activity.focus_time_minutes + EXCLUDED.focus_time_minutes,
        break_time_minutes = daily_focus_activity.break_time_minutes + EXCLUDED.break_time_minutes,
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
