-- Migration: 20261101_fix_habit_streaks_bonus_and_custom.sql
-- Fix habit streak calculation for bonus days, custom frequencies, and ensure checking today always starts streak at >= 1.
--
-- Rules:
-- 1. If today is logged, current streak is ALWAYS >= 1.
-- 2. Custom frequency with null/empty custom_days defaults to scheduled (daily).
-- 3. Day of week supports both 0 and 7 for Sunday.
-- 4. Logged bonus days (unscheduled days) count toward current & best streak rather than being ignored.
-- 5. Backwards streak walk only terminates when a scheduled day was missed; unscheduled rest days without logs are skipped.
-- 6. Recalculates streaks for all habits in the database.

begin;

create or replace function public.calculate_habit_streak(
  p_habit_id uuid
)
returns table (
  current_streak integer,
  best_streak integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_frequency text;
  v_custom_days integer[];
  v_tz text;
  v_today date;
  v_dates date[];
  v_log_count integer;

  -- Current streak tracking
  v_curr_streak integer := 0;
  v_check_date date;
  v_is_sched boolean;
  v_last_sched_date date;
  v_today_logged boolean;
  v_dow integer;

  -- Best streak tracking
  v_best_streak integer := 0;
  v_temp_run integer := 0;
  v_prev_date date := null;
  v_d date;
  v_step date;
  v_missed_between boolean;
begin
  -- 1. Fetch habit info
  select user_id, frequency, custom_days
    into v_user_id, v_frequency, v_custom_days
    from public.habits
   where id = p_habit_id;

  if not found then
    current_streak := 0;
    best_streak := 0;
    return next;
    return;
  end if;

  -- 2. Determine user's timezone (default Asia/Kolkata)
  begin
    v_tz := public.mcp_user_tz(v_user_id);
  exception when others then
    select coalesce(nullif(timezone, ''), 'Asia/Kolkata')
      into v_tz
      from public.users
     where id = v_user_id;
  end;
  if v_tz is null or v_tz = '' then
    v_tz := 'Asia/Kolkata';
  end if;

  -- Today in user's timezone
  v_today := (now() at time zone v_tz)::date;

  -- 3. Fetch all distinct completed dates for this habit in ascending order
  select array_agg(completed_date order by completed_date asc)
    into v_dates
    from (
      select distinct completed_date
        from public.habit_logs
       where habit_id = p_habit_id
    ) t;

  v_log_count := coalesce(cardinality(v_dates), 0);

  if v_log_count = 0 then
    update public.habits
       set current_streak = 0,
           longest_streak = 0,
           updated_at = now()
     where id = p_habit_id;

    current_streak := 0;
    best_streak := 0;
    return next;
    return;
  end if;

  -------------------------------------------------------------
  -- 4. Calculate Current Streak
  -------------------------------------------------------------
  v_today_logged := (v_today = any(v_dates));

  if v_today_logged then
    -- Streak ends today (always >= 1)
    v_curr_streak := 1;
    v_check_date := v_today - 1;
  else
    -- Today is not logged yet.
    -- Find the most recent scheduled day strictly before today (yesterday or earlier).
    v_check_date := v_today - 1;
    v_last_sched_date := null;
    while v_check_date >= (v_today - 14) loop
      if v_frequency is null or v_frequency = 'daily' then
        v_is_sched := true;
      elsif v_frequency = 'custom' then
        if v_custom_days is null or cardinality(v_custom_days) = 0 then
          v_is_sched := true;
        else
          v_dow := extract(dow from v_check_date)::integer;
          v_is_sched := (v_dow = any(v_custom_days)) or (v_dow = 0 and 7 = any(v_custom_days));
        end if;
      else
        v_is_sched := true;
      end if;

      if v_is_sched then
        v_last_sched_date := v_check_date;
        exit;
      end if;
      v_check_date := v_check_date - 1;
    end loop;

    -- If the last scheduled date was logged, streak is still alive ending on that day.
    -- If it was NOT logged, streak broke, so current streak is 0.
    if v_last_sched_date is not null and (v_last_sched_date = any(v_dates)) then
      v_curr_streak := 1;
      v_check_date := v_last_sched_date - 1;
    else
      v_curr_streak := 0;
    end if;
  end if;

  -- Count backwards consecutive days
  if v_curr_streak > 0 then
    while v_check_date >= v_dates[1] loop
      if v_frequency is null or v_frequency = 'daily' then
        v_is_sched := true;
      elsif v_frequency = 'custom' then
        if v_custom_days is null or cardinality(v_custom_days) = 0 then
          v_is_sched := true;
        else
          v_dow := extract(dow from v_check_date)::integer;
          v_is_sched := (v_dow = any(v_custom_days)) or (v_dow = 0 and 7 = any(v_custom_days));
        end if;
      else
        v_is_sched := true;
      end if;

      if v_check_date = any(v_dates) then
        -- Logged on this day (scheduled or bonus day)
        v_curr_streak := v_curr_streak + 1;
      elsif v_is_sched then
        -- Scheduled day was missed -> streak ends
        exit;
      end if;
      -- Unscheduled day not logged -> skip without breaking streak

      v_check_date := v_check_date - 1;
    end loop;
  end if;

  -------------------------------------------------------------
  -- 5. Calculate Best Streak (longest run in full history)
  -------------------------------------------------------------
  v_temp_run := 0;
  v_prev_date := null;

  for i in 1..v_log_count loop
    v_d := v_dates[i];

    if v_prev_date is null then
      v_temp_run := 1;
    else
      -- Check if any scheduled day between v_prev_date and v_d was missed
      v_missed_between := false;
      v_step := v_prev_date + 1;
      while v_step < v_d loop
        if v_frequency is null or v_frequency = 'daily' then
          v_is_sched := true;
        elsif v_frequency = 'custom' then
          if v_custom_days is null or cardinality(v_custom_days) = 0 then
            v_is_sched := true;
          else
            v_dow := extract(dow from v_step)::integer;
            v_is_sched := (v_dow = any(v_custom_days)) or (v_dow = 0 and 7 = any(v_custom_days));
          end if;
        else
          v_is_sched := true;
        end if;

        if v_is_sched and not (v_step = any(v_dates)) then
          v_missed_between := true;
          exit;
        end if;
        v_step := v_step + 1;
      end loop;

      if v_missed_between then
        v_temp_run := 1;
      else
        v_temp_run := v_temp_run + 1;
      end if;
    end if;

    v_prev_date := v_d;
    if v_temp_run > v_best_streak then
      v_best_streak := v_temp_run;
    end if;
  end loop;

  if v_curr_streak > v_best_streak then
    v_best_streak := v_curr_streak;
  end if;

  -- 6. Update the stored columns on habits
  update public.habits
     set current_streak = v_curr_streak,
         longest_streak = v_best_streak,
         updated_at = now()
   where id = p_habit_id;

  current_streak := v_curr_streak;
  best_streak := v_best_streak;
  return next;
end;
$$;

-- Lock down internal calculation function from public API
revoke all on function public.calculate_habit_streak(uuid) from public, anon, authenticated;

-- Execute one-time recalculation across all users
do $$
declare
  r record;
begin
  for r in select id from public.habits loop
    perform public.calculate_habit_streak(r.id);
  end loop;
end;
$$;

commit;

