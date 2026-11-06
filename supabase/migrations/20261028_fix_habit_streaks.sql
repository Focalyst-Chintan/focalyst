-- Migration: Fix habit streak calculation and automate recalculation on log changes.
--
-- Rules:
-- 1. A day counts if the habit has at least one log on that calendar date in the user's timezone
--    (users.timezone, defaulting to Asia/Kolkata via public.mcp_user_tz).
--    Several logs on one day count as one day.
-- 2. Current streak: number of consecutive scheduled days ending today if today is logged,
--    or ending yesterday (or most recent scheduled day) if today is not logged yet.
--    If the last log is before yesterday (or before the most recent scheduled day), current streak is 0.
-- 3. Frequency & Day Numbering:
--    - Day numbering uses standard 0 = Sunday, 1 = Monday ... 6 = Saturday (matches extract(dow) and JS getDay).
--    - 'daily': every day is scheduled.
--    - 'custom': only days present in custom_days count; unscheduled days do not break the streak.
--    - Any non-daily frequency not based on custom_days is NOT treated as daily.
-- 4. Best streak: longest consecutive run of scheduled days in the full history recalculated from logs.
-- 5. Security:
--    - Internal functions (calculate_habit_streak, recalculate_all_habit_streaks, handle_habit_log_streak_change)
--      are revoked from public, anon, and authenticated.
--    - get_habit_streaks() takes no arguments, strictly reads auth.uid(), and is granted to authenticated only.

begin;

-- 1. Function to calculate and update current & best streak for a single habit
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
  v_today_is_sched boolean;
  v_today_logged boolean;

  -- Best streak tracking
  v_best_streak integer := 0;
  v_temp_run integer := 0;
  v_prev_sched_date date := null;
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
  if v_frequency = 'daily' then
    v_today_is_sched := true;
  elsif v_frequency = 'custom' and v_custom_days is not null and cardinality(v_custom_days) > 0 then
    v_today_is_sched := (extract(dow from v_today)::integer = any(v_custom_days));
  else
    -- Non-daily frequency without custom_days is not treated as daily
    v_today_is_sched := false;
  end if;

  v_today_logged := (v_today = any(v_dates));

  if v_today_is_sched and v_today_logged then
    -- Streak ends today
    v_curr_streak := 1;
    v_check_date := v_today - 1;
  else
    -- Today is either not scheduled or not logged yet.
    -- Find the most recent scheduled day strictly before today (yesterday or earlier).
    v_check_date := v_today - 1;
    v_last_sched_date := null;
    while v_check_date >= (v_today - 14) loop
      if v_frequency = 'daily' then
        v_is_sched := true;
      elsif v_frequency = 'custom' and v_custom_days is not null and cardinality(v_custom_days) > 0 then
        v_is_sched := (extract(dow from v_check_date)::integer = any(v_custom_days));
      else
        v_is_sched := false;
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

  -- Count backwards consecutive scheduled days
  if v_curr_streak > 0 then
    while v_check_date >= v_dates[1] loop
      if v_frequency = 'daily' then
        v_is_sched := true;
      elsif v_frequency = 'custom' and v_custom_days is not null and cardinality(v_custom_days) > 0 then
        v_is_sched := (extract(dow from v_check_date)::integer = any(v_custom_days));
      else
        v_is_sched := false;
      end if;

      if v_is_sched then
        if v_check_date = any(v_dates) then
          v_curr_streak := v_curr_streak + 1;
        else
          exit; -- streak ends
        end if;
      end if;
      v_check_date := v_check_date - 1;
    end loop;
  end if;

  -------------------------------------------------------------
  -- 5. Calculate Best Streak (longest run in full history)
  -------------------------------------------------------------
  v_temp_run := 0;
  v_prev_sched_date := null;

  for i in 1..v_log_count loop
    v_d := v_dates[i];
    if v_frequency = 'daily' then
      v_is_sched := true;
    elsif v_frequency = 'custom' and v_custom_days is not null and cardinality(v_custom_days) > 0 then
      v_is_sched := (extract(dow from v_d)::integer = any(v_custom_days));
    else
      v_is_sched := false;
    end if;

    if v_is_sched then
      if v_prev_sched_date is null then
        v_temp_run := 1;
      else
        -- Check if any scheduled day between v_prev_sched_date and v_d was missed
        v_missed_between := false;
        v_step := v_prev_sched_date + 1;
        while v_step < v_d loop
          if v_frequency = 'daily' then
            v_is_sched := true;
          elsif v_frequency = 'custom' and v_custom_days is not null and cardinality(v_custom_days) > 0 then
            v_is_sched := (extract(dow from v_step)::integer = any(v_custom_days));
          else
            v_is_sched := false;
          end if;

          if v_is_sched then
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

      v_prev_sched_date := v_d;
      if v_temp_run > v_best_streak then
        v_best_streak := v_temp_run;
      end if;
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

-- 2. User-facing function to return streaks for all habits of the authenticated user
drop function if exists public.get_habit_streaks(uuid);
create or replace function public.get_habit_streaks()
returns table (
  habit_id uuid,
  current_streak integer,
  best_streak integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  r record;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return;
  end if;

  for r in
    select id
      from public.habits
     where user_id = v_user_id
       and is_active is not false
  loop
    habit_id := r.id;
    select s.current_streak, s.best_streak
      into current_streak, best_streak
      from public.calculate_habit_streak(r.id) s;
    return next;
  end loop;
end;
$$;

-- Allow authenticated users to only read their own streaks; disallow anon/public
revoke all on function public.get_habit_streaks() from public, anon;
grant execute on function public.get_habit_streaks() to authenticated;

-- 3. Trigger on habit_logs to recalculate habit streaks automatically on insert, delete, or update
create or replace function public.handle_habit_log_streak_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_habit_id uuid;
begin
  v_habit_id := coalesce(new.habit_id, old.habit_id);
  if v_habit_id is not null then
    perform public.calculate_habit_streak(v_habit_id);
  end if;
  return coalesce(new, old);
end;
$$;

-- Lock down trigger handler function from public API
revoke all on function public.handle_habit_log_streak_change() from public, anon, authenticated;

drop trigger if exists trg_habit_logs_recalculate_streak on public.habit_logs;
create trigger trg_habit_logs_recalculate_streak
  after insert or update or delete on public.habit_logs
  for each row
  execute function public.handle_habit_log_streak_change();

-- 4. One-time recalculation function for all existing habits across all users
create or replace function public.recalculate_all_habit_streaks()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r record;
begin
  for r in select id from public.habits loop
    perform public.calculate_habit_streak(r.id);
  end loop;
end;
$$;

-- Lock down recalculate function from public API
revoke all on function public.recalculate_all_habit_streaks() from public, anon, authenticated;

-- Execute one-time recalculation across all users
select public.recalculate_all_habit_streaks();

commit;
