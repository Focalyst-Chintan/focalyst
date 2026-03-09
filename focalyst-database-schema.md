# Focalyst — Database Schema Document
**Version 1.0 | March 2026**
**Purpose:** Complete Supabase PostgreSQL database structure for Focalyst. Feed this to AI before every coding session.

---

## Core Instruction for AI

> Read this document completely before writing any database-related code.
> Always use these exact table names, column names, and data types.
> Always enable Row Level Security (RLS) on every table.
> Always write RLS policies so users can only access their own data.
> Always add the indexes specified at the bottom of this document.
> Never create new tables or columns without being explicitly instructed.

---

## 1. Overview — All Tables

| Table | Purpose |
|---|---|
| users | User profiles, plan info, preferences |
| tasks | To-do list items |
| subtasks | Subtasks belonging to a task |
| habits | Habit definitions |
| habit_logs | Daily habit completion records |
| pomodoro_sessions | Completed Pomodoro focus sessions |
| notes | User notes |
| countdowns | Day countdown events |
| subscriptions | Payment and subscription records |
| ai_chat_logs | AI chat message history and usage tracking |

---

## 2. Table Definitions

---

### 2.1 users

Stores user profile information. Created automatically when a user signs in with Google for the first time via a Supabase Auth trigger.

```sql
CREATE TABLE users (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email             TEXT NOT NULL UNIQUE,
  full_name         TEXT,
  avatar_url        TEXT,
  profile_type      TEXT CHECK (profile_type IN (
                      'student',
                      'professional',
                      'freelancer',
                      'creator',
                      'entrepreneur'
                    )),
  plan              TEXT NOT NULL DEFAULT 'free'
                    CHECK (plan IN ('free', 'pro_monthly', 'pro_yearly', 'lifetime')),
  plan_expires_at   TIMESTAMPTZ,
  onboarding_done   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Column notes:**
- `id` — matches the user's `auth.users.id` from Supabase Auth
- `plan_expires_at` — NULL for free and lifetime plans, set for monthly/yearly
- `onboarding_done` — false until user completes the onboarding flow
- `avatar_url` — pulled from Google profile on first login

**RLS Policies:**
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read only their own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Users can update only their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);
```

**Trigger — auto-create user on sign up:**
```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

### 2.2 tasks

Stores all to-do list items created by users.

```sql
CREATE TABLE tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  due_date        DATE,
  due_time        TIME,
  priority        TEXT NOT NULL DEFAULT 'medium'
                  CHECK (priority IN ('high', 'medium', 'low')),
  is_flagged      BOOLEAN NOT NULL DEFAULT FALSE,
  is_completed    BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at    TIMESTAMPTZ,
  reminder_time   TIMESTAMPTZ,
  tags            TEXT[],
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Column notes:**
- `completed_at` — recorded when `is_completed` is set to TRUE
- `reminder_time` — full timestamp for when the reminder notification fires
- `tags` — array of strings, used to link tasks to notes
- On-time logic: task is "on time" if `completed_at` is within 24 hours of `created_at`

**RLS Policies:**
```sql
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own tasks"
  ON tasks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

### 2.3 subtasks

Stores subtasks that belong to a parent task.

```sql
CREATE TABLE subtasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id      UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  position     INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Column notes:**
- `position` — controls display order of subtasks within a task
- Cascades delete when parent task is deleted

**RLS Policies:**
```sql
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own subtasks"
  ON subtasks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

### 2.4 habits

Stores habit definitions created by users.

```sql
CREATE TABLE habits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  icon            TEXT NOT NULL DEFAULT '⭐',
  frequency       TEXT NOT NULL DEFAULT 'daily'
                  CHECK (frequency IN ('daily', 'custom')),
  custom_days     INTEGER[],
  reminder_time   TIME,
  current_streak  INTEGER NOT NULL DEFAULT 0,
  longest_streak  INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  position        INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Column notes:**
- `custom_days` — array of day numbers (0=Sunday, 1=Monday ... 6=Saturday) used when frequency is 'custom'
- `current_streak` — incremented daily, reset to 0 when habit is missed
- `longest_streak` — all-time best streak, never resets
- `position` — controls display order in the habit list
- `is_active` — soft delete (false = archived, not shown)

**Free plan enforcement (application level):**
- Before inserting, check count of active habits for this user
- If count >= 2 and user plan is 'free' → reject with upgrade prompt

**RLS Policies:**
```sql
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own habits"
  ON habits FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

### 2.5 habit_logs

Records each daily completion of a habit. One row per habit per day when completed.

```sql
CREATE TABLE habit_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id       UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  completed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (habit_id, completed_date)
);
```

**Column notes:**
- `UNIQUE (habit_id, completed_date)` — prevents duplicate completions for the same habit on the same day
- To check if a habit is done today: query for `habit_id` + `completed_date = CURRENT_DATE`
- Streak calculation: count consecutive days working backwards from today

**RLS Policies:**
```sql
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own habit logs"
  ON habit_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

### 2.6 pomodoro_sessions

Records each completed Pomodoro focus session.

```sql
CREATE TABLE pomodoro_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id           UUID REFERENCES tasks(id) ON DELETE SET NULL,
  focus_minutes     INTEGER NOT NULL,
  break_minutes     INTEGER NOT NULL,
  sets_planned      INTEGER NOT NULL,
  sets_completed    INTEGER NOT NULL,
  was_completed     BOOLEAN NOT NULL DEFAULT TRUE,
  started_at        TIMESTAMPTZ NOT NULL,
  completed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Column notes:**
- `task_id` — optional link to a task the user was working on
- `sets_completed` — may be less than `sets_planned` if user ended early
- `was_completed` — FALSE if user reset/abandoned before finishing all sets
- `focus_minutes` — total focus time per set (not total session)
- Total actual focus time = `focus_minutes × sets_completed`

**RLS Policies:**
```sql
ALTER TABLE pomodoro_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own pomodoro sessions"
  ON pomodoro_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

### 2.7 notes

Stores user notes with rich text content.

```sql
CREATE TABLE notes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL DEFAULT 'Untitled Note',
  content      TEXT,
  content_text TEXT,
  tags         TEXT[],
  is_deleted   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Column notes:**
- `content` — full rich text content (HTML or JSON from the editor)
- `content_text` — plain text version for search indexing
- `tags` — array of tag strings for filtering and linking to tasks
- `is_deleted` — soft delete (true = in trash, not shown in main list)

**Free plan enforcement (application level):**
- Before inserting, count non-deleted notes for this user
- If count >= 5 and user plan is 'free' → reject with upgrade prompt

**RLS Policies:**
```sql
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own notes"
  ON notes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

### 2.8 countdowns

Stores day countdown events.

```sql
CREATE TABLE countdowns (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_name   TEXT NOT NULL,
  target_date  DATE NOT NULL,
  icon         TEXT NOT NULL DEFAULT '📅',
  color        TEXT NOT NULL DEFAULT '#2563EB',
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Column notes:**
- `color` — hex color string for the countdown card
- `is_active` — set to FALSE when target date has passed (soft archive)
- Days remaining = `target_date - CURRENT_DATE`

**Free plan enforcement (application level):**
- Before inserting, count active countdowns for this user
- If count >= 1 and user plan is 'free' → reject with upgrade prompt
- If target_date is more than 30 days away and user plan is 'free' → reject with upgrade prompt

**RLS Policies:**
```sql
ALTER TABLE countdowns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own countdowns"
  ON countdowns FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

### 2.9 subscriptions

Records all payment and subscription history.

```sql
CREATE TABLE subscriptions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan                     TEXT NOT NULL
                           CHECK (plan IN ('pro_monthly', 'pro_yearly', 'lifetime')),
  status                   TEXT NOT NULL DEFAULT 'active'
                           CHECK (status IN ('active', 'cancelled', 'expired', 'pending')),
  polar_payment_id         TEXT,
  polar_subscription_id    TEXT,
  polar_order_id           TEXT,
  razorpay_signature       TEXT,
  amount_paise             INTEGER NOT NULL,
  currency                 TEXT NOT NULL DEFAULT 'INR',
  started_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at               TIMESTAMPTZ,
  cancelled_at             TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Column notes:**
- `amount_paise` — amount in paise (1 INR = 100 paise). ₹99 = 9900 paise
- `expires_at` — NULL for lifetime plan, set for monthly/yearly
- `razorpay_signature` — stored for webhook verification audit trail
- After successful payment → also update `users.plan` and `users.plan_expires_at`

**RLS Policies:**
```sql
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Insert and update only via server-side service role (webhooks)
-- No client-side insert/update policy intentionally
```

---

### 2.10 ai_chat_logs

Tracks AI chat messages for usage limiting and conversation history.

```sql
CREATE TABLE ai_chat_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content      TEXT NOT NULL,
  tab_context  TEXT CHECK (tab_context IN ('plan', 'focus', 'notes', 'insights')),
  tokens_used  INTEGER,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Column notes:**
- `role` — 'user' for user messages, 'assistant' for Gemini responses
- `tab_context` — which tab the user was on when they sent the message
- `tokens_used` — approximate Gemini token usage for monitoring
- Free plan limit check: count rows where `user_id = X` AND `role = 'user'` AND `created_at >= today` — if >= 5, reject

**RLS Policies:**
```sql
ALTER TABLE ai_chat_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own chat logs"
  ON ai_chat_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

## 3. Database Indexes

Run these after creating all tables. Indexes dramatically speed up common queries.

```sql
-- tasks table
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_is_completed ON tasks(is_completed);
CREATE INDEX idx_tasks_user_date ON tasks(user_id, due_date);

-- subtasks table
CREATE INDEX idx_subtasks_task_id ON subtasks(task_id);
CREATE INDEX idx_subtasks_user_id ON subtasks(user_id);

-- habits table
CREATE INDEX idx_habits_user_id ON habits(user_id);
CREATE INDEX idx_habits_is_active ON habits(is_active);

-- habit_logs table
CREATE INDEX idx_habit_logs_habit_id ON habit_logs(habit_id);
CREATE INDEX idx_habit_logs_user_id ON habit_logs(user_id);
CREATE INDEX idx_habit_logs_completed_date ON habit_logs(completed_date);
CREATE INDEX idx_habit_logs_user_date ON habit_logs(user_id, completed_date);

-- pomodoro_sessions table
CREATE INDEX idx_pomodoro_user_id ON pomodoro_sessions(user_id);
CREATE INDEX idx_pomodoro_completed_at ON pomodoro_sessions(completed_at);
CREATE INDEX idx_pomodoro_user_completed ON pomodoro_sessions(user_id, completed_at);

-- notes table
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_updated_at ON notes(updated_at);
CREATE INDEX idx_notes_is_deleted ON notes(is_deleted);

-- countdowns table
CREATE INDEX idx_countdowns_user_id ON countdowns(user_id);
CREATE INDEX idx_countdowns_target_date ON countdowns(target_date);

-- subscriptions table
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- ai_chat_logs table
CREATE INDEX idx_ai_chat_user_id ON ai_chat_logs(user_id);
CREATE INDEX idx_ai_chat_created_at ON ai_chat_logs(created_at);
CREATE INDEX idx_ai_chat_user_created ON ai_chat_logs(user_id, created_at);
```

---

## 4. Updated_at Auto-Trigger

Apply this to all tables that have an `updated_at` column so it updates automatically:

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_users
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_tasks
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_habits
  BEFORE UPDATE ON habits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_notes
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## 5. TypeScript Types

Add these to `/types/index.ts` in the Next.js project:

```typescript
export type UserPlan = 'free' | 'pro_monthly' | 'pro_yearly' | 'lifetime'
export type ProfileType = 'student' | 'professional' | 'freelancer' | 'creator' | 'entrepreneur'
export type Priority = 'high' | 'medium' | 'low'
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'pending'
export type ChatRole = 'user' | 'assistant'
export type TabContext = 'plan' | 'focus' | 'notes' | 'insights'

export interface User {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  profile_type: ProfileType | null
  plan: UserPlan
  plan_expires_at: string | null
  onboarding_done: boolean
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  user_id: string
  title: string
  description: string | null
  due_date: string | null
  due_time: string | null
  priority: Priority
  is_flagged: boolean
  is_completed: boolean
  completed_at: string | null
  reminder_time: string | null
  tags: string[] | null
  created_at: string
  updated_at: string
  subtasks?: Subtask[]
}

export interface Subtask {
  id: string
  task_id: string
  user_id: string
  title: string
  is_completed: boolean
  completed_at: string | null
  position: number
  created_at: string
}

export interface Habit {
  id: string
  user_id: string
  name: string
  icon: string
  frequency: 'daily' | 'custom'
  custom_days: number[] | null
  reminder_time: string | null
  current_streak: number
  longest_streak: number
  is_active: boolean
  position: number
  created_at: string
  updated_at: string
  completed_today?: boolean
}

export interface HabitLog {
  id: string
  habit_id: string
  user_id: string
  completed_date: string
  created_at: string
}

export interface PomodoroSession {
  id: string
  user_id: string
  task_id: string | null
  focus_minutes: number
  break_minutes: number
  sets_planned: number
  sets_completed: number
  was_completed: boolean
  started_at: string
  completed_at: string
  created_at: string
}

export interface Note {
  id: string
  user_id: string
  title: string
  content: string | null
  content_text: string | null
  tags: string[] | null
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export interface Countdown {
  id: string
  user_id: string
  event_name: string
  target_date: string
  icon: string
  color: string
  is_active: boolean
  created_at: string
  days_remaining?: number
}

export interface Subscription {
  id: string
  user_id: string
  plan: Exclude<UserPlan, 'free'>
  status: SubscriptionStatus
  razorpay_payment_id: string | null
  razorpay_subscription_id: string | null
  amount_paise: number
  currency: string
  started_at: string
  expires_at: string | null
  cancelled_at: string | null
  created_at: string
}

export interface AIChatLog {
  id: string
  user_id: string
  role: ChatRole
  content: string
  tab_context: TabContext | null
  tokens_used: number | null
  created_at: string
}
```

---

## 6. Common Query Patterns

### Get today's tasks for a user
```typescript
const { data } = await supabase
  .from('tasks')
  .select('*, subtasks(*)')
  .eq('user_id', userId)
  .eq('due_date', today)
  .eq('is_completed', false)
  .order('priority', { ascending: false })
  .limit(20)
```

### Get active habits with today's completion status
```typescript
const { data: habits } = await supabase
  .from('habits')
  .select(`*, habit_logs!left(completed_date)`)
  .eq('user_id', userId)
  .eq('is_active', true)
  .order('position')

// Check if completed today by filtering habit_logs for today's date
```

### Get weekly focus hours
```typescript
const { data } = await supabase
  .from('pomodoro_sessions')
  .select('focus_minutes, sets_completed, completed_at')
  .eq('user_id', userId)
  .gte('completed_at', startOfWeek)
  .lte('completed_at', endOfWeek)
```

### Check free plan habit limit
```typescript
const { count } = await supabase
  .from('habits')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', userId)
  .eq('is_active', true)

if (count >= 2 && user.plan === 'free') {
  // Show upgrade modal
}
```

### Count today's AI messages (free plan limit)
```typescript
const { count } = await supabase
  .from('ai_chat_logs')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', userId)
  .eq('role', 'user')
  .gte('created_at', startOfToday)

if (count >= 5 && user.plan === 'free') {
  // Block and show upgrade prompt
}
```

---

## 7. Run Order in Supabase SQL Editor

Run these SQL blocks in this exact order:

1. Create `users` table + RLS + trigger
2. Create `tasks` table + RLS
3. Create `subtasks` table + RLS
4. Create `habits` table + RLS
5. Create `habit_logs` table + RLS
6. Create `pomodoro_sessions` table + RLS
7. Create `notes` table + RLS
8. Create `countdowns` table + RLS
9. Create `subscriptions` table + RLS
10. Create `ai_chat_logs` table + RLS
11. Run all indexes
12. Run `update_updated_at` trigger function and triggers

---

*Focalyst Database Schema v1.0 — March 2026*
*This is the single source of truth for all database structure decisions.*
