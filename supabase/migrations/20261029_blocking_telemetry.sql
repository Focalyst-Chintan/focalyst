-- Distraction blocking telemetry (FOCALYST_BLOCKING_FLOW.md section 7.2).
-- Written once per session, after it ends, as one session row plus one batch of events.

create table if not exists public.blocking_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  -- The app's own session id ("focus_<ms>"), so a retried sync can be spotted.
  local_session_id text,
  -- pomodoro_sessions rows are logged per set, so a blocked session links by id string, not FK.
  pomodoro_session_id text,
  kind text not null check (kind in ('pomodoro', 'quick', 'schedule')),
  level text not null check (level in ('gentle', 'firm', 'locked')),
  started_at timestamptz not null,
  ended_at timestamptz,
  planned_sets int,
  completed_sets int,
  ended_early boolean default false,
  attempts_count int default 0,
  unlocks_count int default 0,
  emergency_used boolean default false,
  interrupted boolean default false,
  platform text check (platform in ('ios', 'android'))
);

create index if not exists blocking_sessions_user_started_idx
  on public.blocking_sessions (user_id, started_at desc);

create table if not exists public.blocking_events (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.blocking_sessions on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  type text not null check (type in ('attempt', 'unlock', 'emergency')),
  app_label text,
  app_key text,
  minute_into_block int,
  reason text check (reason in ('study', 'reply', 'bored', 'other')),
  unlock_minutes int,
  at timestamptz not null
);

create index if not exists blocking_events_user_at_idx on public.blocking_events (user_id, at desc);

create table if not exists public.blocking_settings (
  user_id uuid primary key references auth.users on delete cascade,
  level text,
  unblock_on_breaks boolean,
  notify_lock_unlock boolean,
  android_blocklist text[],
  android_allowlist text[],
  updated_at timestamptz default now()
);

alter table public.blocking_sessions enable row level security;
alter table public.blocking_events enable row level security;
alter table public.blocking_settings enable row level security;

drop policy if exists "blocking_sessions_select_own" on public.blocking_sessions;
drop policy if exists "blocking_sessions_insert_own" on public.blocking_sessions;
drop policy if exists "blocking_sessions_update_own" on public.blocking_sessions;
create policy "blocking_sessions_select_own" on public.blocking_sessions for select using (user_id = auth.uid());
create policy "blocking_sessions_insert_own" on public.blocking_sessions for insert with check (user_id = auth.uid());
create policy "blocking_sessions_update_own" on public.blocking_sessions for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "blocking_sessions_delete_own" on public.blocking_sessions;
create policy "blocking_sessions_delete_own" on public.blocking_sessions for delete using (user_id = auth.uid());

drop policy if exists "blocking_events_select_own" on public.blocking_events;
drop policy if exists "blocking_events_insert_own" on public.blocking_events;
drop policy if exists "blocking_events_delete_own" on public.blocking_events;
create policy "blocking_events_select_own" on public.blocking_events for select using (user_id = auth.uid());
-- Events may only be attached to the caller's own sessions.
create policy "blocking_events_insert_own" on public.blocking_events for insert with check (
  user_id = auth.uid()
  and exists (select 1 from public.blocking_sessions s where s.id = session_id and s.user_id = auth.uid())
);
-- Events are append-only: no update policy, so updates are denied.
create policy "blocking_events_delete_own" on public.blocking_events for delete using (user_id = auth.uid());

drop policy if exists "blocking_settings_select_own" on public.blocking_settings;
drop policy if exists "blocking_settings_insert_own" on public.blocking_settings;
drop policy if exists "blocking_settings_update_own" on public.blocking_settings;
create policy "blocking_settings_select_own" on public.blocking_settings for select using (user_id = auth.uid());
create policy "blocking_settings_insert_own" on public.blocking_settings for insert with check (user_id = auth.uid());
create policy "blocking_settings_update_own" on public.blocking_settings for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "blocking_settings_delete_own" on public.blocking_settings;
create policy "blocking_settings_delete_own" on public.blocking_settings for delete using (user_id = auth.uid());

-- Raw events are kept 180 days; session aggregates stay for the life of the account.
-- Run from a scheduled job (pg_cron or an edge function):
--   delete from public.blocking_events where at < now() - interval '180 days';
