-- 07_indexes.sql
-- Phase 6B: Performance indexes based on audit and real table/column schemas
-- Pattern: user + the column sorted or filtered by, foreign keys, and range queries

-- 1. Tasks
create index if not exists tasks_user_due_date_idx on public.tasks (user_id, due_date);
create index if not exists tasks_user_completed_idx on public.tasks (user_id, is_completed);

-- 2. Habits & Habit logs
create index if not exists habits_user_idx on public.habits (user_id);
create index if not exists habits_user_active_idx on public.habits (user_id, is_active);
create index if not exists habit_logs_habit_date_idx on public.habit_logs (habit_id, completed_date);
create index if not exists habit_logs_user_date_idx on public.habit_logs (user_id, completed_date);

-- 3. Pomodoro Sessions
create index if not exists pomodoro_user_started_idx on public.pomodoro_sessions (user_id, started_at desc);
create index if not exists pomodoro_user_completed_idx on public.pomodoro_sessions (user_id, completed_at desc);

-- 4. Notes
create index if not exists notes_user_updated_idx on public.notes (user_id, updated_at desc);
create index if not exists notes_user_folder_idx on public.notes (user_id, folder);

-- 5. XP Logs
create index if not exists xp_logs_user_created_idx on public.xp_logs (user_id, created_at desc);

-- 6. Reminders
create index if not exists reminders_user_day_idx on public.reminders (user_id, day);

-- 7. Habit Groups & Habit Group Members
create index if not exists habit_groups_created_by_idx on public.habit_groups (created_by);
create index if not exists habit_group_members_group_idx on public.habit_group_members (group_id);
create index if not exists habit_group_members_user_idx on public.habit_group_members (user_id);

-- 8. AI Chat Logs
create index if not exists ai_chat_logs_user_created_idx on public.ai_chat_logs (user_id, created_at desc);

-- 9. Countdowns & Subscriptions & Reports
create index if not exists countdowns_user_target_idx on public.countdowns (user_id, target_date);
create index if not exists subscriptions_user_status_idx on public.subscriptions (user_id, status);
create index if not exists reports_user_dates_idx on public.reports (user_id, start_date, end_date);
create index if not exists weekly_reports_user_created_idx on public.weekly_reports (user_id, created_at desc);
