-- Phase 6A: 05_rls.sql
-- Row Level Security policies for all active application tables, helper functions, and RPCs.

-- ============================================================================
-- 1. Helper Functions for Groups and Membership
-- ============================================================================

-- Function to check if the current user is a member of the group
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

revoke all on function public.is_group_member(uuid) from public, anon;
grant execute on function public.is_group_member(uuid) to authenticated;

-- Function to serve member profiles safely (never exposes email or plan)
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

revoke all on function public.group_member_profiles(uuid) from public, anon;
grant execute on function public.group_member_profiles(uuid) to authenticated;

-- Function to join a group securely server-side without exposing groups table
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

revoke all on function public.join_group(text) from public, anon;
grant execute on function public.join_group(text) to authenticated;

-- ============================================================================
-- 2. Row Level Security Policies
-- ============================================================================

-- Table: public.users
alter table public.users enable row level security;
drop policy if exists "users: own select" on public.users;
drop policy if exists "users: own insert" on public.users;
drop policy if exists "users: own update" on public.users;
drop policy if exists "users: own delete" on public.users;

create policy "users: own select" on public.users for select using ((select auth.uid()) = id);
create policy "users: own insert" on public.users for insert with check ((select auth.uid()) = id);
create policy "users: own update" on public.users for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "users: own delete" on public.users for delete using ((select auth.uid()) = id);

-- Table: public.tasks
alter table public.tasks enable row level security;
drop policy if exists "tasks: own select" on public.tasks;
drop policy if exists "tasks: own insert" on public.tasks;
drop policy if exists "tasks: own update" on public.tasks;
drop policy if exists "tasks: own delete" on public.tasks;

create policy "tasks: own select" on public.tasks for select using ((select auth.uid()) = user_id);
create policy "tasks: own insert" on public.tasks for insert with check ((select auth.uid()) = user_id);
create policy "tasks: own update" on public.tasks for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "tasks: own delete" on public.tasks for delete using ((select auth.uid()) = user_id);

-- Table: public.habits
alter table public.habits enable row level security;
drop policy if exists "habits: own select" on public.habits;
drop policy if exists "habits: own insert" on public.habits;
drop policy if exists "habits: own update" on public.habits;
drop policy if exists "habits: own delete" on public.habits;

create policy "habits: own select" on public.habits for select using ((select auth.uid()) = user_id);
create policy "habits: own insert" on public.habits for insert with check ((select auth.uid()) = user_id);
create policy "habits: own update" on public.habits for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "habits: own delete" on public.habits for delete using ((select auth.uid()) = user_id);

-- Table: public.habit_logs
alter table public.habit_logs enable row level security;
drop policy if exists "habit_logs: own select" on public.habit_logs;
drop policy if exists "habit_logs: own insert" on public.habit_logs;
drop policy if exists "habit_logs: own update" on public.habit_logs;
drop policy if exists "habit_logs: own delete" on public.habit_logs;

create policy "habit_logs: own select" on public.habit_logs for select using ((select auth.uid()) = user_id);
create policy "habit_logs: own insert" on public.habit_logs for insert with check ((select auth.uid()) = user_id);
create policy "habit_logs: own update" on public.habit_logs for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "habit_logs: own delete" on public.habit_logs for delete using ((select auth.uid()) = user_id);

-- Table: public.pomodoro_sessions
alter table public.pomodoro_sessions enable row level security;
drop policy if exists "pomodoro_sessions: own select" on public.pomodoro_sessions;
drop policy if exists "pomodoro_sessions: own insert" on public.pomodoro_sessions;
drop policy if exists "pomodoro_sessions: own update" on public.pomodoro_sessions;
drop policy if exists "pomodoro_sessions: own delete" on public.pomodoro_sessions;

create policy "pomodoro_sessions: own select" on public.pomodoro_sessions for select using ((select auth.uid()) = user_id);
create policy "pomodoro_sessions: own insert" on public.pomodoro_sessions for insert with check ((select auth.uid()) = user_id);
create policy "pomodoro_sessions: own update" on public.pomodoro_sessions for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "pomodoro_sessions: own delete" on public.pomodoro_sessions for delete using ((select auth.uid()) = user_id);

-- Table: public.notes
alter table public.notes enable row level security;
drop policy if exists "notes: own select" on public.notes;
drop policy if exists "notes: own insert" on public.notes;
drop policy if exists "notes: own update" on public.notes;
drop policy if exists "notes: own delete" on public.notes;

create policy "notes: own select" on public.notes for select using ((select auth.uid()) = user_id);
create policy "notes: own insert" on public.notes for insert with check ((select auth.uid()) = user_id);
create policy "notes: own update" on public.notes for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "notes: own delete" on public.notes for delete using ((select auth.uid()) = user_id);

-- Table: public.countdowns
alter table public.countdowns enable row level security;
drop policy if exists "Users can view own countdowns" on public.countdowns;
drop policy if exists "Users can insert own countdowns" on public.countdowns;
drop policy if exists "Users can update own countdowns" on public.countdowns;
drop policy if exists "Users can delete own countdowns" on public.countdowns;
drop policy if exists "countdowns: own select" on public.countdowns;
drop policy if exists "countdowns: own insert" on public.countdowns;
drop policy if exists "countdowns: own update" on public.countdowns;
drop policy if exists "countdowns: own delete" on public.countdowns;

create policy "countdowns: own select" on public.countdowns for select using ((select auth.uid()) = user_id);
create policy "countdowns: own insert" on public.countdowns for insert with check ((select auth.uid()) = user_id);
create policy "countdowns: own update" on public.countdowns for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "countdowns: own delete" on public.countdowns for delete using ((select auth.uid()) = user_id);

-- Table: public.reminders
alter table public.reminders enable row level security;
drop policy if exists "Users can view own reminders" on public.reminders;
drop policy if exists "Users can insert own reminders" on public.reminders;
drop policy if exists "Users can update own reminders" on public.reminders;
drop policy if exists "Users can delete own reminders" on public.reminders;
drop policy if exists "reminders: own select" on public.reminders;
drop policy if exists "reminders: own insert" on public.reminders;
drop policy if exists "reminders: own update" on public.reminders;
drop policy if exists "reminders: own delete" on public.reminders;

create policy "reminders: own select" on public.reminders for select using ((select auth.uid()) = user_id);
create policy "reminders: own insert" on public.reminders for insert with check ((select auth.uid()) = user_id);
create policy "reminders: own update" on public.reminders for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "reminders: own delete" on public.reminders for delete using ((select auth.uid()) = user_id);

-- Table: public.reports
alter table public.reports enable row level security;
drop policy if exists "Users can manage own reports" on public.reports;
drop policy if exists "reports: own select" on public.reports;
drop policy if exists "reports: own insert" on public.reports;
drop policy if exists "reports: own update" on public.reports;
drop policy if exists "reports: own delete" on public.reports;

create policy "reports: own select" on public.reports for select using ((select auth.uid()) = user_id);
create policy "reports: own insert" on public.reports for insert with check ((select auth.uid()) = user_id);
create policy "reports: own update" on public.reports for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "reports: own delete" on public.reports for delete using ((select auth.uid()) = user_id);

-- Table: public.weekly_reports
alter table public.weekly_reports enable row level security;
drop policy if exists "weekly_reports: own select" on public.weekly_reports;
drop policy if exists "weekly_reports: own insert" on public.weekly_reports;
drop policy if exists "weekly_reports: own update" on public.weekly_reports;
drop policy if exists "weekly_reports: own delete" on public.weekly_reports;

create policy "weekly_reports: own select" on public.weekly_reports for select using ((select auth.uid()) = user_id);
create policy "weekly_reports: own insert" on public.weekly_reports for insert with check ((select auth.uid()) = user_id);
create policy "weekly_reports: own update" on public.weekly_reports for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "weekly_reports: own delete" on public.weekly_reports for delete using ((select auth.uid()) = user_id);

-- Table: public.ai_chat_logs
alter table public.ai_chat_logs enable row level security;
drop policy if exists "ai_chat_logs: own select" on public.ai_chat_logs;
drop policy if exists "ai_chat_logs: own insert" on public.ai_chat_logs;
drop policy if exists "ai_chat_logs: own update" on public.ai_chat_logs;
drop policy if exists "ai_chat_logs: own delete" on public.ai_chat_logs;

create policy "ai_chat_logs: own select" on public.ai_chat_logs for select using ((select auth.uid()) = user_id);
create policy "ai_chat_logs: own insert" on public.ai_chat_logs for insert with check ((select auth.uid()) = user_id);
create policy "ai_chat_logs: own update" on public.ai_chat_logs for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "ai_chat_logs: own delete" on public.ai_chat_logs for delete using ((select auth.uid()) = user_id);

-- Table: public.xp_logs
alter table public.xp_logs enable row level security;
drop policy if exists "xp_logs: own select" on public.xp_logs;
drop policy if exists "xp_logs: own insert" on public.xp_logs;
drop policy if exists "xp_logs: own update" on public.xp_logs;
drop policy if exists "xp_logs: own delete" on public.xp_logs;

create policy "xp_logs: own select" on public.xp_logs for select using ((select auth.uid()) = user_id);
create policy "xp_logs: own insert" on public.xp_logs for insert with check ((select auth.uid()) = user_id);
create policy "xp_logs: own update" on public.xp_logs for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "xp_logs: own delete" on public.xp_logs for delete using ((select auth.uid()) = user_id);

-- Table: public.daily_focus_activity
alter table public.daily_focus_activity enable row level security;
drop policy if exists "Users can view their own focus activity" on public.daily_focus_activity;
drop policy if exists "Users can insert their own focus activity" on public.daily_focus_activity;
drop policy if exists "Users can update their own focus activity" on public.daily_focus_activity;
drop policy if exists "Users can delete their own focus activity" on public.daily_focus_activity;
drop policy if exists "daily_focus_activity: own select" on public.daily_focus_activity;
drop policy if exists "daily_focus_activity: own insert" on public.daily_focus_activity;
drop policy if exists "daily_focus_activity: own update" on public.daily_focus_activity;
drop policy if exists "daily_focus_activity: own delete" on public.daily_focus_activity;

create policy "daily_focus_activity: own select" on public.daily_focus_activity for select using ((select auth.uid()) = user_id);
create policy "daily_focus_activity: own insert" on public.daily_focus_activity for insert with check ((select auth.uid()) = user_id);
create policy "daily_focus_activity: own update" on public.daily_focus_activity for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "daily_focus_activity: own delete" on public.daily_focus_activity for delete using ((select auth.uid()) = user_id);

-- Table: public.subscriptions
alter table public.subscriptions enable row level security;
drop policy if exists "subscriptions: own select" on public.subscriptions;
drop policy if exists "subscriptions: own insert" on public.subscriptions;
drop policy if exists "subscriptions: own update" on public.subscriptions;
drop policy if exists "subscriptions: own delete" on public.subscriptions;

create policy "subscriptions: own select" on public.subscriptions for select using ((select auth.uid()) = user_id);

-- Table: public.waitlist
alter table public.waitlist enable row level security;
drop policy if exists "Users can insert their own waitlist entry" on public.waitlist;
drop policy if exists "Users can read their own waitlist entry" on public.waitlist;
drop policy if exists "waitlist: insert" on public.waitlist;
drop policy if exists "waitlist: own select" on public.waitlist;

create policy "waitlist: insert" on public.waitlist for insert with check (true);
create policy "waitlist: own select" on public.waitlist for select using ((select auth.uid()) = user_id);

-- Table: public.habit_groups
alter table public.habit_groups enable row level security;
drop policy if exists "habit_groups: member select" on public.habit_groups;
drop policy if exists "habit_groups: creator insert" on public.habit_groups;
drop policy if exists "habit_groups: creator update" on public.habit_groups;
drop policy if exists "habit_groups: creator delete" on public.habit_groups;

create policy "habit_groups: member select" on public.habit_groups
  for select using (public.is_group_member(id) or created_by = (select auth.uid()));
create policy "habit_groups: creator insert" on public.habit_groups
  for insert with check ((select auth.uid()) = created_by);
create policy "habit_groups: creator update" on public.habit_groups
  for update using ((select auth.uid()) = created_by) with check ((select auth.uid()) = created_by);
create policy "habit_groups: creator delete" on public.habit_groups
  for delete using ((select auth.uid()) = created_by);

-- Table: public.habit_group_members
alter table public.habit_group_members enable row level security;
drop policy if exists "habit_group_members: member select" on public.habit_group_members;
drop policy if exists "habit_group_members: own insert" on public.habit_group_members;
drop policy if exists "habit_group_members: own update" on public.habit_group_members;
drop policy if exists "habit_group_members: own delete" on public.habit_group_members;

create policy "habit_group_members: member select" on public.habit_group_members
  for select using (public.is_group_member(group_id) or (select auth.uid()) = user_id);
create policy "habit_group_members: own insert" on public.habit_group_members
  for insert with check ((select auth.uid()) = user_id);
create policy "habit_group_members: own update" on public.habit_group_members
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "habit_group_members: own delete" on public.habit_group_members
  for delete using ((select auth.uid()) = user_id);
