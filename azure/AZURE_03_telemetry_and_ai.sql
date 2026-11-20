-- ============================================================================
-- Focalyst Telemetry, AI, MCP, App Blocking & Insights · Azure PostgreSQL Schema
-- Phase 4 Migration
-- Safe to run more than once.
-- Preserves exact column names, types, defaults, and constraints from Supabase
-- so API responses remain 100% compatible with web, iOS, and Android.
-- Adds composite indexes (user_id, created_at desc) on high-volume tables.
-- ============================================================================

-- 1. AI Chat Logs & Daily Free-Tier Message Limits
create table if not exists public.ai_chat_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role text not null,
  content text not null,
  tab_context text,
  tokens_used int,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_chat_logs_user_created
  on public.ai_chat_logs (user_id, created_at desc);

create table if not exists public.user_ai_usage (
  user_id uuid primary key,
  ai_message_count int not null default 0,
  last_message_date timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_ai_usage_user_updated
  on public.user_ai_usage (user_id, updated_at desc);

-- 2. MCP (Model Context Protocol) Server Connections & Credit Ledger
create table if not exists public.mcp_config (
  id boolean primary key default true check (id = true),
  monthly_credits int not null default 500,
  daily_bonus int not null default 10,
  calls_per_minute int not null default 30
);

create table if not exists public.mcp_tool_costs (
  tool text primary key,
  label text not null,
  cost int not null default 0,
  is_write boolean not null default false,
  sort int not null default 10
);

create table if not exists public.mcp_credit_accounts (
  user_id uuid primary key,
  balance int not null default 500,
  anchor_at timestamptz not null default now(),
  period_start timestamptz not null default now(),
  period_end timestamptz not null default (now() + interval '30 days'),
  last_bonus_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_mcp_credit_accounts_user_created
  on public.mcp_credit_accounts (user_id, created_at desc);

create table if not exists public.mcp_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  kind text not null,
  tool text,
  client_id text,
  delta int not null,
  status text not null default 'success',
  error_code text,
  balance_after int not null default 0,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists idx_mcp_credit_ledger_user_created
  on public.mcp_credit_ledger (user_id, created_at desc);

create table if not exists public.mcp_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  client_id text not null,
  client_name text,
  allow_writes boolean not null default false,
  connected_at timestamptz not null default now(),
  last_used_at timestamptz,
  call_count int not null default 0,
  revoked_at timestamptz,
  client_host text,
  created_at timestamptz not null default now(),
  unique (user_id, client_id)
);

create index if not exists idx_mcp_connections_user_created
  on public.mcp_connections (user_id, created_at desc);

create table if not exists public.mcp_daily_bonus_claims (
  user_id uuid not null,
  claim_day date not null,
  claimed_at timestamptz not null default now(),
  primary key (user_id, claim_day)
);

create index if not exists idx_mcp_daily_bonus_claims_user_day
  on public.mcp_daily_bonus_claims (user_id, claim_day desc);

-- 3. App Distraction Blocking Telemetry (Sessions, Unblock Count & Reasons)
create table if not exists public.blocking_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  local_session_id text,
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
  platform text check (platform in ('ios', 'android')),
  created_at timestamptz not null default now()
);

create index if not exists idx_blocking_sessions_user_created
  on public.blocking_sessions (user_id, created_at desc);

create index if not exists idx_blocking_sessions_user_started
  on public.blocking_sessions (user_id, started_at desc);

create table if not exists public.blocking_events (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.blocking_sessions(id) on delete cascade,
  user_id uuid not null,
  type text not null check (type in ('attempt', 'unlock', 'emergency')),
  app_label text,
  app_key text,
  minute_into_block int,
  reason text check (reason in ('study', 'reply', 'bored', 'other')),
  unlock_minutes int,
  at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_blocking_events_user_created
  on public.blocking_events (user_id, created_at desc);

create index if not exists idx_blocking_events_user_at
  on public.blocking_events (user_id, at desc);

create table if not exists public.blocking_settings (
  user_id uuid primary key,
  level text,
  unblock_on_breaks boolean,
  notify_lock_unlock boolean,
  android_blocklist text[],
  android_allowlist text[],
  updated_at timestamptz not null default now()
);

-- 4. Insights, Daily Focus Activity, Weekly Sunday Reports & Starting Reports
create table if not exists public.daily_focus_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  date date not null,
  focus_time_minutes float default 0,
  break_time_minutes float default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists idx_daily_focus_activity_user_created
  on public.daily_focus_activity (user_id, created_at desc);

create index if not exists idx_daily_focus_activity_user_date
  on public.daily_focus_activity (user_id, date desc);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  start_date timestamptz not null,
  end_date timestamptz not null,
  score integer not null,
  focus_time text not null,
  tasks_completed integer not null,
  habit_consistency text not null,
  week_summary_text text not null,
  catalyst_insights jsonb not null default '{}'::jsonb,
  seen_by_user boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, start_date, end_date)
);

create index if not exists idx_reports_user_created
  on public.reports (user_id, created_at desc);

create index if not exists idx_reports_user_start_end
  on public.reports (user_id, start_date, end_date);

create table if not exists public.onboarding_profiles (
  user_id uuid primary key,
  version int default 2,
  platform text default 'web',
  acquisition_source text,
  life_stage text,
  distractions jsonb default '[]'::jsonb,
  distracting_apps jsonb default '[]'::jsonb,
  daily_phone_hours float,
  focus_drift_minutes float,
  best_focus_time text,
  daily_focus_goal_minutes float,
  reminder_time text,
  notifications_allowed boolean default false,
  blocking_set_up boolean default false,
  starter_habits jsonb default '[]'::jsonb,
  pending_countdown jsonb,
  report jsonb,
  answers jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_onboarding_profiles_user_created
  on public.onboarding_profiles (user_id, created_at desc);
