-- ============================================================================
-- Focalyst blog automation · SQL 01 (schema, config, seeds)
-- Safe to run more than once. Run in Supabase → SQL Editor → New query → Run.
-- Upgrades the existing public.blog_posts table (keeps every existing column and
-- policy) and adds the tables the automation needs. Only the server (service
-- role, used by the Edge Functions) can write. The public can only read
-- published posts.
-- ============================================================================

create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;

-- 1. Posts (existing table from the desktop phase, extended) ------------------
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text not null,
  content_md text not null,
  cover_image_url text,
  cover_image_alt text,
  tags text[] not null default '{}',
  author text not null default 'Focalyst',
  status text not null default 'draft',
  reading_minutes int,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.blog_posts add column if not exists meta_title text;
alter table public.blog_posts add column if not exists quick_answer text;
alter table public.blog_posts add column if not exists faq jsonb not null default '[]'::jsonb;
alter table public.blog_posts add column if not exists sources jsonb not null default '[]'::jsonb;
alter table public.blog_posts add column if not exists comparison jsonb;
alter table public.blog_posts add column if not exists pillar text;
alter table public.blog_posts add column if not exists kind text not null default 'article';
alter table public.blog_posts add column if not exists primary_keyword text;
alter table public.blog_posts add column if not exists secondary_keywords text[] not null default '{}';
alter table public.blog_posts add column if not exists my_term text;
alter table public.blog_posts add column if not exists word_count int;
alter table public.blog_posts add column if not exists topic_id uuid;
alter table public.blog_posts add column if not exists job_id uuid;
alter table public.blog_posts add column if not exists ai_assisted boolean not null default true;
alter table public.blog_posts add column if not exists checks jsonb;

alter table public.blog_posts drop constraint if exists blog_posts_status_check;
alter table public.blog_posts add constraint blog_posts_status_check
  check (status in ('draft', 'needs_review', 'published', 'archived'));
alter table public.blog_posts drop constraint if exists blog_posts_kind_check;
alter table public.blog_posts add constraint blog_posts_kind_check
  check (kind in ('article', 'comparison', 'news', 'guide'));

create index if not exists blog_posts_published_idx on public.blog_posts (status, published_at desc);
create index if not exists blog_posts_pillar_idx on public.blog_posts (pillar, published_at desc);
create index if not exists blog_posts_title_trgm on public.blog_posts using gin (title extensions.gin_trgm_ops);

alter table public.blog_posts enable row level security;
drop policy if exists "Public can read published posts" on public.blog_posts;
create policy "Public can read published posts" on public.blog_posts
  for select using (status = 'published' and published_at <= now());

create or replace function public.blog_touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists blog_posts_touch on public.blog_posts;
create trigger blog_posts_touch before update on public.blog_posts
  for each row execute function public.blog_touch_updated_at();

-- 2. Config (one row) ---------------------------------------------------------
create table if not exists public.blog_config (
  id boolean primary key default true check (id),
  enabled boolean not null default true,
  auto_publish boolean not null default false,       -- turn on after the first drafts look right
  daily_hour_utc int not null default 4 check (daily_hour_utc between 0 and 23), -- 04:00 UTC = 09:30 IST
  model_research text not null default 'gemini-2.5-flash',
  model_writer text not null default 'gemini-2.5-flash',
  min_words int not null default 1100,
  max_words int not null default 2000,
  max_launch_posts_per_day int not null default 1,
  site_url text not null default 'https://focalyst.online',
  app_cta_url text not null default 'https://focalyst.online/app',
  web_cta_url text not null default 'https://focalyst.online/start',
  author text not null default 'Focalyst',
  ai_disclosure boolean not null default true,
  weekday_pillars jsonb not null default
    '{"1":"focus","2":"study","3":"compare","4":"habits","5":"ai","6":"attention","7":"planning"}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.blog_config (id) values (true) on conflict (id) do nothing;

-- 3. Product facts the writer may use (the only source of claims about Focalyst)
create table if not exists public.blog_features (
  key text primary key,
  name text not null,
  platforms text[] not null,                 -- 'web', 'ios', 'android'
  plan text not null check (plan in ('free', 'free_limited', 'pro')),
  facts text not null,                       -- plain, verified sentences
  guide_slug text,                           -- /guides/<slug>
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

-- 4. Topic backlog --------------------------------------------------------------
create table if not exists public.blog_topics (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  primary_keyword text not null,
  secondary_keywords text[] not null default '{}',
  pillar text not null check (pillar in ('focus', 'study', 'habits', 'attention', 'ai', 'planning', 'compare')),
  intent text not null default 'informational' check (intent in ('informational', 'commercial', 'comparison', 'news')),
  icp text,
  pain_point text,
  my_term text check (my_term in ('Time-Maxing', 'Attention Budget', 'Attention Tax', 'AI Leverage', 'AI Amplification',
    'Friction Design', 'Discipline Debt', 'Skill Stacking', 'Polymath Stack', 'Ambition Gap', 'Comfort Tax', 'Energy-Maxxing')),
  competitor text,
  priority int not null default 50,
  status text not null default 'idea' check (status in ('idea', 'in_progress', 'used', 'rejected')),
  source text not null default 'seed' check (source in ('seed', 'trend', 'model_event', 'manual')),
  source_urls text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  used_at timestamptz
);
create unique index if not exists blog_topics_title_uq on public.blog_topics (lower(title));
create index if not exists blog_topics_pick_idx on public.blog_topics (status, pillar, priority desc, created_at);
create index if not exists blog_topics_title_trgm on public.blog_topics using gin (title extensions.gin_trgm_ops);

-- 5. Pipeline jobs (one row per post being made) --------------------------------
create table if not exists public.blog_jobs (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'daily' check (kind in ('daily', 'model_launch', 'manual')),
  for_date date,
  topic_id uuid references public.blog_topics(id) on delete set null,
  stage text not null default 'research'
    check (stage in ('research', 'outline', 'draft', 'review', 'publish', 'done', 'needs_review', 'failed')),
  attempts int not null default 0,
  run_after timestamptz not null default now(),
  locked_until timestamptz,
  research jsonb,
  outline jsonb,
  draft jsonb,
  checks jsonb,
  last_error text,
  post_id uuid references public.blog_posts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists blog_jobs_daily_uq on public.blog_jobs (for_date) where kind = 'daily';
create index if not exists blog_jobs_claim_idx on public.blog_jobs (stage, run_after);
drop trigger if exists blog_jobs_touch on public.blog_jobs;
create trigger blog_jobs_touch before update on public.blog_jobs
  for each row execute function public.blog_touch_updated_at();

-- 6. Model launches (so each launch gets exactly one post) ----------------------
create table if not exists public.blog_model_events (
  id uuid primary key default gen_random_uuid(),
  vendor text not null check (vendor in ('openai', 'anthropic', 'google')),
  model_name text not null,
  title text,
  source_url text not null,
  announced_at timestamptz,
  detected_at timestamptz not null default now(),
  job_id uuid references public.blog_jobs(id) on delete set null
);
create unique index if not exists blog_model_events_uq on public.blog_model_events (vendor, lower(model_name));

-- 7. Feeds the watcher reads ----------------------------------------------------
create table if not exists public.blog_feeds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null unique,
  kind text not null check (kind in ('model_news', 'trend')),
  active boolean not null default true
);

-- 8. Log -------------------------------------------------------------------------
create table if not exists public.blog_log (
  id bigserial primary key,
  at timestamptz not null default now(),
  fn text not null,
  level text not null default 'info' check (level in ('info', 'warn', 'error')),
  message text not null,
  data jsonb
);
create index if not exists blog_log_at_idx on public.blog_log (at desc);

-- 9. Lock everything except published posts ---------------------------------------
do $$
declare t text;
begin
  foreach t in array array['blog_config','blog_features','blog_topics','blog_jobs','blog_model_events','blog_feeds','blog_log'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;
revoke insert, update, delete on public.blog_posts from anon, authenticated;

-- 10. Helper functions (server only) --------------------------------------------------

-- Create today's job (called by the daily schedule). Picks the topic for the
-- weekday's pillar, else the best topic in the backlog, else leaves the topic
-- empty so the worker finds one from trends.
create or replace function public.blog_enqueue_daily(p_date date default (now() at time zone 'utc')::date)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_cfg public.blog_config;
  v_pillar text;
  v_topic uuid;
  v_job uuid;
begin
  select * into v_cfg from public.blog_config where id;
  if not coalesce(v_cfg.enabled, false) then
    return null;
  end if;
  if exists (select 1 from public.blog_jobs where kind = 'daily' and for_date = p_date) then
    return null;
  end if;
  v_pillar := v_cfg.weekday_pillars ->> extract(isodow from p_date)::text;

  select id into v_topic from public.blog_topics
   where status = 'idea' and pillar = v_pillar
   order by priority desc, created_at
   limit 1 for update skip locked;
  if v_topic is null then
    select id into v_topic from public.blog_topics
     where status = 'idea'
     order by priority desc, created_at
     limit 1 for update skip locked;
  end if;
  if v_topic is not null then
    update public.blog_topics set status = 'in_progress' where id = v_topic;
  end if;

  insert into public.blog_jobs (kind, for_date, topic_id, stage)
  values ('daily', p_date, v_topic, 'research')
  returning id into v_job;
  insert into public.blog_log (fn, message, data)
  values ('enqueue_daily', 'daily job created', jsonb_build_object('job', v_job, 'topic', v_topic, 'pillar', v_pillar));
  return v_job;
end $$;

-- Claim the next job that is due (model launches first). Locks it for 4 minutes.
create or replace function public.blog_claim_job()
returns setof public.blog_jobs language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  select id into v_id from public.blog_jobs
   where stage in ('research', 'outline', 'draft', 'review', 'publish')
     and run_after <= now()
     and (locked_until is null or locked_until < now())
   order by (kind = 'model_launch') desc, created_at
   limit 1 for update skip locked;
  if v_id is null then
    return;
  end if;
  return query
    update public.blog_jobs
       set locked_until = now() + interval '4 minutes', attempts = attempts + 1
     where id = v_id
     returning *;
end $$;

-- Titles already used or planned that look like this one (for duplicate checks).
create or replace function public.blog_similar_titles(p_title text)
returns table (source text, ref text, title text, score real)
language sql stable security definer set search_path = '' as $$
  select * from (
    select 'post'::text, p.slug, p.title, extensions.similarity(lower(p.title), lower(p_title))
      from public.blog_posts p where p.status in ('published', 'needs_review')
    union all
    select 'topic'::text, t.id::text, t.title, extensions.similarity(lower(t.title), lower(p_title))
      from public.blog_topics t where t.status in ('in_progress', 'used')
  ) s (source, ref, title, score)
  where s.score >= 0.35
  order by s.score desc
  limit 5;
$$;

revoke all on function public.blog_enqueue_daily(date) from public, anon, authenticated;
revoke all on function public.blog_claim_job() from public, anon, authenticated;
revoke all on function public.blog_similar_titles(text) from public, anon, authenticated;
revoke all on function public.blog_touch_updated_at() from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.blog_enqueue_daily(date) to service_role;
    grant execute on function public.blog_claim_job() to service_role;
    grant execute on function public.blog_similar_titles(text) to service_role;
  end if;
end $$;

-- 11. Seeds ------------------------------------------------------------------------------

insert into public.blog_features (key, name, platforms, plan, facts, guide_slug) values
('tasks', 'Tasks', '{web,ios,android}', 'free', 'Add tasks with a time, priority (high, medium, low), tags and reminders at the start and end time. On the web, type a task and press Enter to add it, or press N for the full form. Drag tasks to reorder them.', 'add-a-task'),
('habits', 'Habits', '{web,ios,android}', 'free_limited', 'Create habits with an icon, colour, days, start and end dates and reminders. Each habit has a heatmap, current streak, best streak and completion rate. The free plan includes 2 active habits; Pro allows more.', 'add-a-habit'),
('habit_groups', 'Habit groups', '{web,ios,android}', 'free', 'Track a habit with up to 4 friends (groups of up to 5) using a private invite code. A leaderboard shows each member''s streak and total days.', null),
('calendar', 'Calendar reminders', '{web,ios,android}', 'free', 'Add events with tags (health, work, urgent, study, personal), colours, all-day or timed slots and repeats. Notifications arrive 3 days before, 24 hours before and at the start time.', 'add-a-calendar-event'),
('focus_timer', 'Pomodoro focus timer', '{web,ios,android}', 'free_limited', 'Pomodoro sessions with focus time, break time and sets. Free accounts use 25 minutes of focus, 5 minutes of break and 4 sets; presets and custom timers are Pro. On the web, link a session to a task and use full-screen desk mode.', 'start-a-focus-session'),
('app_blocking', 'Distraction blocking', '{ios,android}', 'free_limited', 'Block distracting apps on the phone during focus sessions, right away, or on a schedule, with allowed apps. Modes: Gentle (free), Firm and Locked (Pro). Insights show unblock counts and the reasons given. Not available on the web.', 'block-distracting-apps'),
('countdowns', 'Countdowns', '{web,ios,android}', 'free_limited', 'Count down to an exam or event with a reminder on the day. Free plan: 1 countdown up to 30 days away. Pro: more countdowns and no date limit.', 'add-a-countdown'),
('notes', 'Notes', '{web,ios,android}', 'free', 'A notes editor with folders, on the phone and the web.', 'write-a-note'),
('voice_notes', 'Voice notes', '{web,ios,android}', 'free_limited', 'Record a voice note and get a transcript and a short summary. The free plan includes a limited number; Pro includes more.', 'record-a-voice-note'),
('insights', 'Insights', '{web,ios,android}', 'free_limited', 'Level, tasks completed, focus time, weekly and monthly focus charts, habit stats, distraction stats and a weekly report every Sunday. The productivity score and the detailed Catalyst report are Pro. The web adds date ranges and a score breakdown.', 'check-your-insights'),
('focalyst_ai', 'Focalyst AI', '{web,ios,android}', 'free_limited', 'An AI assistant that answers questions from the user''s own tasks, habits, focus and notes, and can add tasks and habits. Free accounts get 5 messages a day; Pro gets more.', 'ask-focalyst-ai'),
('mcp', 'AI connections (MCP)', '{web,ios,android}', 'pro', 'Pro users can connect Claude, ChatGPT and, where Google offers custom connections, Gemini to their Focalyst data through MCP. The AI app can read tasks, habits, focus time, countdowns and notes (including voice-note transcripts and summaries) and, when the user asks, add a task, add a habit, log a habit or add a countdown. Each AI app sees only that user''s data and can be disconnected any time. Includes 500 credits a month plus 10 for each day the user opens Focalyst.', 'connect-ai-apps'),
('widgets', 'Home screen widgets', '{ios,android}', 'free', 'Interactive widgets for tasks, habit streaks, the habit heatmap, the focus timer, countdowns and the date, usable without opening the app, in every iPhone home screen style including Clear and Tinted.', 'add-widgets'),
('sync', 'Web and phone sync', '{web,ios,android}', 'free', 'The same account works on focalyst.online and the iPhone and Android apps, and data stays in sync.', null),
('onboarding_report', 'Starting report', '{web,ios,android}', 'free_limited', 'New users answer a few questions and get a personal plan and a starting report: phone time per year, a 12-week focus plan and habit tips. Part of the report is free; the full report is Pro.', null),
('platforms', 'Where Focalyst runs', '{web,ios,android}', 'free', 'Focalyst runs on the web at focalyst.online and as apps for iPhone and Android. Download links are on focalyst.online/app.', null)
on conflict (key) do update set name = excluded.name, platforms = excluded.platforms, plan = excluded.plan,
  facts = excluded.facts, guide_slug = excluded.guide_slug, updated_at = now();

insert into public.blog_feeds (name, url, kind) values
('OpenAI news', 'https://openai.com/news/rss.xml', 'model_news'),
('Google AI blog', 'https://blog.google/technology/ai/rss/', 'model_news'),
('Google DeepMind blog', 'https://deepmind.google/blog/rss.xml', 'model_news'),
('News: Anthropic Claude model', 'https://news.google.com/rss/search?q=Anthropic+Claude+new+model&hl=en-US&gl=US&ceid=US:en', 'model_news'),
('News: OpenAI new model', 'https://news.google.com/rss/search?q=OpenAI+launches+new+model&hl=en-US&gl=US&ceid=US:en', 'model_news'),
('News: Google Gemini model', 'https://news.google.com/rss/search?q=Google+Gemini+new+model+launch&hl=en-US&gl=US&ceid=US:en', 'model_news'),
('News: study productivity', 'https://news.google.com/rss/search?q=study+productivity&hl=en-IN&gl=IN&ceid=IN:en', 'trend'),
('News: screen time', 'https://news.google.com/rss/search?q=screen+time+study&hl=en-US&gl=US&ceid=US:en', 'trend'),
('News: NEET JEE preparation', 'https://news.google.com/rss/search?q=NEET+JEE+preparation+tips&hl=en-IN&gl=IN&ceid=IN:en', 'trend'),
('News: AI for students', 'https://news.google.com/rss/search?q=AI+for+students+study&hl=en-US&gl=US&ceid=US:en', 'trend'),
('News: digital wellbeing', 'https://news.google.com/rss/search?q=digital+wellbeing+social+media+habits&hl=en-US&gl=US&ceid=US:en', 'trend')
on conflict (url) do nothing;

insert into public.blog_topics (title, primary_keyword, pillar, intent, icp, pain_point, my_term, competitor, priority) values
('The Pomodoro technique when you can''t focus past 10 minutes', 'pomodoro technique for short attention span', 'focus', 'informational', 'students', 'drifts after a few minutes', 'Attention Budget', null, 70),
('A realistic deep work routine for students', 'deep work routine for students', 'focus', 'informational', 'college', 'long study days with little real output', 'Energy-Maxxing', null, 60),
('Why switching tasks feels productive and isn''t', 'task switching cost', 'focus', 'informational', 'professionals', 'busy all day, nothing important done', 'Attention Tax', null, 60),
('How long should a focus session be: 25, 45 or 60 minutes', 'how long should a focus session be', 'focus', 'informational', 'students', 'unsure which timer to use', 'Energy-Maxxing', null, 70),
('Best focus apps for studying, compared honestly', 'best focus app for studying', 'focus', 'commercial', 'students', 'too many apps, none stick', 'Friction Design', null, 80),
('Studying with your phone in the room: what actually works', 'phone while studying', 'focus', 'informational', 'students', 'checks phone during study', 'Friction Design', null, 70),
('A NEET timetable that survives real life', 'neet study timetable', 'study', 'informational', 'exam students', 'timetables collapse after a week', 'Time-Maxing', null, 80),
('JEE daily routine: how many hours of focused study is enough', 'jee study hours per day', 'study', 'informational', 'exam students', 'measures hours, not focus', 'Energy-Maxxing', null, 75),
('How medical students can plan a semester without burning out', 'medical student study schedule', 'study', 'informational', 'medical students', 'huge syllabus, no rest', 'Time-Maxing', null, 70),
('Active recall vs rereading for your next study session', 'active recall study method', 'study', 'informational', 'students', 'rereads notes and forgets', null, null, 60),
('UPSC preparation and phone distraction', 'upsc preparation distraction', 'study', 'informational', 'exam students', 'long prep years, constant scrolling', 'Attention Tax', null, 65),
('Planning backwards from your exam date', 'exam countdown planner', 'study', 'informational', 'students', 'exam feels far away until it is not', 'Time-Maxing', null, 70),
('Revision timetables for board exams that actually stick', 'revision timetable for board exams', 'study', 'informational', 'school students', 'revision pushed to the last week', 'Discipline Debt', null, 60),
('How to build a habit you keep for more than two weeks', 'how to build habits that stick', 'habits', 'informational', 'general', 'habits fade after the first week', 'Friction Design', null, 80),
('Habit streaks: motivation or trap', 'habit streak motivation', 'habits', 'informational', 'general', 'one missed day ends everything', 'Discipline Debt', null, 60),
('Why tracking habits with friends works', 'habit accountability partner app', 'habits', 'commercial', 'students', 'no one notices when they skip', 'Discipline Debt', null, 75),
('What your habit heatmap is telling you', 'habit tracker heatmap', 'habits', 'informational', 'general', 'tracks but never reviews', null, null, 50),
('Start with two habits, not ten', 'how many habits to start', 'habits', 'informational', 'general', 'overloaded habit lists', 'Comfort Tax', null, 60),
('A morning routine without the 5 AM myth', 'morning routine without waking early', 'habits', 'informational', 'professionals', 'guilt about not being a 5 AM person', 'Energy-Maxxing', null, 65),
('How to stop doomscrolling at night', 'how to stop doomscrolling', 'attention', 'informational', 'general', 'loses sleep to the feed', 'Attention Tax', null, 85),
('App blockers: gentle pauses vs hard locks', 'app blocker strict mode', 'attention', 'commercial', 'general', 'blockers too easy or too strict', 'Friction Design', null, 75),
('What four hours of screen time a day costs you in a year', 'screen time per year', 'attention', 'informational', 'general', 'does not see the total', 'Attention Budget', null, 80),
('Why willpower loses to the feed', 'why can''t i stop scrolling', 'attention', 'informational', 'general', 'blames self for scrolling', 'Friction Design', null, 70),
('Turning off notifications without missing what matters', 'notification settings for focus', 'attention', 'informational', 'professionals', 'constant pings', 'Attention Tax', null, 60),
('A practical Reels detox plan for students', 'quit reels while studying', 'attention', 'informational', 'students', 'short videos eat study time', 'Attention Tax', null, 75),
('How to connect Claude to your tasks and habits', 'connect claude to productivity app', 'ai', 'commercial', 'professionals', 'AI does not know their real schedule', 'AI Leverage', null, 85),
('Plan your week with ChatGPT using your real data', 'chatgpt weekly planning', 'ai', 'commercial', 'professionals', 'generic AI plans', 'AI Leverage', null, 80),
('What MCP is and why productivity apps are adding it', 'what is model context protocol', 'ai', 'informational', 'general', 'confused by MCP', 'AI Leverage', null, 75),
('Using AI as a student without outsourcing your thinking', 'how students should use ai', 'ai', 'informational', 'students', 'worried AI makes them lazy', 'AI Amplification', null, 70),
('Voice notes to summaries: capture ideas when you can''t type', 'voice notes transcription app', 'ai', 'commercial', 'creators', 'ideas lost on the go', 'AI Amplification', null, 65),
('Prompts to review your week with AI', 'ai weekly review prompts', 'ai', 'informational', 'professionals', 'skips weekly reviews', 'AI Leverage', null, 60),
('How to plan your day in ten minutes', 'how to plan your day', 'planning', 'informational', 'general', 'starts the day reacting', 'Time-Maxing', null, 80),
('A weekly review template for busy students', 'weekly review template', 'planning', 'informational', 'students', 'weeks blur together', 'Time-Maxing', null, 65),
('Time blocking vs to-do lists', 'time blocking vs to do list', 'planning', 'informational', 'professionals', 'lists never fit the day', 'Time-Maxing', null, 60),
('Plan around your energy, not the clock', 'energy management productivity', 'planning', 'informational', 'general', 'hard work at low-energy times', 'Energy-Maxxing', null, 70),
('Deadlines, countdowns and the planning fallacy', 'planning fallacy deadlines', 'planning', 'informational', 'general', 'always underestimates time', 'Ambition Gap', null, 55),
('Skill stacking while studying a demanding degree', 'skill stacking for students', 'planning', 'informational', 'college', 'wants more than the syllabus', 'Skill Stacking', null, 55),
('Focalyst vs Notion for daily planning', 'notion alternative for daily planning', 'compare', 'comparison', 'professionals', 'Notion setup takes longer than the work', null, 'Notion', 80),
('Focalyst vs Notability for students', 'notability alternative', 'compare', 'comparison', 'students', 'notes app without planning or focus tools', null, 'Notability', 85),
('Focalyst vs Forest: focus timers compared', 'forest app alternative', 'compare', 'comparison', 'students', 'timer alone is not enough', null, 'Forest', 75),
('Focalyst vs Opal: app blockers compared', 'opal app alternative', 'compare', 'comparison', 'general', 'blocker without planning', null, 'Opal', 75),
('Focalyst vs Todoist', 'todoist alternative', 'compare', 'comparison', 'professionals', 'tasks without focus or habits', null, 'Todoist', 70),
('Focalyst vs TickTick', 'ticktick alternative', 'compare', 'comparison', 'students', 'wants blocking and AI on top of tasks', null, 'TickTick', 70),
('The best Notability alternatives for planning and focus', 'notability alternatives', 'compare', 'comparison', 'students', 'needs more than notes', null, 'Notability', 80),
('Habit tracker apps with accountability groups', 'habit tracker app with friends', 'compare', 'commercial', 'general', 'wants to track with friends', null, null, 65),
('Focalyst vs Structured', 'structured app alternative', 'compare', 'comparison', 'professionals', 'visual planner without blocking', null, 'Structured', 60),
('The best all-in-one productivity apps for students', 'all in one productivity app for students', 'compare', 'commercial', 'students', 'too many separate apps', null, null, 80)
on conflict (lower(title)) do nothing;

-- 12. Check: expect posts table 1, tables 8, functions 3, features 16, topics 47+
select 'blog tables' as item, count(*)::text as value from pg_tables
 where schemaname = 'public' and tablename in ('blog_posts','blog_config','blog_features','blog_topics','blog_jobs','blog_model_events','blog_feeds','blog_log')
union all
select 'functions', count(*)::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname in ('blog_enqueue_daily','blog_claim_job','blog_similar_titles')
union all
select 'features', count(*)::text from public.blog_features
union all
select 'topics', count(*)::text from public.blog_topics
union all
select 'feeds', count(*)::text from public.blog_feeds;
