-- ============================================================================
-- Focalyst Core App Schema · Azure PostgreSQL Schema
-- Phase 5 Migration
-- Tables: users (profiles), tasks, subtasks, habits, habit_logs,
--         habit_groups, habit_group_members, pomodoro_sessions (focus_sessions),
--         reminders (calendar_events), countdowns, notes, xp_logs
-- ============================================================================

-- ============================================================================
-- 1. Auth Schema Compatibility
-- ============================================================================
create schema if not exists auth;

create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create table if not exists auth.users (
  id uuid primary key,
  email text
);

-- ============================================================================
-- 2. Custom Types
-- ============================================================================
do $$ begin
  create type public.process_status_tier as enum ('idle', 'processing', 'done', 'failed');
exception when duplicate_object then null;
end $$;

-- ============================================================================
-- 3. Core App Tables
-- ============================================================================

-- Table: public.users (Profiles)
create table if not exists public.users (
  id uuid primary key,
  email text,
  full_name text,
  avatar_url text,
  profile_type text,
  plan text default 'free',
  plan_expires_at timestamptz,
  onboarding_done boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ai_message_count integer default 0,
  last_message_date timestamptz default now(),
  total_xp integer default 0,
  current_level integer default 1,
  current_title text default 'Ignition',
  expo_push_token text,
  task_reminders_enabled boolean default true,
  habit_reminders_enabled boolean default true,
  pomodoro_alerts_enabled boolean default true,
  timezone text,
  ai_voice_count integer default 0,
  last_voice_date timestamptz,
  billing_provider text,
  polar_customer_id text,
  newsletter_batch integer,
  last_newsletter_sent_at timestamptz,
  deleted_at timestamptz
);

create index if not exists idx_users_newsletter_batch on public.users (newsletter_batch);
create index if not exists idx_users_created_at on public.users (created_at desc);

-- Table: public.tasks
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  due_time time without time zone,
  priority text default 'medium',
  is_flagged boolean default false,
  is_completed boolean default false,
  completed_at timestamptz,
  reminder_time timestamptz,
  tags text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  position integer default 0,
  start_time time without time zone,
  end_time time without time zone
);

create index if not exists idx_tasks_user_due_date on public.tasks (user_id, due_date);
create index if not exists idx_tasks_user_completed on public.tasks (user_id, is_completed);
create index if not exists idx_tasks_user_created on public.tasks (user_id, created_at desc);

-- Table: public.subtasks
create table if not exists public.subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  is_completed boolean default false,
  completed_at timestamptz,
  position integer default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_subtasks_task on public.subtasks (task_id);
create index if not exists idx_subtasks_user on public.subtasks (user_id);

-- Table: public.habits
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  icon text,
  frequency text default 'daily',
  custom_days integer[],
  reminder_time time without time zone,
  current_streak integer default 0,
  longest_streak integer default 0,
  is_active boolean default true,
  position integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  color text default '#3B82F6',
  start_date date,
  end_date date,
  duration_minutes integer default 30
);

create index if not exists idx_habits_user on public.habits (user_id);
create index if not exists idx_habits_user_active on public.habits (user_id, is_active);

-- Table: public.habit_logs
create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  completed_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists idx_habit_logs_habit_date on public.habit_logs (habit_id, completed_date);
create index if not exists idx_habit_logs_user_date on public.habit_logs (user_id, completed_date);

-- Table: public.habit_groups
create table if not exists public.habit_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Focus Pod',
  invite_code text unique,
  created_by uuid references public.users(id) on delete set null,
  max_members integer default 5,
  created_at timestamptz not null default now()
);

create index if not exists idx_habit_groups_created_by on public.habit_groups (created_by);

-- Table: public.habit_group_members
create table if not exists public.habit_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.habit_groups(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  habit_id uuid references public.habits(id) on delete set null,
  joined_at timestamptz not null default now(),
  unique (user_id)
);

create index if not exists idx_habit_group_members_group on public.habit_group_members (group_id);
create index if not exists idx_habit_group_members_user on public.habit_group_members (user_id);

-- Table: public.pomodoro_sessions (Focus Sessions)
create table if not exists public.pomodoro_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  focus_minutes integer default 25,
  break_minutes integer default 5,
  sets_planned integer default 4,
  sets_completed integer default 0,
  was_completed boolean default true,
  started_at timestamptz,
  completed_at timestamptz default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_pomodoro_user_started on public.pomodoro_sessions (user_id, started_at desc);
create index if not exists idx_pomodoro_user_completed on public.pomodoro_sessions (user_id, completed_at desc);

-- Table: public.reminders (Calendar Events)
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  all_day boolean not null default false,
  start_time text not null default '08:00 AM',
  end_time text,
  repeat text default 'Never',
  created_at timestamptz not null default now(),
  day text,
  reminder_date date,
  repeat_mode text default 'Never',
  custom_frequency text,
  custom_every integer,
  custom_unit text,
  timezone text default 'Asia/Kolkata',
  is_active boolean default true,
  updated_at timestamptz not null default now(),
  color text default '#2B6BFF',
  tag text default 'Personal',
  is_completed boolean default false,
  is_starred boolean default false,
  description text
);

create index if not exists idx_reminders_user_day on public.reminders (user_id, day);
create index if not exists idx_reminders_user_date on public.reminders (user_id, reminder_date);

-- Table: public.countdowns
create table if not exists public.countdowns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  event_name text not null,
  target_date date not null,
  icon text,
  color text default '#FF751F',
  is_active boolean default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_countdowns_user_target on public.countdowns (user_id, target_date);

-- Table: public.notes
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null default 'Untitled Note',
  content text,
  content_text text,
  tags text[],
  is_deleted boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_favourite boolean default false,
  is_favorite boolean default false,
  folder text,
  note_type text default 'text',
  transcript text,
  duration_seconds integer default 0,
  transcription_status public.process_status_tier default 'idle',
  summary_status public.process_status_tier default 'idle',
  transcription_error text,
  summary_error text,
  speech_locale varchar default 'en-US',
  source varchar default 'native_ios',
  type text default 'note',
  audio_url text
);

create index if not exists idx_notes_user_updated on public.notes (user_id, updated_at desc);
create index if not exists idx_notes_user_folder on public.notes (user_id, folder);

-- Table: public.xp_logs
create table if not exists public.xp_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  amount integer not null,
  source text not null,
  created_at timestamptz not null default now(),
  idempotency_key text
);

create index if not exists idx_xp_logs_user_created on public.xp_logs (user_id, created_at desc);

-- ============================================================================
-- 4. Compatibility Views
-- ============================================================================
create or replace view public.profiles as
  select * from public.users;

create or replace view public.focus_sessions as
  select * from public.pomodoro_sessions;

create or replace view public.calendar_events as
  select * from public.reminders;

-- ============================================================================
-- 5. Helper Functions & Triggers
-- ============================================================================

-- Function to check group membership
create or replace function public.is_group_member(p_group uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.habit_group_members
    where group_id = p_group and user_id = auth.uid()
  );
$$;

-- Function to serve member profiles safely
create or replace function public.group_member_profiles(p_group uuid)
returns table (
  id uuid,
  full_name text,
  current_level int,
  current_title text
)
language sql
stable
security definer
set search_path = public
as $$
  select u.id, u.full_name, u.current_level, u.current_title
  from public.users u
  join public.habit_group_members m on m.user_id = u.id
  where m.group_id = p_group and public.is_group_member(p_group);
$$;

-- Function to join a group
create or replace function public.join_group(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_group_id uuid;
  v_member_count int;
  v_clean_code text := upper(trim(p_code));
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select id into v_group_id
  from public.habit_groups
  where upper(trim(invite_code)) = v_clean_code
  limit 1;

  if v_group_id is null then
    raise exception 'Invalid invite code.' using errcode = 'P0002';
  end if;

  select count(*) into v_member_count
  from public.habit_group_members
  where group_id = v_group_id;

  if v_member_count >= 5 then
    raise exception 'This group is full (max 5 members).' using errcode = '23514';
  end if;

  insert into public.habit_group_members (group_id, user_id)
  values (v_group_id, v_uid)
  on conflict (user_id) do update
    set group_id = excluded.group_id;

  return v_group_id;
end;
$$;

-- Habit Streak Calculation Function
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
  v_curr_streak integer := 0;
  v_check_date date;
  v_is_sched boolean;
  v_today_logged boolean;
  v_dow integer;
  v_best_streak integer := 0;
  v_temp_run integer := 0;
  v_prev_date date := null;
  v_d date;
  v_step date;
  v_missed_between boolean;
begin
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

  select coalesce(nullif(timezone, ''), 'Asia/Kolkata')
    into v_tz
    from public.users
   where id = v_user_id;

  if v_tz is null or v_tz = '' then
    v_tz := 'Asia/Kolkata';
  end if;

  v_today := (now() at time zone v_tz)::date;

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

  -- Best streak calculation
  v_temp_run := 0;
  v_prev_date := null;
  foreach v_d in array v_dates loop
    if v_prev_date is null then
      v_temp_run := 1;
    else
      v_missed_between := false;
      v_step := v_prev_date + 1;
      while v_step < v_d loop
        v_dow := extract(dow from v_step)::integer;
        if v_frequency = 'daily' then
          v_is_sched := true;
        elsif v_frequency = 'weekdays' then
          v_is_sched := (v_dow between 1 and 5);
        elsif v_frequency = 'weekends' then
          v_is_sched := (v_dow in (0, 6));
        elsif v_frequency = 'custom' then
          if v_custom_days is null or cardinality(v_custom_days) = 0 then
            v_is_sched := true;
          else
            v_is_sched := (v_dow = any(v_custom_days)) or (v_dow = 0 and 7 = any(v_custom_days));
          end if;
        else
          v_is_sched := true;
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

    if v_temp_run > v_best_streak then
      v_best_streak := v_temp_run;
    end if;
    v_prev_date := v_d;
  end loop;

  -- Current streak calculation
  v_today_logged := (v_today = any(v_dates));
  v_curr_streak := 0;

  v_check_date := case when v_today_logged then v_today else v_today - 1 end;

  loop
    v_dow := extract(dow from v_check_date)::integer;
    if v_frequency = 'daily' then
      v_is_sched := true;
    elsif v_frequency = 'weekdays' then
      v_is_sched := (v_dow between 1 and 5);
    elsif v_frequency = 'weekends' then
      v_is_sched := (v_dow in (0, 6));
    elsif v_frequency = 'custom' then
      if v_custom_days is null or cardinality(v_custom_days) = 0 then
        v_is_sched := true;
      else
        v_is_sched := (v_dow = any(v_custom_days)) or (v_dow = 0 and 7 = any(v_custom_days));
      end if;
    else
      v_is_sched := true;
    end if;

    if v_check_date = any(v_dates) then
      v_curr_streak := v_curr_streak + 1;
    elsif v_is_sched then
      exit;
    end if;

    v_check_date := v_check_date - 1;
    if v_check_date < v_dates[1] then
      exit;
    end if;
  end loop;

  if v_curr_streak > v_best_streak then
    v_best_streak := v_curr_streak;
  end if;

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

drop trigger if exists trg_habit_logs_recalculate_streak on public.habit_logs;
create trigger trg_habit_logs_recalculate_streak
  after insert or update or delete on public.habit_logs
  for each row
  execute function public.handle_habit_log_streak_change();

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
