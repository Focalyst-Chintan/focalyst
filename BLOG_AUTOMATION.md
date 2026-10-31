# Focalyst blog automation (the Focalyst Journal)

**What it does:**
- writes and publishes one blog post a day on focalyst.online/blog
- refills its own topic list from what's trending
- publishes a same-day post when OpenAI, Anthropic or Google launches a major model, explaining how Focalyst's AI connections (MCP) work with it

**What it runs on:**
- **Supabase** (free plan): database, scheduled jobs and Edge Functions
- **The free Gemini API key** you already have
- **The existing Next.js blog on Vercel**

**Who builds it:** Claude Code or Antigravity, in 3 phases (section 15). Sohan runs the 2 SQL files and sets the secrets (section 14).

Files that go with this one:
- `BLOG_01_schema.sql`: tables, config, product facts, 47 starter topics. Run first.
- `BLOG_02_schedule.sql`: the schedules. Run last, after the first drafts look right.
- `my-terms.md`, `my-takes.md`, `Anti_AI_slop.md`: Sohan's voice files. Put them in the repo at `content/voice/`. The Edge Functions bundle them as the writer's style source.

---

## 1. How it works

```
pg_cron (Supabase)
 ├─ every hour      blog_enqueue_daily()  → creates today's job at 04:00 UTC (09:30 IST), one per day
 ├─ every 10 min    Edge Function blog-worker → moves ONE job ONE stage forward
 ├─ every 3 hours   Edge Function blog-watch  → reads AI news feeds, detects major model launches
 └─ Mon and Thu     Edge Function blog-trends → finds trending questions, adds topics to the backlog

blog-worker stages for each job:
 research  → Gemini with Google Search grounding: facts, questions people ask, sources (verified)
 outline   → Gemini: title, slug, description, quick answer, H2 plan, FAQ, internal links, CTA spot
 draft     → Gemini: the article in Markdown, in Sohan's voice, using only verified facts and product facts
 review    → code checks (anti-slop, dashes, numbers, links, length, duplicates) + a Gemini critic pass,
             one rewrite if needed; still failing → needs_review (never published)
 publish   → insert into blog_posts → revalidate the Vercel pages → IndexNow ping → done
```

**Why Supabase runs it, not Vercel:**
- Vercel Hobby functions time out fast, and cron is limited there. Supabase Edge Functions allow about 150 seconds per call, and pg_cron is free.
- Doing one stage per call keeps every call short. A post takes about 50 to 60 minutes from start to published.

**Cost:**
- **Supabase:** about 160 Edge Function calls a day, well inside the free plan.
- **Gemini:** about 6 to 10 calls per post, well inside the free tier for the Flash model.
- **Your data:** the free Gemini tier may use prompts to improve Google's products. The pipeline only ever sends public information and Focalyst's public product facts, never user data.

---

## 2. Who we write for (ideal customers)

| ICP | Who | What they search and ask | Where Focalyst fits |
|---|---|---|---|
| A. Exam students (India first) | NEET, JEE, UPSC, CA and board students, 16 to 25 | timetables, study hours, phone addiction while studying, revision plans, countdown to exam | Pomodoro, countdowns, app blocking, habits, starting report |
| B. College and medical students (global) | Undergrads, med and nursing students | semester planning, active recall, burnout, all-in-one study app | Tasks, calendar, focus timer, voice notes with summaries, insights |
| C. Young professionals | 22 to 35, knowledge workers, remote | deep work, time blocking, meetings vs focus, AI planning | Focus timer, planning, Focalyst AI, MCP with Claude or ChatGPT |
| D. Creators, freelancers, solo founders | People who manage their own time | capturing ideas, routines without a boss, energy management | Voice notes, habits, widgets, AI connections |
| E. Ambitious self-improvers | Readers of productivity and self-growth content | doomscrolling, habit building, morning routines, skill stacking | Habits and groups, app blocking, weekly report |

Language: clear international English. Use Indian context (NEET, JEE, ₹) in study posts and global context elsewhere. Never assume the reader's age; treat every reader as capable.

### 2.1 Pain points and the feature that answers each

| Pain point (in the reader's words) | Focalyst answer (from `blog_features` only) |
|---|---|
| "I can't stop scrolling while I study" | App blocking (gentle free; firm and locked Pro), focus sessions with blocking on start |
| "I study 10 hours but get nothing done" | Pomodoro sessions linked to tasks, insights on real focus time |
| "My timetable falls apart after a week" | Daily planning, countdown to the exam, weekly report |
| "I start habits and drop them" | Habits with streaks and heatmaps, habit groups with friends |
| "Too many apps for tasks, notes, timer and habits" | One app on phone and web, in sync |
| "Ideas come when I can't type" | Voice notes with transcript and summary |
| "AI doesn't know my actual schedule" | Focalyst AI and MCP for Claude, ChatGPT and Gemini |
| "I don't know where my time goes" | Insights, screen time maths in the starting report |
| "I want to check my day without opening an app" | Interactive home screen widgets |

---

## 3. Positioning against other apps

Focalyst's line: **one calm app to plan, focus, block distractions, build habits and capture ideas, on phone and web, with your AI connected.**

| App | What it's best at (say this honestly) | Where Focalyst is the better fit |
|---|---|---|
| Notability | Handwritten notes, PDF annotation and audio-synced notes on iPad | People who need planning, focus sessions, app blocking and habits around their notes; voice notes that become transcripts and summaries |
| Notion | Flexible workspaces, docs and databases | People who want a ready-made daily system instead of building one; focus timer and blocking built in |
| Forest | A playful focus timer | People who also need tasks, habits, insights and real app blocking modes |
| Opal | Dedicated screen time and app blocking | People who want blocking inside a planning and focus app, with habits and AI |
| Todoist and TickTick | Task management | People who want focus sessions, blocking, habit groups and AI on their real data in the same place |
| Structured | Visual day planning | People who want blocking, habits and insights with their plan |

**Comparison rules** (the critic checks these):
1. **Every claim about another app comes from that app's own website, help centre or App Store or Play Store listing,** fetched during research. It's cited in the sources with the date it was checked: "as of {Month Year}".
2. **Comparisons are fair.** Each one includes a "Choose {competitor} if…" section that says honestly when the other app is the better choice. This builds trust, and AI answer engines quote balanced comparisons more.
3. **No disparaging words** ("bloated", "outdated", "terrible"). No prices for other apps unless they come from their official page, with a date.
4. **Competitor names are used only to identify them.** No logos or screenshots of other apps.

---

## 4. Content strategy

### 4.1 Pillars and topic hubs

Each pillar has a hub page at `/blog/topics/{pillar}` that links to every post in it (section 12.3). Every post links back to its hub, to 2 related posts in the same pillar, and to the matching `/guides` page when it mentions a feature.

| Pillar key | Hub name | Weekday (IST) | Typical posts |
|---|---|---|---|
| focus | Focus and deep work | Monday | Pomodoro, deep work, task switching, focus session length |
| study | Study systems | Tuesday | NEET, JEE and UPSC timetables, revision, exam countdowns, med school planning |
| compare | Comparisons and alternatives | Wednesday | Focalyst vs X, best X alternatives, best apps for Y |
| habits | Habits and consistency | Thursday | Habit building, streaks, accountability groups, routines |
| ai | AI for productivity | Friday | MCP, Claude and ChatGPT with your data, AI for students, voice notes |
| attention | Screen time and distraction | Saturday | Doomscrolling, app blockers, notifications, Reels detox |
| planning | Planning and time | Sunday | Daily planning, weekly review, time blocking, energy, skill stacking |

The weekday mapping lives in `blog_config.weekday_pillars` and can be changed in SQL. **Model launch posts** are extra posts on top of the daily one, at most 1 a day.

### 4.2 Where topics come from

1. **Seed backlog:** 47 topics in `BLOG_01_schema.sql`, each with a primary keyword, ICP, pain point, pillar and one of Sohan's terms.
2. **Trends** (`blog-trends`, twice a week): Gemini with Google Search finds what people in the ICPs are asking right now (news, exam dates, app updates, viral habits). It also reads the trend feeds in `blog_feeds`, then adds up to 6 new topics with sources, skipping anything too close to existing posts or topics (trigram similarity at 0.35 or above).
3. **Model launches** (`blog-watch`): section 9.
4. **Manual:** Sohan can insert a topic any time (section 13).

**Picking order** (`blog_enqueue_daily`):
1. the highest-priority idea in today's pillar
2. otherwise, the highest-priority idea in any pillar
3. otherwise, the worker finds a timely topic for today's pillar during research

### 4.3 Post types

| Kind | When | Length | Must include |
|---|---|---|---|
| article | Most days | 1,100 to 1,800 words | Quick answer, 4 to 7 H2s answering one question each, 3 to 5 FAQs, 3+ sources, inline CTA, 1 to 3 Focalyst feature mentions where they genuinely help |
| comparison | Wednesdays and "alternatives" topics | 1,300 to 2,000 words | Quick answer naming who should pick what, a comparison table (rows = jobs to be done, not marketing features), "Choose {competitor} if…", "Choose Focalyst if…", official sources for both |
| news | Model launches and real news | 800 to 1,300 words | What happened (cited), what it means for the reader, how to use it with Focalyst, honest limits |
| guide | Step-by-step how-tos | 900 to 1,500 words | Numbered steps; links to the matching `/guides` page |

### 4.4 Sohan's terms and takes

- **One primary term per post,** taken from `blog_topics.my_term` (or chosen by the outline when it's empty). The first time, define it in plain words, then give an example: term → definition → example → takeaway (my-terms.md, section 2). At most one secondary term, and never more than 2 terms in a post.
- **Takes** (my-takes.md) shape the opinions:
  - one important thing at a time
  - productivity means control, not maximum output
  - no 5 AM glorification; protect 6 to 7 hours of sleep
  - designing your environment is discipline
  - use AI as an amplifier, not a replacement for thinking
  - start now, not on January 1

  Each post takes a clear position that fits these. Never contradict them.
- **Focalyst** comes in as the practical way to do the idea (Friction Design → app blocking; Attention Tax → focus sessions and insights), never as an unrelated advert.

---

## 5. Post structure (what every post looks like)

The `content_md` body, written by the draft stage:

```
(no H1: the page renders the title)

Opening: 2 to 4 short paragraphs. First sentence states the problem or answer directly.
No scene-setting. If it fits, one concrete detail (a number from a source, a specific exam, a real situation).

## {Question-style H2 that a reader would type}
Lead: 2 to 3 sentences that answer it directly (this is what AI engines quote).
Then: explanation, example, steps or a short table. Inline citations as [publisher](url).

## {H2}
...

[[cta]]          ← exactly once, after the 2nd or 3rd H2 (renders the inline CTA card)

## {H2}
...

## {Last H2: what to do next / a clear recommendation}
Ends on the point itself. No "In conclusion".
```

Rendered by the page from other fields, so the body must NOT repeat them:
- `quick_answer`: the box under the title
- `faq`: the FAQ section
- `sources`: the Sources list
- `comparison`: the comparison table, for comparison posts
- the end CTA card, related posts, the hub link and the AI disclosure line

---

## 6. Voice and anti-slop rules (the writer's style guide)

The Edge Functions put this block (`_shared/style.ts`), plus the full text of `Anti_AI_slop.md` and the relevant parts of `my-terms.md` and `my-takes.md`, into every outline, draft and critic call:

```
You write for the Focalyst Journal, the blog of Focalyst ("Own your time"), a productivity app for
students and ambitious people. Write like a sharp, honest friend who studies hard and builds things:
direct, specific, warm, sometimes opinionated. Plain international English. Short and long sentences
mixed. Paragraphs of different lengths.

Hard rules:
- No em dashes or en dashes used as dashes. No exclamation marks. Sentence case headings.
- Never use: delve, tapestry, realm, landscape, intricate, pivotal, crucial, multifaceted,
  transformative, vibrant, seamless, meticulous, robust, foster, leverage (except the term
  "AI Leverage"), navigate, underscore, showcase, unlock, garner, bolster, utilize, testament,
  game-changer, supercharge, elevate, embark, harness, boasts.
- Never use: "in today's", "fast-paced world", "ever-evolving", "it is important to note",
  "it's worth noting", "let's dive", "dive into", "at its core", "when it comes to",
  "in recent years", "in conclusion", "to sum up", "in summary", "ultimately", "moreover",
  "furthermore", "additionally", "the good news is", "level up", "the future is bright",
  "studies show", "experts agree", "research shows" (name and link the source instead).
- Avoid "not just X, but Y", "whether you're X or Y", "from X to Y" unless truly needed (max once).
- Every number, percentage, date or study you mention must come from the VERIFIED FACTS list and be
  linked to its source. If a fact isn't in the list, don't state it.
- Claims about Focalyst come ONLY from PRODUCT FACTS, word for word in meaning: features, platforms,
  free vs Pro limits. Never invent features, numbers of users, ratings, reviews or results.
- Claims about other apps come ONLY from VERIFIED FACTS taken from their official pages.
- No medical advice. For sleep, health or mental health, stay general, cite reputable sources
  and suggest a professional when relevant.
- Take a position. Say what you recommend and why, then the real limitation or exception.
- Don't announce what the post will do. Start with the point.
- Don't end with a summary. End when the last useful point is made.
- Never pretend to be Sohan or invent personal stories. Write as "we" (the Focalyst team) or
  address the reader as "you".
```

---

## 7. Pipeline stages and Gemini prompts

**Gemini client** (`_shared/gemini.ts`):
- REST `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`, with the header `x-goog-api-key: GEMINI_API_KEY`.
- Models come from `blog_config`: `model_research` and `model_writer`, both `gemini-2.5-flash` by default. Before building, check the current free model names in Google AI Studio and update the config row if they've changed.
- Timeout 110 s.
- 429 or 503 errors: wait 20 s and retry once; still failing → set `run_after = now() + 1 hour`, keep the stage.
- Any other failure → `attempts`. After 3 attempts at the same stage, the job becomes `failed`; its topic goes back to `idea` with priority − 10.
- **JSON output:** structured calls use `generationConfig.responseMimeType = "application/json"` with a `responseSchema`. Grounded calls (`tools: [{ google_search: {} }]`) can't use a schema, so they ask for one JSON object in a fenced block and parse it leniently.

### 7.1 Research (grounded)

The prompt receives:
- the topic (title, primary keyword, pillar, intent, ICP, pain point, competitor, my_term)
- today's date
- for comparisons: the competitor's name

```
Research this blog topic for {ICP}. Today is {date}.
Topic: {title}. Primary keyword: {keyword}. Reader problem: {pain_point}.
{If comparison: "Find {competitor}'s current features, platforms and pricing from its OFFICIAL website,
help centre or App Store / Play Store listing only."}
Find:
1. the 5 to 8 questions people actually ask about this (from search results, forums, news)
2. 5 to 10 specific, checkable facts (numbers, findings, official statements, dates), each with the
   exact page it came from
3. what the top-ranking pages say and what they miss (one line each, max 5)
4. a clear angle we can take that is more useful or more honest than those pages
Return one JSON object in a ```json block:
{ "questions": [..], "facts": [{ "id": "f1", "claim": "...", "source_title": "...", "source_url": "...",
  "publisher": "..." }], "gaps": [..], "angle": "...", "secondary_keywords": [..] }
Only include facts you found in the search results. Do not guess.
```

**After the call** (`_shared/verify.ts`):
1. Read `candidates[0].groundingMetadata.groundingChunks[].web.{uri,title}`. Those URIs are Google redirect links, so open each one with `fetch(uri, { redirect: 'follow' })` and keep the final `res.url`.
2. Match every fact's `source_url` to a grounded URL (or open it directly). Keep a fact only if:
   - its page returns 200 with HTML within 10 s
   - the domain isn't on the block list (content farms, AI-generated listicle sites, pastebins)
3. Need at least 3 verified facts from 2 different domains. For comparisons, at least 1 official page for the competitor. Otherwise, run research once more with "find primary sources" added; still short → `needs_review`.
4. Save `{ questions, facts (verified only, with final URLs and the date checked), gaps, angle, secondary_keywords }` to `blog_jobs.research`.
5. **If the job has no topic:** before research, ask Gemini (grounded) for one timely topic for today's pillar and ICPs, insert it into `blog_topics` (`source = 'trend'`), and continue with it.

### 7.2 Outline (structured)

The prompt receives:
- the topic and research
- `PRODUCT FACTS`: all active `blog_features` rows
- `INTERNAL LINKS`: `/guides/{slug}` for every guide in `src/content/guides.ts` (title and URL), plus the 30 latest published posts (title and URL)
- the style guide, and `my_term` with its definition

```
Plan a {kind} post for the Focalyst Journal. Follow the STYLE GUIDE. Use only VERIFIED FACTS and
PRODUCT FACTS. Output JSON matching the schema.
- title: a clear, specific promise in sentence case, max 58 characters, includes the primary keyword
  naturally. No clickbait, no year unless the post is time-sensitive.
- slug: lowercase-hyphenated, max 60 characters, from the keyword.
- description: 140 to 158 characters, a plain summary that answers the query.
- quick_answer: 40 to 70 words that fully answer the main question on their own.
- sections: 4 to 7, each { h2 (question or clear statement a reader would search), lead (2 to 3
  sentences answering it directly), points (3 to 6 bullet notes), fact_ids, feature_keys }.
- cta_after_section: 2 or 3.
- faq: 3 to 5 { q (real question from research), a (40 to 80 words, self-contained) }, not repeating H2s.
- comparison (comparison posts only): { columns: ["", "Focalyst", "{competitor}"], rows: 6 to 9
  [job to be done, short factual cell, short factual cell] }, every competitor cell backed by a fact_id.
- internal_links: 3 to 5 { anchor, href } chosen ONLY from INTERNAL LINKS.
- tags: 2 to 4 from: Focus, Study, Habits, Screen time, AI, Planning, Comparisons, Exams, Students.
- my_term_plan: where the term {my_term} is defined and where it's used again.
```

The schema enforces types and lengths. After it returns, code checks: the slug is unique (add `-2` if taken); `blog_similar_titles(title)` gives nothing ≥ 0.6 (otherwise the outline is redone once with "choose a different angle").

### 7.3 Draft (structured)

The prompt receives the outline, the verified facts, the product facts, the style guide, and the full `Anti_AI_slop.md`.

```
Write the article body in Markdown following the OUTLINE exactly and the STYLE GUIDE strictly.
- No H1. Use "## " for each section h2 from the outline, in order. "### " only when a section needs
  sub-steps.
- Start each section with its lead (you may refine the wording), then develop it with specifics,
  an example and, when useful, a short list or table. Not every section needs a list.
- Put the line [[cta]] alone on its own line after section {cta_after_section}.
- Cite facts inline as [publisher](url) right after the claim. Use each listed source at least once
  if relevant. No other external links.
- Add the internal links from the outline naturally in the text.
- Mention Focalyst only where it solves the reader's problem, using PRODUCT FACTS, 1 to 3 times,
  each with the matching /guides link when one exists. Say clearly when something is Pro-only or
  phone-only.
- Do not write the FAQ, the sources list, a conclusion section or a sign-off.
- {min_words} to {max_words} words.
Return JSON { "content_md": "...", "word_count": n }.
```

### 7.4 Review (code checks, critic, rewrite)

**A. Code checks** (`_shared/lint.ts`). These are hard failures:
- **Banned words and phrases:** the style guide lists, case-insensitive whole words. "AI Leverage" with that capitalisation is allowed.
- **Dashes:** no "—" or "–" anywhere, and no " - " used as a dash between words.
- **Exclamation marks:** none, outside code.
- **Length:** word count inside the min and max.
- **Headings:** H2 count between 4 and 7 (articles) or 4 and 8 (comparisons). The first paragraph after each H2 is 70 words or fewer.
- **CTA:** `[[cta]]` appears exactly once.
- **External links:** every one is in the verified sources.
- **Internal links:** every one is in the internal links list. At least 2 internal links.
- **Numbers:** every number with %, ×, "hours", "minutes", "days", "years" or a 4-digit year either appears in a verified fact (normalised), matches a value in PRODUCT FACTS, or is a plain list or step number. Anything else fails.
- **Terms:** `my_term` appears at least once. No more than 2 different terms from my-terms.md.
- **Rhythm:** sentence-length standard deviation at least 6 words. No more than 2 paragraphs in a row starting with the same word.
- **Quick answer:** 40 to 70 words, and it shares the main keyword idea with the title.
- **Duplicates:** `blog_similar_titles(title)` gives nothing ≥ 0.6, and no published post in the last 60 days uses the same primary keyword.

**B. Critic** (structured, temperature 0.2). It receives the draft, outline, facts, product facts and style guide, and returns `{ verdict: "pass" | "fix", issues: [{ type, quote, fix }] }`. It checks for:
- claims not supported by the facts
- wrong Focalyst claims
- unfair competitor claims
- generic or "could fit any topic" sentences
- missing position or recommendation
- repeated points
- slop patterns the code can't catch (formulaic contrasts, empty reassurance, brochure tone)

**C. Rewrite:** if the code checks or the critic fail, run one rewrite call with the exact list of violations and issues ("fix only these, keep everything else"), then re-run A and B.

**D. Result:**
- passes → stage `publish`
- fails again → stage `needs_review`, with all violations in `checks`. A `blog_posts` row is created with status `needs_review` so Sohan can read it; it's never published.

### 7.5 Publish

1. Build the `blog_posts` row:
   - `title`, `meta_title` (same as the title)
   - `description`, `quick_answer`, `content_md`
   - `faq`, `sources` (verified facts' unique pages, each `{ title, url, publisher, checked }`), `comparison`
   - `tags`, `pillar`, `kind`, `primary_keyword`, `secondary_keywords`, `my_term`
   - `word_count`, `reading_minutes` = ceil(words ÷ 230)
   - `author` from config, `ai_assisted` = true, `checks`, `topic_id`, `job_id`
2. Set the status: `published` with `published_at = now()` when `auto_publish` is true; otherwise `needs_review`.
3. Revalidate: `POST {site_url}/api/revalidate` with the header `x-revalidate-secret` and body `{ slug }`. It refreshes `/blog`, `/blog/{slug}`, the pillar hub, `sitemap.xml`, `rss.xml` and `llms.txt`.
4. Ping IndexNow: `GET https://api.indexnow.org/indexnow?url={encoded post url}&key={INDEXNOW_KEY}`. This notifies Bing, which feeds Copilot and ChatGPT search, and Yandex. Google finds new posts through the sitemap.
5. Mark the topic `used`, the job `done`, and add a log line.

---

## 8. Trend finding (`blog-trends`)

Runs Monday and Thursday.
1. **Read the trend feeds** in `blog_feeds` (`kind = 'trend'`): items from the last 7 days.
2. **Ask Gemini** (grounded):

   ```
   For these readers: {ICP list}, find 10 questions or topics people are actively searching or
   discussing this week related to {pillar list}. Prefer exam dates and results, new study rules,
   app updates (screen time, social media features), viral productivity methods, AI tools for
   students. For each: { title, primary_keyword, pillar, intent, icp, pain_point, my_term or null,
   why_now, source_urls (2+) }. JSON in a ```json block. No topics about specific people's private
   lives, tragedies or politics.
   ```

3. **Keep the good ones:** verify the source URLs (as 7.1), drop anything ≥ 0.35 similar to existing topics or posts, and insert up to 6 with `source = 'trend'` and priority 75 (90 if `why_now` names a date within 14 days).

---

## 9. Model launches (`blog-watch`)

Runs every 3 hours.
1. **Read** the `model_news` feeds: items from the last 72 hours.
2. **Pre-filter** titles by keyword: GPT, o-series names, Claude, Opus, Sonnet, Haiku, Gemini, "new model", "introducing", "launch", "release".
3. **Classify each remaining item:**

   ```
   Is this an announcement of a NEW major AI model (not a feature, price change, paper or minor
   update) from OpenAI, Anthropic or Google, available to the public now or within days?
   Return { is_major_model_release, vendor: openai|anthropic|google|null, model_name, official_url
   (the vendor's own announcement page if you can find it), confidence 0..1 }.
   ```

4. **Act only when all of these hold:**
   - `is_major_model_release` is true and confidence is at least 0.8
   - `official_url` is on openai.com, anthropic.com, blog.google, deepmind.google or ai.google.dev
   - the vendor and model name aren't already in `blog_model_events`

   Then insert the event, create a topic (`source = 'model_event'`, pillar `ai`, intent `news`, priority 100) and a job (`kind = 'model_launch'`, which runs before the daily job). Limit: `max_launch_posts_per_day`.
5. **The news post template** (it overrides the outline sections):
   - **Title pattern:** "{Model} is out: using it with your Focalyst plan". Max 58 characters, shortened naturally if needed.
   - **H2s:**
     1. "What {vendor} released", with facts only from the official announcement, cited
     2. "What a stronger model can do with your own data", framed as "can", with no benchmarks unless cited
     3. "How to connect Focalyst to {ChatGPT | Claude | Gemini}", with steps from the `mcp` feature facts and a link to `/guides/connect-ai-apps`
     4. "Prompts to try with your Focalyst data", 5 prompts tied to tasks, habits, focus time, countdowns and voice-note summaries
     5. "Limits to know"
   - **Honesty rules:**
     - Focalyst's connection works through the AI app (ChatGPT, Claude or Gemini). It is not built into the model.
     - Never say Focalyst "integrates", "trained on" or "tested" the model unless a product fact says so.
     - Say plainly that AI connections need Focalyst Pro, that which models you can use depends on your plan with that AI app, and that Gemini custom connections are only on some accounts.

---

## 10. Product facts (`blog_features`)

- **The only source** of anything the writer says about Focalyst: 16 rows are seeded from the guides and the current plan limits.
- **When a feature or limit changes,** update the row (section 13). Every future post follows automatically.
- **Never put prices in posts,** except comparison posts, which can say "Focalyst has a free plan; see focalyst.online/app for Pro pricing".

---

## 11. Honesty and safety rules (enforced by the critic, listed here for Sohan)

1. **Facts:**
   - No invented statistics, studies, quotes, user counts, ratings or testimonials.
   - Every number is cited, or comes from the product facts.
   - Posts about health, sleep and mental health stay general and cite reputable sources. They never give medical advice and never mention self-harm methods. They suggest professional help when relevant.
   - Competitor claims follow section 3.
2. **No impersonation:** no posts written as Sohan, and no first-person stories.
3. **The AI disclosure line** sits under every post while `ai_disclosure` is true: "Written with AI assistance from the sources listed above and checked against Focalyst's product notes." It's honest, and Google's guidance says AI-assisted content is fine when it's helpful and accurate.
4. **No content about** private individuals, tragedies, politics or anything outside the pillars.
5. **The kill switch:** `update blog_config set enabled = false` stops new jobs at once (section 13).

---

## 12. The website (Next.js on Vercel)

The blog UI exists from the desktop phase (`DESKTOP_DESIGN.md` section 7.11: index, article page, theme, typography). This phase connects it to the database and adds everything below. Same design language: `AmbientBackground`, `frost` cards, Instrument Serif titles, brand blue, both themes, phone-first reading.

### 12.1 Data

- `src/lib/blog/source.ts` reads `blog_posts` with the public anon key on the server: `getPosts({ page, tag, pillar })`, `getPost(slug)`, `getRelated(post)`, `getAllSlugs()`. Only published posts (RLS already enforces this).
- **Rendering:** ISR with `revalidate = 3600`, plus on-demand revalidation.
- **The Capacitor export build:** must keep passing. The blog stays web-only, as 7.11 says.

### 12.2 Article page additions (`/blog/[slug]`)

In reading order:
1. **Breadcrumb:** Blog / {pillar hub name}.
2. **Title, description and meta row:** as 7.11, plus "Updated {date}" when `updated_at` is more than a day after `published_at`.
3. **Quick answer box:** `frost`, radius 20, padding 20, a 3 px left bar in `primary`, overline "QUICK ANSWER", 17/28 text. It sits right under the meta row.
4. **No cover photo.** Use a typographic cover: the 7.11 gradient tile (#03195B to #1951FC with grain), the pillar name in micro text and the title in Instrument Serif, at 16:10 on phones and 21:9 on desktop. The same design is used for the OG image (12.5).
5. **The body** from `content_md` with `react-markdown` and `remark-gfm` (no raw HTML), with the 7.11 typography.
   - The line `[[cta]]` is replaced by the **inline CTA card**: `glass liquid`, radius 20, padding 24, title "Plan it, focus on it, track it." (serif 24), line "Focalyst brings your tasks, focus sessions, app blocking and habits into one app.", and 2 buttons:
     - Primary **Get the app** → `{app_cta_url}?utm_source=blog&utm_medium=inline&utm_campaign={slug}`
     - Secondary **Use it on the web** → `{web_cta_url}?utm_source=blog&utm_medium=inline&utm_campaign={slug}`
   - Tables: horizontal scroll on phones, sticky first column, hairline borders, zebra rows using `surface-2`.
   - External links open in a new tab with `rel="noopener"`. Internal links don't.
6. **Comparison table** (comparison posts): rendered from `comparison` as a styled table under the second H2, with the Focalyst column header in `primary-text`.
7. **FAQ:** h2 "Frequently asked questions", each item a `<details>` with the answer in the HTML (crawlable), `frost` rows, `ChevronDown`.
8. **Sources:** h2 "Sources", a numbered list of `{publisher}: {title}` links, with "checked {date}" in 13 `ink-3`.
9. **End CTA card:** as 7.11, but with 2 buttons:
   - **Get the app** → `{app_cta_url}?utm_source=blog&utm_medium=end&utm_campaign={slug}`
   - **Use it on the web** → `{web_cta_url}?...utm_medium=end...`

   Line: "Focalyst is free to start on iPhone, Android and the web."
10. **More on this:** a link to the pillar hub, plus 3 related posts (same pillar first).
11. **The AI disclosure line** (11.3), 13 `ink-3`.
12. **Share row** as 7.11.

**On phones:**
- one column, 20 px gutters
- the table of contents becomes a collapsible "On this page" row under the quick answer
- 17/30 body text
- CTA buttons full width

### 12.3 New pages

- `/blog/topics/{pillar}`: hub pages. A serif title from the hub names in 4.1, plus a 1 to 2 sentence intro:
  - focus: "How to protect your attention long enough to do work you're proud of."
  - study: "Timetables, revision and exam planning for students with more syllabus than time."
  - habits: "Building habits that last past week two, alone or with friends."
  - attention: "Screen time, doomscrolling and the tools that put you back in charge."
  - ai: "Using AI with your real plan, without handing over your thinking."
  - planning: "Planning days and weeks around what matters and the energy you have."
  - compare: "Honest comparisons of Focalyst and other productivity apps."

  Then the post grid for that pillar, newest first, 12 per page.
- `/blog` index: the 7.11 design, plus a row of pillar chips linking to the hubs.

### 12.4 SEO and AEO technical

- **Metadata per post:**
  - title `{title} | Focalyst`
  - description
  - canonical `https://focalyst.online/blog/{slug}`
  - OpenGraph `article` with `published_time`, `modified_time` and `section` = pillar
  - Twitter large card
- **JSON-LD per post** (one `<script type="application/ld+json">` holding an `@graph`):
  - `BlogPosting`: headline, description, datePublished, dateModified, author `{ @type: Organization, name: Focalyst }`, publisher (Organization with logo), mainEntityOfPage, image (the OG image URL), keywords, articleSection
  - `FAQPage` from `faq`
  - `BreadcrumbList`
  - for comparison posts, `ItemList` of the 2 apps
  - **Organization on the root layout:** name, url, logo, `sameAs` (Instagram, YouTube, the App Store listing, the Google Play listing: Claude Code reads these URLs from the /app page or site config)
- **`/app` page:** add `SoftwareApplication` JSON-LD:
  - name Focalyst
  - operatingSystem "iOS, Android, Web"
  - applicationCategory "ProductivityApplication"
  - offers with price 0 (free plan), priceCurrency USD
  - no ratings unless real store data is wired in
- **Sitemap:** every published post (`lastModified` = `updated_at`), every pillar hub and `/blog`.
- **RSS:** `/blog/rss.xml`, the latest 30 posts with full description.
- **`/llms.txt`:** add a "Journal" section listing the latest 50 posts (title, URL, one-line description) and the pillar hubs, next to the guides section.
- **`robots.ts`:** keep the existing rules, and explicitly allow `GPTBot`, `OAI-SearchBot`, `ChatGPT-User`, `ClaudeBot`, `Claude-User`, `PerplexityBot`, `Google-Extended`, `Applebot-Extended` and `Bingbot` on `/`, `/blog`, `/guides` and `/app`.
- **IndexNow key file:** `public/{INDEXNOW_KEY}.txt` containing the key. The key is public by design.
- **`/api/revalidate`** (route handler, web only; it doesn't exist in the export build):
  - POST only
  - header `x-revalidate-secret` must equal `REVALIDATE_SECRET`, compared in constant time; otherwise 401
  - body `{ slug }`, validated (`^[a-z0-9-]{1,80}$`)
  - revalidates the paths in 7.5
  - exempt from the user-session part of `withGuard` (like the Polar webhook) but keeps the rate limit
- **Server-rendered HTML:** headings, quick answer, FAQ and sources are all present without JavaScript.

### 12.5 OG images

`src/app/blog/[slug]/opengraph-image.tsx` (Next `ImageResponse`), 1200 × 630:
- the brand gradient with grain
- the pillar in white micro text
- the title in a serif font (Instrument Serif fetched once and cached)
- "focalyst.online" bottom left

The same visual is used as the in-page typographic cover.

---

## 13. Running it (Sohan's SQL snippets)

```sql
-- What happened recently
select at, fn, level, message from public.blog_log order by at desc limit 30;

-- Jobs that need you
select id, kind, stage, last_error, created_at from public.blog_jobs
 where stage in ('needs_review', 'failed') order by created_at desc;

-- Read a post waiting for review (or open it via the site after publishing)
select slug, title, checks from public.blog_posts where status = 'needs_review' order by created_at desc;

-- Approve a post that needs review (after reading it)
update public.blog_posts set status = 'published', published_at = now() where slug = 'the-slug';
-- then open https://focalyst.online/blog/the-slug once; the page refreshes within the hour,
-- or the next publish triggers a refresh

-- Turn auto-publishing on (after 3 good drafts) or off
update public.blog_config set auto_publish = true;

-- Pause everything / resume
update public.blog_config set enabled = false;
update public.blog_config set enabled = true;

-- Add your own topic, top priority
insert into public.blog_topics (title, primary_keyword, pillar, intent, icp, pain_point, my_term, priority, source)
values ('Your idea', 'your keyword', 'study', 'informational', 'exam students', 'the reader problem', 'Time-Maxing', 95, 'manual');

-- Update a product fact when a feature or limit changes
update public.blog_features set facts = 'New, accurate sentence.', updated_at = now() where key = 'countdowns';

-- Change the model (check the name in Google AI Studio first)
update public.blog_config set model_writer = 'gemini-2.5-flash';
```

---

## 14. Sohan's setup steps

1. **Run `BLOG_01_schema.sql`** in the Supabase SQL Editor. Expected check: blog tables 8, functions 3, features 16, topics 47, feeds 11. It updates the existing `blog_posts` table without losing anything.
2. **Make 3 random secrets.** In your Mac's Terminal, run `openssl rand -hex 24` 3 times, and paste the results somewhere private:
   - `CRON_SECRET`
   - `REVALIDATE_SECRET`
   - `INDEXNOW_KEY` (use 32 hex characters: `openssl rand -hex 16`)
3. **Supabase Edge Function secrets:** Dashboard → Edge Functions → Secrets (or Claude Code runs `npx supabase secrets set` for you, without printing them). Add:
   - `GEMINI_API_KEY`
   - `CRON_SECRET`
   - `REVALIDATE_SECRET`
   - `INDEXNOW_KEY`
   - `SITE_URL` = `https://focalyst.online`

   (`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are already available to Edge Functions.)
4. **Vercel environment variables** (Production): `REVALIDATE_SECRET` and `INDEXNOW_KEY` (the same values), then Redeploy.
5. **Supabase CLI login** (once, on your Mac, so Claude Code can deploy): `npx supabase login`, then in the repo `npx supabase link --project-ref <your project ref>`.
6. **After phase B2:** read the 2 test drafts (section 13 query). If they're good, run `BLOG_02_schedule.sql` with your project ref and `CRON_SECRET` filled in. Expected: 5 schedules listed.
7. **After 3 good daily drafts:** turn on `auto_publish` (section 13).
8. **Once:**
   - Submit `https://focalyst.online/sitemap.xml` in Google Search Console and Bing Webmaster Tools.
   - In Bing, turn on IndexNow.

---

## 15. Phases and prompts (Claude Code or Antigravity)

Put `BLOG_AUTOMATION.md` in the repo root and the 3 voice files in `content/voice/`. One fresh chat per prompt.

### PROMPT B1 · Website: blog connected, SEO and AEO

```
Read BLOG_AUTOMATION.md sections 5, 11 and 12, and DESKTOP_DESIGN.md section 7.11. Read the existing blog files (src/lib/blog/source.ts, the /blog pages and components), src/app/sitemap.ts, src/app/robots.ts, the /app page, the root layout, src/lib/server/guard.ts and any existing llms.txt, once each.

Build phase B1 on the web app only. Don't touch the phone app. Never run SQL. Never run npm run dev.
1. src/lib/blog/source.ts: read published posts from Supabase (anon key, server only) with getPosts({ page, tag, pillar }), getPost(slug), getRelated(post), getAllSlugs(). Types for every blog_posts column in BLOG_01_schema.sql.
2. Article page additions in 12.2: breadcrumb, quick answer box, typographic cover, [[cta]] → inline CTA card, table styles, comparison table, FAQ with <details>, Sources, end CTA with 2 buttons and UTM links (URLs from blog_config are not readable by the browser, so put app and web CTA URLs in a constants file: https://focalyst.online/app and https://focalyst.online/start), related posts, AI disclosure line, phone layout. react-markdown + remark-gfm, no raw HTML.
3. Pillar hub pages /blog/topics/[pillar] with the names and intros in 4.1 and 12.3, and pillar chips on /blog.
4. Everything in 12.4: metadata, JSON-LD @graph (BlogPosting, FAQPage, BreadcrumbList, ItemList for comparisons), Organization on the root layout with sameAs read from the /app page store links, SoftwareApplication on /app, sitemap, RSS at /blog/rss.xml, llms.txt Journal section, robots AI crawler allow list, the IndexNow key file read from process.env.INDEXNOW_KEY at build (create public file via a route handler at /[key].txt only if a static file isn't possible; prefer a small route src/app/[indexnowKey]/route.ts that returns the key only when the path matches the env value).
5. /api/revalidate exactly as 12.4 (POST, constant-time secret check, slug validation, revalidatePath for the post, /blog, the hub, sitemap, rss and llms.txt; exempt from the session check in withGuard but rate limited).
6. OG image route as 12.5.
7. The export build must still pass: blog stays web only (as 7.11 already says).

Tokens only, both themes, phone-first reading, copy rules (sentence case, no em dashes, no exclamation marks).

BUILD AND SHIP:
1. pkill -f "next build"; pkill -f "next dev"; true
2. perl -e 'alarm shift; exec @ARGV' 900 npx next build > /tmp/focalyst-web.log 2>&1; echo "EXIT=$?"; tail -n 40 /tmp/focalyst-web.log
   EXIT=0 passed. Otherwise fix only the shown errors, at most 3 tries. EXIT=142: stop and show me the last 40 lines.
3. git add -A && git status --short (no .env file; if one is listed, git restore --staged it)
4. git commit -m "feat(blog): database posts, AEO structure, revalidate, hubs" && git push origin main && git log -1 --oneline

Report in under 15 lines.
```

### PROMPT B2 · Supabase Edge Functions: the writer

```
Read BLOG_AUTOMATION.md in full, plus BLOG_01_schema.sql, content/voice/my-terms.md, content/voice/my-takes.md and content/voice/Anti_AI_slop.md, and src/content/guides.ts (for the guide slugs). Read each once.

Build phase B2: the automation as Supabase Edge Functions (Deno, TypeScript) in supabase/functions/.
1. _shared/: gemini.ts (7 intro: REST client, timeouts, retries, JSON and grounded modes, grounding metadata), verify.ts (7.1: resolve grounding redirects, fetch-check URLs, domain block list), style.ts (the section 6 block plus the voice files bundled as strings at build), prompts.ts (7.1 to 7.4, 8, 9 prompts exactly as written, with response schemas), lint.ts (every check in 7.4 A, returning a list of violations with the offending text), db.ts (service-role supabase-js client from SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY), publish.ts (7.5 including revalidate and IndexNow), auth.ts (reject any request whose x-cron-secret header is not exactly CRON_SECRET, constant-time compare).
2. blog-worker/index.ts: claim one job with rpc('blog_claim_job'), run its stage (7.1 to 7.5), save results, move it to the next stage with run_after = now(), unlock it, log to blog_log. Errors and retries as section 7 intro. Must finish within 140 seconds.
3. blog-watch/index.ts (section 9) and blog-trends/index.ts (section 8).
4. A dry-run mode: when the request body is {"dry_run": true, "topic_title": "..."}, run research → outline → draft → review for that topic in sequence across worker calls but always end in needs_review (never publish).
5. Never log the API key, secrets or full prompts; log stage names, durations, counts and errors only.
6. Verify each URL in blog_feeds returns valid RSS or Atom; list any that fail so I can replace them (don't change the table).
7. Deploy: npx supabase functions deploy blog-worker --no-verify-jwt, and the same for blog-watch and blog-trends. If not logged in or linked, stop and tell me the exact commands.
8. Test: call blog-worker with the secret header and {"dry_run": true, "topic_title": "Focalyst vs Notability for students"} until the job reaches needs_review (about 4 to 6 calls), then the same for "How to stop doomscrolling at night". Show me the lint results and the first 300 words of each draft. Do not run BLOG_02_schedule.sql.

Commit (no secrets, no .env): git add -A && git status --short, then git commit -m "feat(blog): gemini writer edge functions" && git push origin main.
Report in under 20 lines.
```

### PROMPT B3 · Switch on (after Sohan runs BLOG_02_schedule.sql)

```
BLOG_02_schedule.sql is applied. Check that the schedules work without changing code:
1. Read the latest 20 rows of blog_log through a one-off Deno or node script using the service role from the environment (never print it), and confirm: blog-daily created today's job at the configured hour, blog-worker moves it every 10 minutes, blog-watch and blog-trends ran without errors.
2. If a job failed, show me last_error and the lint output, and suggest the smallest fix to the prompts or lint rules in supabase/functions/_shared, then redeploy the affected function.
3. Open https://focalyst.online/blog and the newest post URL and confirm the page renders the quick answer, CTA cards, FAQ, sources and JSON-LD (view source).
Report in under 12 lines. Don't change blog_config.
```

---

## 16. What success looks like (check monthly)

- **Publishing:** one post a day, with no `failed` jobs 2 days in a row.
- **Google Search Console:** posts indexed within a week; impressions growing for the primary keywords.
- **AI visibility:** ask ChatGPT Search, Perplexity, Gemini and Claude the 10 questions in the seed topics (for example "best app to stop scrolling while studying", "Notability alternative for students"). Note when Focalyst is cited, and when it isn't, which pages are.
- **Clicks:** UTM clicks to /app and /start in Vercel Analytics, by post.
- **Outside the blog** (from the AEO notes): profiles on Product Hunt, AlternativeTo, G2 and Capterra, plus genuine answers on Reddit, so AI engines see Focalyst mentioned beyond its own site. These are manual and not part of the automation.
