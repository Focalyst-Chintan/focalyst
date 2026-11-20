-- Migration: Weekly Newsletter Conversion System
-- Adds batching columns to public.users, creates newsletter_topics (seeded with 50 topics)
-- and newsletter_campaign_logs for staggered 3-day batch dispatching.

-- 1. Extend public.users with newsletter tracking and safe soft-delete column
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS newsletter_batch integer,
  ADD COLUMN IF NOT EXISTS last_newsletter_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Add check constraint safely if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_newsletter_batch_check'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_newsletter_batch_check CHECK (newsletter_batch IN (1, 2, 3));
  END IF;
END $$;

-- Assign round-robin batches (1, 2, 3) to existing users based on created_at
WITH numbered AS (
  SELECT id, ((ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) - 1) % 3) + 1 AS batch
  FROM public.users
  WHERE newsletter_batch IS NULL
)
UPDATE public.users u
SET newsletter_batch = n.batch
FROM numbered n
WHERE u.id = n.id;

-- Auto-assign newsletter_batch for any newly created user if not provided
CREATE OR REPLACE FUNCTION public.assign_newsletter_batch()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.newsletter_batch IS NULL THEN
    NEW.newsletter_batch := (floor(random() * 3) + 1)::integer;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_newsletter_batch ON public.users;
CREATE TRIGGER trg_assign_newsletter_batch
  BEFORE INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_newsletter_batch();

CREATE INDEX IF NOT EXISTS idx_users_newsletter_batch
  ON public.users (newsletter_batch)
  WHERE deleted_at IS NULL;

-- 2. Create newsletter_topics table
CREATE TABLE IF NOT EXISTS public.newsletter_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_number integer UNIQUE,
  pillar_number integer NOT NULL CHECK (pillar_number BETWEEN 1 AND 5),
  topic_title text NOT NULL,
  core_pain_point text NOT NULL,
  app_feature_mapping text NOT NULL,
  generated_copy jsonb DEFAULT NULL,
  sent_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_topics_unsent
  ON public.newsletter_topics (topic_number ASC, created_at ASC)
  WHERE sent_at IS NULL;

-- 3. Create newsletter_campaign_logs table
CREATE TABLE IF NOT EXISTS public.newsletter_campaign_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES public.newsletter_topics(id) ON DELETE CASCADE,
  batch_number integer NOT NULL CHECK (batch_number IN (1, 2, 3)),
  sent_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_campaign_logs_topic_batch
  ON public.newsletter_campaign_logs (topic_id, batch_number);

-- Enable RLS (service_role bypasses RLS automatically; block public/anon access)
ALTER TABLE public.newsletter_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_campaign_logs ENABLE ROW LEVEL SECURITY;

-- 4. Seed all 50 Mind-Hijacking Focalyst Topics across 5 Pillars
INSERT INTO public.newsletter_topics (topic_number, pillar_number, topic_title, core_pain_point, app_feature_mapping)
VALUES
  -- Pillar 1: Cognitive Overload & Always-On Trap (Topics 1-10)
  (1, 1, 'The 23-minute focus tax', 'Every "quick 10-second check" of Instagram or Slack resets your working memory and costs 23 minutes of cognitive re-entry.', 'Distraction App Blocker (Locked Mode) on iOS & Android'),
  (2, 1, 'Decision fatigue at 9 AM', 'Staring at 18 unranked to-dos drains your willpower before you write a single line of real work.', 'Drag-to-Reorder Tasks with High/Medium/Low Priority'),
  (3, 1, 'The phantom vibration loop', 'Your brain keeps checking your phone even when notifications are off because the habit loop is still unguarded.', 'Scheduled & Instant App Blocking (Gentle & Firm Modes)'),
  (4, 1, 'Why 45-minute sprints beat 3-hour marathons', 'Forcing yourself to sit for hours creates low-grade dread and fake productivity instead of sharp output.', 'Pomodoro Focus Timer with Custom Work/Break Presets'),
  (5, 1, 'Open tabs, open loops', 'Visual clutter on your screen competes for your peripheral attention and spikes mental fatigue.', 'Full-Screen Desk Mode on Focalyst Web'),
  (6, 1, 'The Sunday scaries are about ambiguity', 'Anxiety before Monday hits when deadlines live in your head instead of a trusted timeline.', 'Calendar Reminders (3-day, 24-hour & start-time alerts)'),
  (7, 1, 'Context switching is a silent IQ drop', 'Jumping between chat, docs, and tasks leaves half your brain stuck on the previous tab.', 'Task-Linked Focus Sessions'),
  (8, 1, 'Evening brain static', 'You cannot fall asleep because unfinished thoughts keep looping in short-term memory.', 'Distraction-Free Notes & Folders'),
  (9, 1, 'The dopamine slot machine in your pocket', 'Infinite feeds hijack the same curiosity circuits you need for hard creative work.', 'App Blocker Allowed-Apps Whitelist & Locked Sessions'),
  (10, 1, 'Entering deep work in under 90 seconds', 'Starting is the hardest part when your timer, task list, and blocker live in three separate apps.', 'One-Tap Focus Timer & Home Screen Widgets'),

  -- Pillar 2: Accountability & Isolation Void (Topics 11-20)
  (11, 2, 'Why solo willpower fails by Day 11', 'Private promises are easy to negotiate away when nobody else knows you skipped today.', 'Shared Habit Accountability Groups (Up to 4 friends)'),
  (12, 2, 'The quiet power of a 4-person circle', 'Being seen by a few peers you respect creates healthy friction without performative social media noise.', 'Private Invite-Code Habit Groups'),
  (13, 2, 'Streak anxiety vs. streak momentum', 'One missed day makes people quit entirely when they cannot see the bigger pattern.', 'Habit Heatmaps with Current & Best Streaks'),
  (14, 2, 'Why announcing goals online backfires', 'Broadcasting big goals gives you premature dopamine before you have done any actual reps.', 'Private Habit Group Leaderboards'),
  (15, 2, 'The "never miss twice" rule in practice', 'Consistency is not perfection; it is shortening the gap between a slip and your next rep.', 'Habit Completion Rate & Recovery Tracking'),
  (16, 2, 'Making boring daily reps feel tangible', 'Long-term goals feel invisible day-to-day unless progress has immediate feedback.', 'XP, Levels & Titles Progression System'),
  (17, 2, 'Studying alone vs. parallel accountability', 'Isolation amplifies procrastination; knowing friends logged their reps pulls you forward.', 'Shared Group Streak Visibility'),
  (18, 2, 'Why your group chat is not an accountability system', 'Casual texts get buried under memes in ten minutes with zero structured tracking.', 'Dedicated Habit Group Check-Ins & Totals'),
  (19, 2, 'Social friction is a feature, not a bug', 'A tiny bit of healthy peer visibility beats every motivational quote on the internet.', 'Real-Time Group Leaderboard Updates'),
  (20, 2, 'A 30-day identity shift with four friends', 'Tiny daily habits compound fastest when scheduled on specific days with clear reminders.', 'Custom Habit Days, Colors, Icons & Reminders'),

  -- Pillar 3: AI-Fatigue & Context-Switching Loop (Topics 21-30)
  (21, 3, 'Copy-pasting your life into ChatGPT is broken', 'Re-explaining your schedule, tasks, and notes to an AI every morning wastes more time than it saves.', 'AI Connections via Model Context Protocol (MCP)'),
  (22, 3, 'Your AI forgets what you promised yesterday', 'Generic chatbots give generic advice because they cannot see your actual habits or backlog.', 'MCP Live Context (Tasks, Habits, Focus & Notes)'),
  (23, 3, 'Stop prompting from scratch every morning', 'Planning should feel like a 10-second conversation with someone who already knows your week.', 'Focalyst AI Daily Assistant'),
  (24, 3, 'Let Claude or ChatGPT organize your day directly', 'Reading advice in one app and manually typing tasks into another is pure friction.', 'Cross-App MCP Write Actions (Add Tasks, Habits & Countdowns)'),
  (25, 3, 'Why five AI tabs make you slower', 'Switching between separate AI windows fragments your attention instead of clarifying it.', 'Unified Workspace with Built-In Focalyst AI'),
  (26, 3, 'Turning messy thoughts into tasks in one sentence', 'Friction between having an idea and scheduling it is where most good intentions die.', 'Focalyst AI Natural-Language Task & Habit Creation'),
  (27, 3, 'Privacy-first AI on your own terms', 'You should choose exactly which AI assistant sees your data and disconnect it in one click.', 'Revocable Per-App MCP Connections'),
  (28, 3, 'Ask your own notes instead of hunting folders', 'Captured ideas are useless if you cannot retrieve them the moment you need them.', 'Focalyst AI Search Across Notes & Voice Transcripts'),
  (29, 3, 'Generic productivity tips vs. your real telemetry', 'Advice built for someone else fails when it ignores your actual focus hours and completion rates.', 'Context-Aware AI Coaching Inside Focalyst'),
  (30, 3, 'Your AI should execute, not just chat', 'A helpful assistant logs the habit and sets the countdown for you instead of handing you a checklist.', 'MCP Direct Habit Logging & Action Execution'),

  -- Pillar 4: Productivity Blind Spots & Self-Deception (Topics 31-40)
  (31, 4, 'The "busy all day, finished nothing" illusion', 'Motion feels like progress until 6 PM arrives and your hardest priority has not moved.', 'Catalyst Insights & Productivity Score'),
  (32, 4, 'Why you unblock distracting apps mid-session', 'You cannot fix impulse scrolling until you see the exact moment and excuse you gave yourself.', 'App Blocker Unblock Count & Reason Telemetry'),
  (33, 4, 'Overestimating a day, underestimating a week', 'Daily guilt blinds you to steady weekly progress unless you zoom out.', 'Automated Sunday Weekly Report'),
  (34, 4, 'Feeling productive vs. real deep-work minutes', 'Time spent at your desk is not the same as uninterrupted focus time.', 'Weekly & Monthly Focus Time Charts'),
  (35, 4, 'The hidden cost of aborted focus sessions', 'Quitting a 25-minute timer at minute 14 trains your brain to bail when work gets uncomfortable.', 'Focus Session Completion & Streak Analytics'),
  (36, 4, 'Why intentions die on Wednesday afternoon', 'Mid-week energy dips are predictable once you look at your actual multi-week data.', 'Custom Date-Range Score Breakdown on Web'),
  (37, 4, 'Data without guilt: finding your peak hours', 'Working against your natural energy window forces twice the effort for half the output.', 'Daily Focus Activity Heatmaps & Trends'),
  (38, 4, 'Audit your last 7 days in two minutes flat', 'Reflection fails when it requires a blank journal; structured summaries make it effortless.', 'Detailed Catalyst Report (Pro)'),
  (39, 4, 'The gap between your calendar and your reality', 'Over-scheduling creates constant failure; measuring reality calibrates your ambition.', 'Task & Habit Completion Rate Analytics'),
  (40, 4, 'What 12 weeks of honest focus data looks like', 'Long-term clarity comes from seeing how small daily choices add up over a quarter.', 'Personal Starting Report & 12-Week Focus Plan'),

  -- Pillar 5: Frictionless Capture & Execution (Topics 41-50)
  (41, 5, 'Typing on a phone kills half your best ideas', 'By the time you unlock your phone, open an app, and type, the thought is already gone.', 'Voice Notes with Instant Transcription'),
  (42, 5, 'A 3-minute ramble turned into 3 clear bullets', 'Raw voice memos are hard to review unless something distills the signal for you.', 'AI Voice Note Summaries'),
  (43, 5, 'If capture takes 4 taps, you will skip it', 'Every extra screen between you and your list drops your capture rate.', 'Interactive iOS & Android Home Screen Widgets'),
  (44, 5, 'Why "someday" goals belong on a countdown', 'Dates without visual urgency sneak up on you until it is too late to prepare.', 'Deadline Day Countdowns (Unlimited & No Date Limit in Pro)'),
  (45, 5, 'The 3-day, 24-hour, start-time safety net', 'Single reminders fail because you see them when it is already too late to act.', 'Multi-Stage Calendar Event Reminders'),
  (46, 5, 'Your phone and desk need the same brain', 'Ideas captured on a walk should be waiting on your desktop the second you sit down.', 'Real-Time Web, iOS & Android Cloud Sync'),
  (47, 5, 'Capture while walking, execute at your desk', 'Separating quick mobile capture from deep desktop execution keeps both fast.', 'Voice Notes + Web Desk Mode Workflow'),
  (48, 5, 'Why blank-page anxiety ruins note-taking', 'Over-engineered wikis turn simple note-taking into a formatting chore.', 'Clean Foldered Notes Editor'),
  (49, 5, 'Making deadlines visible without stress', 'Seeing "14 days left" on your home screen sharpens daily priorities naturally.', 'Countdown Home Screen Widgets (Clear & Tinted)'),
  (50, 5, 'One calm system instead of nine noisy apps', 'Tool sprawl creates its own maintenance job; consolidation gives you your attention back.', 'Complete Focalyst Pro Productivity Stack')
ON CONFLICT (topic_number) DO UPDATE SET
  pillar_number = EXCLUDED.pillar_number,
  topic_title = EXCLUDED.topic_title,
  core_pain_point = EXCLUDED.core_pain_point,
  app_feature_mapping = EXCLUDED.app_feature_mapping;
