# Focalyst web · Onboarding journey (desktop and phone browser)

**Applies to:** the Next.js web app (`focalyst-main`) at focalyst.online, hosted on Vercel. Both layouts: desktop (1024 px and wider) and phone browsers (below 1024 px).
**Depends on:**
- `DESKTOP_DESIGN.md` for tokens, glass utilities, `AmbientBackground` and the component kit (sections 2 to 5)
- `ONBOARDING_01.sql`, already written for the phone app. The same file serves the web; nothing new to run if it is already in Supabase (section 13)

**Owner:** Sohan. **Builder:** Claude Code or Antigravity, phase by phase (section 12).

This file is self-contained: every screen, every line of copy and every rule for the web is here. Screen numbers match the phone app spec (`ONBOARDING_DESIGN.md` v3) on purpose, so a change made here can be carried to the phone app one to one. Screen 21 (app blocking) doesn't exist on the web.

---

## 0. Decisions

| Topic | Decision |
|---|---|
| Order | Journey first, account at the end, then Pro, then the paywall. Closing the paywall always leaves a working plan. |
| Who starts here | Everyone who taps **Get started** on the landing page, or arrives at focalyst.online/start. |
| Data we never ask for | Gender and age. Life stage instead. |
| Free plan facts used in copy | 2 active habits, 1 countdown up to 90 days away, the 25/5 timer only, 5 Focalyst AI messages a day. Pro: more habits, notes and voice notes, 3 countdowns, custom timers, the productivity score, the detailed Catalyst weekly report, AI connections (MCP). If the code says otherwise, the code wins and the copy follows it. |
| Focus rhythm | Free users always get 25/5. If their answers point to longer sessions, the plan shows it as a Pro custom timer (section 7.1). |
| Blocking | Phone only (the Chrome extension isn't out yet). The web mentions it on screen 26 and never offers to set it up. |
| Widgets | Phone only. Previewed on screen 26 with the user's own plan. Screen 32 offers the phone app. |
| Habit groups | Up to 5 people, set up on screen 16, created right after sign-up with the existing `habitGroupService` functions. |
| AI connections (MCP) | Pro only. Screen 28 shows free users what it does. Pro users get a link to `/mcp` on screen 32. Claude and ChatGPT are named; Gemini is left to the `/mcp` page. |
| Free trial | Only if the Polar yearly product really has one. Controlled by `NEXT_PUBLIC_WEB_TRIAL_DAYS` (unset means no trial on the web). The copy never promises a trial that checkout won't give. |
| Payments | Web: the existing `startCheckout(plan)` with Polar. Inside the native shell (`isNativeApp()` true): no paywall, no prices, no purchase links. |
| Honesty | Report numbers come only from the user's answers, with the basis shown. No fake reviews, user counts, timers or struck-through prices. No invented people in previews. |
| Copy | Sentence case, no em dashes, no exclamation marks, plain words. |

---

## 1. What changes from the phone app spec

| Area | Phone app | Web |
|---|---|---|
| Layout | One column | Desktop: a split stage with a live plan panel. Phone browser: one column |
| Storage | AsyncStorage | `localStorage`, wrapped in try/catch, with an in-memory fallback |
| Haptics | Yes | None |
| Screen 20 | Reminder time plus the notification permission | Daily focus time. The browser permission step appears only if the web app already has web notifications (5, screen 20) |
| Screen 21 | App blocking setup | Not shown |
| Screen 26 | Widget preview | "Your plan goes with you": widgets and blocking on the phone app, shown only when the store links are set |
| Screen 27 | Native sign-in | The existing `/login` page in `mode=save-plan`, plus a "check your email" state for email sign-up |
| Paywall | Store purchase | `startCheckout` and Polar. The user leaves the site and comes back through the existing success page (9.4) |
| Screen 32 | Focus or Plan | Adds the phone app (a QR code on desktop, a store button on phones) and, for Pro users, `/mcp` |
| Keyboard | None | Enter, number keys and arrows on every screen (3.6) |

---

## 2. Routes and routing

### 2.1 New routes (client pages only)

| Route | Who | What |
|---|---|---|
| `/start` | Public | The whole journey, screens 1 to 32, as one client page with an internal step machine |
| `/onboarding/finish` | Signed in | Saves the plan (8.3), runs the group step (8.5), then returns to `/start` at screen 28 |
| `/get-app` | Public | Sends phones to the right store by user agent; shows both store buttons otherwise. The QR code on screen 32 points here |

- **No route handlers.** The Capacitor export hides `src/app/api` and `src/app/auth`, so these must be client pages that call Supabase from the browser.
- **Static export safe:** `'use client'` content, no `cookies()` or `headers()`, `useSearchParams` inside `<Suspense>`.
- **Metadata:** title "Get started · Focalyst". `robots: noindex` on all three.

### 2.2 Routing rules

| Situation | Route |
|---|---|
| Signed out, no draft | `/start` at screen 1 |
| Signed out, draft exists | `/start` resumes at the saved screen |
| Landing "Get started" (every one of them, including pricing) | `/start` |
| Landing "Log in" or "I already have an account" (screen 1) | `/login` as today. After sign-in: onboarded → home as today, and any draft is deleted; not onboarded → `/start` at screen 22 if a draft exists, else screen 4 |
| Signed in, `onboarding_done = false`, no draft | `/start` at screen 4. Screen 27 is skipped |
| Signed in, `onboarding_done = true`, opens `/start` | Home, as today's post-login redirect does (desktop `/today`) |
| Old `/onboarding` and `/onboarding/plans` | After phase W5 works: client redirect to `/start` (not onboarded) or home |
| `/onboarding/finish` with no draft | Onboarded → home. Not onboarded → `/start` at screen 4 |
| No habit picked on 15 | Skip 16 and 31 |
| "Just me for now" on 16 | Skip 31 |
| Pro after sign-in, or `isNativeApp()` | Skip 28, 29 and 30 |
| Store links not set, or `isNativeApp()` | Skip 26 |

### 2.3 Draft and resume

- **Draft:** `localStorage['onboarding:draft:v1'] = { step, answers, report, updatedAt }`, saved on every answer. Discarded after 30 days.
- **Cleared** only when `complete_onboarding` succeeds.
- **After the save** (screens 28 to 32), a small state survives page loads and the trip to Polar: `localStorage['onboarding:post:v1'] = { step, name, preset, habitName, group, countdownPending, checkoutPending, savedAt }`. Cleared when a screen 32 button is used, or after 7 days.
- **The URL** stays `/start`. The step lives in the draft, so a refresh resumes in place. `?step=` is never read from the URL (no skipping ahead).

---

## 3. Layout and visual system

Use the tokens, `glass`, `glass-strong`, `liquid`, `frost`, `AmbientBackground` and the component kit from `DESKTOP_DESIGN.md`. Never `bg-white` or `text-white` (use `snow`). Both themes, default to the system theme.

### 3.1 Desktop stage (1024 px and wider)

```
┌──────────────────────── AmbientBackground (whole page) ────────────────────────┐
│   ┌─────────────── stage: 1120 × min(760, 100vh − 64), radius 28 ───────────┐  │
│   │  PLAN PANEL (left, 1fr)            │  QUESTION PANEL (right, 1.1fr)      │  │
│   │  brand gradient, white text        │  surface, ink text                  │  │
│   │  FOCALYST wordmark                 │  progress (6 segments) + chapter    │  │
│   │  <PlanPreview/> fills in live      │  title, subtitle                    │  │
│   │  chapter list at the bottom        │  options / input                    │  │
│   │                                    │  Back (ghost)      Continue  [Enter]│  │
│   └────────────────────────────────────┴─────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────┘
```

- **Stage:** centred, `glass-strong liquid`, overflow hidden, the same frame as the desktop `/login` page so screen 27 feels like the same place.
- **Plan panel (left):** background `#03195B` with radial gradients of `#1951FC` (bottom left, 55%) and `#0B2CB1` (top right, 45%), plus `ambient-grain`, in both themes (like the login left panel). Padding 48.
  - Top: the FOCALYST wordmark, snow, 13 px / 600, tracking 0.32em.
  - Middle: `<PlanPreview/>` (3.4). On chapter 1 a visual takes its place (screen specs).
  - Bottom: the 6 chapter names as a vertical list, `small` 13 px. Done: snow 70% with a check. Current: snow, 600. Next: snow 40%.
- **Question panel (right):** `surface` background, padding 56 top and sides, 40 bottom, content max width 440.
  - Top: the progress bar (3.3) and the chapter label above it (`micro`, `ink-3`, "ABOUT YOU").
  - Title `h1` (32/38, `font-display`), subtitle `body` `ink-2`, 8 px below.
  - Footer row pinned to the bottom of the panel: **Back** (ghost, `ArrowLeft`) on the left, **Continue** (primary, lg 48, min width 180) on the right with a `Kbd` "Enter" inside it at 70% opacity.
- **Wide mode** (screens 22, 23, 24, 25, 26, 30): the two panels merge into one full-width panel, `surface` in light and the brand gradient in dark, padding 56. Used for reveals that need room. The footer row stays.
- **Below 1180 px:** the stage becomes 100% width with 32 px margins; the plan panel narrows to 380 px.

### 3.2 Phone browser (below 1024 px)

- `min-h-dvh`, one column, `AmbientBackground` behind, 20 px gutters. No plan panel.
- **Top bar** (56 tall, sticky, `glass`): back button (40 px circle, `ChevronLeft`) and the progress bar filling the rest. The back button is hidden on screens 1, 22, 27, 28, 31 and 32.
- **Title** `h1` 28/34 `font-display`, 20 px below the top bar.
- **Bottom button:** full-width pill, 52 tall, primary, pinned with `pb-[calc(16px+env(safe-area-inset-bottom))]` over a 32 px fade from transparent to `canvas`.
  - **Exception:** on the text-input screens (5, 17, 18) the button sits right under the field, in the normal flow, so the phone keyboard never covers it.
- **Inputs** use 16 px text or larger so iOS Safari doesn't zoom.
- **Wide-mode screens** are simply full-width cards on phones.

### 3.3 Progress bar

- 6 segments, one per chapter, 4 px tall, 6 px gaps, pill radius.
- Filled: `primary`. Empty: `surface-3`. The current segment fills in proportion to the step within its chapter, transition 220 ms `var(--ease)`.
- `role="progressbar"` with `aria-valuetext` such as "About you, step 2 of 5".

### 3.4 `<PlanPreview/>` (new, reused on 4 to 21, 25, 27 and 28)

A card that shows the plan as it is built. It is the strongest belonging and investment cue on desktop, so it must feel alive but calm.

- **Container:** radius 20, `bg-snow/10`, border `snow/15`, padding 24, max width 400. In wide mode (screen 25) it renders on `surface` with `frost` and ink colours instead.
- **Header:** `font-display` 36/40 snow: "{name}'s plan" (before the name is known: "Your plan").
- **Rows** (icon 16 in a 28 px `snow/10` tile · label `small` snow 60% · value 14/500 snow):

  | Row | Icon | Value |
  |---|---|---|
  | Role | `UserRound` | Student, Professional… |
  | Working towards | `Flag` | Competitive exam… |
  | What gets in the way | `CircleAlert` | first 2 picks, "+n" |
  | Phone time | `Smartphone` | "4.5 h a day" |
  | Focus rhythm | `Timer` | "25/5 × 4" (and a small `Pro` chip for a Pro rhythm, 7.1) |
  | Habits | `Repeat` | habit names with their emoji |
  | Habit group | `Users` | "Starting a group" / "Joining with a code" |
  | Countdown | `Hourglass` | "NEET 2027 · 128 days" (`Pro` chip if over 90 days) |
  | Tomorrow | `ListChecks` | "3 tasks" |
  | Daily goal | `Target` | "3 hours" |
  | Daily focus time | `BellRing` | "7:00 pm" |

- **Empty rows** show the label with a dashed 80 px line in `snow/20` as the value. Skipped rows show "Skipped" in snow 40%.
- **When a row fills:** the value fades up 6 px over 220 ms, and the row's tile pulses once from `snow/10` to `snow/25`. Reduce motion: fade only.
- **Never** fills a row the user didn't answer, and never shows sample data.

### 3.5 Components on the question panel

| Pattern | Spec | Screens |
|---|---|---|
| **Single choice** | `radiogroup`. Cards min height 56 (64 on phones), radius 14, `bg-surface-2`, border `line`, padding 14 × 16. Icon tile 32 (radius 10, `primary-soft`, icon `primary-text`) · title 15/600 `ink` · optional line 13 `ink-2`. Desktop: a `Kbd` with the option number on the right. Hover: `bg-surface-3`, `translateY(-1px)`. Selected: border 1.5 px `ring`, `bg-primary-soft`, the `Kbd` replaced by a 22 px `primary` circle with a snow check. Picking selects and advances after 250 ms | 6, 7, 8, 13, 14, 19 |
| **Choice with follow-up** | Single choice cards that don't advance. The chosen card expands in place (height transition 220 ms) to show its follow-up | 16 |
| **Multi choice chips** | Wrap of pills, 40 tall, `bg-surface-2` with border `line`, 14/500 `ink`. Selected: `bg-primary`, `text-snow`, a small check. Counter `small` `ink-3` ("2 selected"). Continue enabled after 1 pick | 9, 10 |
| **Multi choice cards** | Single choice look with a square check, no auto-advance. A maximum is enforced with a 6 px shake (120 ms × 2) and the line "You can pick up to 2" | 15 |
| **Text input** | One large input, 56 tall (60 on phones), radius 14, `bg-surface-2`, 18/500 text, autofocus. Enter = Continue | 5, 17, 18 |
| **Slider** | A huge live value (`metric` style scaled to 64/68, tabular nums) and its unit, and a native `<input type="range">` styled: track `surface-3`, fill `primary`, 24 px thumb with a `ring` glow. Tick labels under it. Arrow keys move 0.5 | 11 |
| **Time** | 3 suggestion chips, then a native `<input type="time">` in an input-style field | 20 |
| **Date** | A native `<input type="date">` in an input-style field, `min` today, `max` 10 years ahead | 17 |
| **Statement** | Centred on phones, left aligned on desktop. `display` 44/48 serif title, one `body` line, optional visual | 1 to 4, 12 |
| **Report** | Wide mode. Overline `micro` `ink-3`, hero number (3.7), supporting line, stat tiles, chart card, a footnote "Estimate from your answers…" | 23, 24 |
| **Loader** | A checklist of 4 lines that tick in sequence, with a `ProgressRing` | 22 |

### 3.6 Keyboard (desktop and any device with a keyboard)

- **Enter:** Continue when the screen is valid (also inside text inputs).
- **1 to 9:** pick option N. Single choice selects and advances; chips and multi cards toggle.
- **Arrow keys:** move between options (roving tabindex within the group). **Space** toggles the focused option.
- **Alt + Left arrow:** Back.
- **Esc:** closes an open sheet or expanded follow-up. It never leaves the flow.
- The app's global shortcuts (N, G then a letter, ⌘K, ⌘J) are not mounted here because `/start` sits outside the `(app)` shell. Don't add them.
- **On each step change,** move focus to the new title (`tabIndex={-1}`), so screen readers announce it.

### 3.7 Numbers, the one gradient exception and motion

- **Gradient text exception** (registered as a deliberate choice, see the register): only for the hero numbers on 23 and 24 and the invite code on 31, only at 40 px or larger.
  - Dark: `#3781FC` → `#CBE9FD`. Light: `#1951FC` → `#0B2CB1`.
  - CSS: `background: linear-gradient(...); -webkit-background-clip: text; background-clip: text; color: transparent;`, with `color: var(--primary-text)` as the fallback under `@supports not (background-clip: text)`.
- **Count-up:** hero numbers count up once over 900 ms (`requestAnimationFrame`, ease out), supporting numbers over 450 ms. A `countedUp` flag in the draft stops them replaying on back and forward. The element carries the final value in `aria-label` from the start.
- **Step transitions:** the question panel content cross-fades with a 12 px horizontal slide (forward from the right, back from the left), 220 ms `var(--ease)`. The plan panel never animates on step change, only its rows.
- **Loader:** 4 steps × 700 ms. Real work happens during it (section 7). Hard cap 3.5 s.
- **Charts:** recharts, loaded with `next/dynamic` (`ssr: false`, a `Skeleton` while loading), draw once over 450 ms.
- **Reduce motion** (`prefers-reduced-motion`): no slides, count-ups, chart draws or collage drift; everything fades in over 120 ms.
- **Only CSS and React state** for motion. Use `framer-motion` only if it is already installed.

---

## 4. Screens

Notes:
- `{name}`, `{apps}` and so on are variables. "Saves" gives the draft field (`answers.*`).
- `{study}` is "study" for students and "work" for everyone else.
- **Desktop** notes say what the plan panel shows; without a note, it shows `<PlanPreview/>`.

### Chapter 1 · Welcome

**1. Welcome**
- **Desktop:** the plan panel shows a slowly drifting 2-column collage of 8 real Focalyst screens as glass-framed images (Today, Plan, Focus timer, Insights chart, the habit group leaderboard, the phone widgets, AI chat, the `/mcp` page). Columns move up at 12 px/s in a loop, offset from each other; paused when the tab is hidden; static with reduce motion.
  - Assets: `public/onboarding/collage-{1..8}-{light|dark}.webp`, exported by Sohan. Until then, frost placeholder tiles with a lucide icon each.
- **Phone:** the collage fills the top 55% of the screen (3 columns), fading into `canvas`.
- **Content:**
  - Wordmark FOCALYST (phone only; on desktop it's in the plan panel)
  - Title `display` serif: **Own your time.**
  - Line `body` `ink-2`: Productivity and mindful living.
  - Primary **Get started**. Text link **I already have an account** (to `/login`).
  - Footer `caption` 12 `ink-3`: Terms · Privacy (`/terms`, `/privacy`).
- **No back button.**

**2. One calm place**
- **Title:** One calm place for your day.
- **Subtitle:** Tasks, habits, focus and notes, together and in sync with your phone.
- **Visual:** `public/landing/app-preview.png` in a glass frame (radius 20) with 3 small glass chips floating around it over 6 s: "Focus 25 min", "Read · 6 day streak", "Exam in 128 days". Example values, not claims. Desktop: in the plan panel. Phone: above the title.
- **Button:** Continue.

**3. Focalyst helps you**
- **Title:** Focalyst helps you…
- **Benefit cards** (4 stacked `frost` cards, 72 tall, icon tile + 15/600 title + 13 `ink-2` line, entrance stagger 60 ms):
  1. `Timer` · **Focus deeply** · Timed sessions that keep you on one thing.
  2. `Users` · **Build habits with friends** · Streaks, reminders and groups of up to 5.
  3. `LayoutGrid` · **Right on your home screen** · Widgets on the phone app let you tick things off in a tap.
  4. `Sparkles` · **Understand your week** · Clear insights, an AI coach, and with Pro, Claude and ChatGPT connected to your plan.
- **Desktop plan panel:** the same app preview as screen 2, dimmed to 60%.
- **Button:** Continue.

### Chapter 2 · About you

**4. Intro**
- **Title:** Let's build your plan.
- **Line:** A few quick questions. About 2 minutes.
- **Desktop extra line** (`small` `ink-3`): Your plan fills in on the left as you answer.
- **Desktop plan panel:** `<PlanPreview/>` appears for the first time, empty, with the header "Your plan" (fade in 420 ms).
- **Button:** Let's go.

**5. Name**
- **Title:** What should we call you?
- **Input:** placeholder "Your first name", max 40 characters, `autoComplete="given-name"`, `autoCapitalize="words"`.
- **Valid:** at least 1 non-space character.
- **Saves:** `answers.name`. The plan header becomes "{name}'s plan".
- **Next screen** shows a 600 ms line at the top of the question panel: "Nice to meet you, {name}."

**6. Role**
- **Title:** What best describes you?
- **Options:**
  - `GraduationCap` · Student · School, college or exam prep
  - `Briefcase` · Professional · A job with goals and deadlines
  - `PenTool` · Freelancer · Your own clients and schedule
  - `Camera` · Creator · Content, art or a channel
  - `Rocket` · Entrepreneur · Building something of your own
- **Saves:** `answers.profile_type` (`student|professional|freelancer|creator|entrepreneur`), matching `users.profile_type`.

**7. Working towards (students only)**
- **Title:** What are you working towards?
- **Options:** School exams (`school_exams`) · College semesters (`college`) · A competitive exam, like NEET, JEE or UPSC (`competitive_exam`) · A medical or professional degree (`degree`) · Something else (`other`).
- **Saves:** `answers.life_stage`. Ghost: Skip.

**8. Where you heard**
- **Title:** Where did you hear about Focalyst?
- **Options:** Instagram · YouTube · A friend · App Store or Play Store · Google · Somewhere else.
- **Saves:** `answers.acquisition_source` (`instagram|youtube|friend|app_store|google|other`). Ghost: Skip.

### Chapter 3 · Your focus right now

**9. What gets in the way**
- **Title:** What gets in the way most?
- **Subtitle:** Pick all that apply.
- **Chips:** Phone scrolling · Social media · Procrastination · Too many tasks · Low energy · Overthinking · Noise around me · Not knowing where to start.
- **Saves:** `answers.distractions`.

**10. Apps**
- **Title:** Which apps pull you away?
- **Subtitle:** We'll use this for your report.
- **Chips** (names only, no logos): Instagram · YouTube · WhatsApp · Snapchat · Reels and Shorts · Games · Netflix · X · Reddit · Facebook · Other.
- **Saves:** `answers.distracting_apps`. Ghost: None of these.

**11. Phone time**
- **Title:** About how long are you on your phone each day?
- **Slider:** 1 to 10 in steps of 0.5; the top value reads "10+". The live value reads "4.5 hours".
  - Starts at 4, unpicked: the value is `ink-3` until the first move, then `ink`. Continue is enabled after the first move (or the first arrow key press).
- **Hint** (`small` `ink-3`): Not sure? Your phone's Screen Time or Digital Wellbeing settings show it.
- **Saves:** `answers.daily_phone_hours`.

**12. Got it**
- **Title:** Got it, {name}.
- **Line** built from 9 and 10: "{top 2 distractions joined with and}{, mostly on {top 2 apps}}. We'll plan around {both|it|them}."
  - Example: "Phone scrolling and procrastination, mostly on Instagram and YouTube. We'll plan around both."
- **Visual:** the chosen chips gather into one `frost` card under the line (fade and move 8 px, stagger 40 ms).
- **Button:** Continue.

**13. Drift time**
- **Title:** How long can you focus before your mind drifts?
- **Options:** About 10 minutes · About 25 minutes · About 45 minutes · An hour or more.
- **Saves:** `answers.focus_drift_minutes` (10, 25, 45, 60). The plan panel's focus rhythm row fills (7.1).

**14. Best time**
- **Title:** When do you {study|work} best?
- **Options:** Early morning · Before 8 am / Morning · 8 am to noon / Afternoon · Noon to 5 pm / Evening · 5 pm to 9 pm / Late night · After 9 pm.
- **Saves:** `answers.best_focus_time` (`early_morning|morning|afternoon|evening|late_night`).

### Chapter 4 · Your setup

**15. Habits**
- **Title:** Pick up to 2 habits to start.
- **Subtitle:** Small and daily works best. You can add more later.
- **Options** (the emoji is the habit icon, allowed because it's the user's pick):
  📚 Read 20 minutes · 📝 Revise notes · 💪 Workout · 🧘 Meditate · 💧 Drink water · 🌙 Sleep by 11 · 📵 No phone for the first hour · ✍️ Journal · ➕ Something else (opens an inline input).
- **Order:** for students, "Revise notes" moves to the top.
- **Saves:** `answers.habits` as `[{ name, icon }]`, max 2. Ghost: Skip.

**16. Habit group (only if at least 1 habit was picked)**
- **Title:** Stay consistent together.
- **Subtitle:** Track a habit with up to 4 friends and see each other's streaks.
- **Visual** (under the subtitle): a mini leaderboard card in the style of the real Accountability section:
  - row 1: initial avatar, "{name} (you)", the habit emoji, "Day 1"
  - rows 2 to 5: dashed outline rows with `UserPlus` and "Invite a friend" in `ink-3`
- **Options:**
  1. `UserPlus` · **Start a group** · You'll get a code to share.
  2. `KeyRound` · **Join a friend's group** · Use their invite code.
  3. `User` · **Just me for now** · You can join a group later from Plan › Habits. (Advances on pick.)
- **Follow-up for 1 and 2:**
  - **Which habit?** Only when 2 habits were picked: a `SegmentedControl` with the 2 names; the first is preselected.
  - **Code field** (Join only): placeholder "Invite code", `autoCapitalize="characters"`, `autoCorrect="off"`, `spellCheck={false}`, trimmed. Accept the characters and length the current join form accepts.
  - **Line** `small` `ink-2`: We'll set this up as soon as your plan is saved.
- **Privacy line** (12 `ink-3`, under the options): Group members see your name and this habit's streak and total days. Nothing else.
  - Ship this line only after the group privacy check in 13.2 is done. If the leaderboard shows more than this, change the line to match.
- **Valid:** an option is picked (and, for Join, the code field isn't empty).
- **Saves:** `answers.group = { mode: 'create' | 'join' | 'none', habit_index: 0 | 1, code? }`. Nothing is created yet.

**17. Countdown**
- **Title:** Anything you're counting down to?
- **Subtitle:** An exam, a launch, a trip.
- **Name field** pre-filled from life stage: competitive exam → "My exam" (cursor at the end), school → "Board exams", college → "Semester exams", degree → "Final exams", otherwise empty.
- **Date field** (3.5 Date).
- **Over 90 days:** an info chip under the date (`primary-soft` background, `primary-text`, `Info` icon): Free countdowns can be up to 90 days away. This one will be saved and switched on with Pro.
- **Saves:** `answers.countdown = { name, date, icon: "⏳" }`. Ghost: Skip.

**18. Tomorrow**
- **Title:** What's one thing you'll get done tomorrow?
- **Subtitle:** Add up to 3. We'll put them on your plan.
- **Inputs:** up to 3, stacked. The 2nd and 3rd appear after the previous one has text. Enter in a filled field moves to the next; Enter in an empty field continues. Placeholder: "Revise chapter 4" (students) or "Finish the proposal" (others).
- **Saves:** `answers.tasks`. Ghost: Skip.

**19. Daily goal**
- **Title:** How many hours a day do you want to focus?
- **Options:** 1 hour · 2 hours · 3 hours · 4 hours · 6 hours or more (stored as 360).
- **Line under the options:** That's {G×7} hours a week.
- **Saves:** `answers.daily_focus_goal_minutes`.

**20. Daily focus time**
- **Check first:** search `src/` for `serviceWorker`, `PushManager` and `Notification.requestPermission`. Report what exists.
- **Step A (always):**
  - **Title:** When do you want to start focusing each day?
  - **Subtitle:** We'll build your day around it.
  - **Chips:** 3 suggestions from screen 14 (7.2), then the time field set to the first one.
  - **Saves:** `answers.reminder_time` (`HH:MM`).
- **Step B (only if the web app already sends browser notifications):** a primer under step A, never the browser prompt on its own:
  - `BellRing` tile · **Get a nudge at {time}?** · lines "A reminder to start focusing", "Change it any time".
  - Primary **Turn on** runs the existing permission and subscription code. Ghost **Not now**.
  - **Saves:** `answers.notifications_allowed`.
- **If there's no web notification code:** no step B, and `notifications_allowed = false`. Don't build push for onboarding.
- **Plan row** label: "Daily focus time".

**21. Blocking:** not on the web. `answers.blocking_set_up = false`.

### Chapter 5 · Your report

**22. Building your plan (loader)**
- **Wide mode.** **Title:** Building your plan, {name}…
- **Checklist** (each line ticks after ~700 ms; the check stroke draws over 220 ms):
  1. Reading your answers
  2. Setting your focus rhythm
  3. Preparing your habits and goals
  4. Planning your first week
- **Real work:** compute the report and the plan (sections 6 and 7) and store them in the draft.
- **Exit:** automatic when the animation and the work are both done. Hard cap 3.5 s. No back button.

**23. Where your time goes**
- **Wide mode.** Desktop: 2 columns (hero left, details right). Phone: stacked.
- **Overline:** WHERE YOUR TIME GOES
- **Hero:** gradient number, 96/96 desktop, 64/68 phone, tabular nums, count-up: **{yearlyPhoneHours}** with "hours on your phone this year" (`h2` `ink-2`) under it.
- **Line** (`font-display` 28/34): That's about {wakingDays} waking days.
- **Stat tiles** (2 `frost` cards): "{H} h · a day" and "{weeklyHours} h · a week", `metric` style.
- **Chips:** "Mostly on" plus the chosen app chips, if any.
- **Footnote** (12 `ink-3`): Estimate from your answers: {H} hours a day, 365 days, 16 waking hours a day.
- **Button:** Continue.

**24. What's possible**
- **Wide mode.** Desktop: statement left, chart right. Phone: stacked.
- **Overline:** WHAT'S POSSIBLE
- **Title:** Here's what your plan can give you.
- **Hope statement** (`font-display` 28/36; the 2 numbers in gradient): "Turn just {reclaimLabel} of scrolling into focus each day and that's **{reclaimHoursYear} hours** a year. About **{reclaimWeeks} weeks** of full-time {study}."
- **Chart card** (`frost`, radius 20, padding 24): title `h3` "Your plan for the next 12 weeks".
  - recharts `AreaChart` of the 12 weekly values (6.2): area fill a vertical gradient from `primary` at 35% to 0%, line 2 px `primary`, no grid lines except a faint baseline (`line`), x labels "Wk 1", "Wk 4", "Wk 7", "Wk 10", y axis hidden.
  - The week 6 point gets a dot and a label "{G×7} h a week".
  - Tooltip (`glass-strong`, radius 10): "Week {k} · {hours} h".
- **Total line:** Up to {total12} focused hours in 12 weeks, if you follow your plan.
- **Footnote:** Based on your goal of {G} hours a day, building up over 6 weeks.
- **Button:** Continue.

**25. Your plan (the payoff)**
- **Wide mode.** `<PlanPreview/>` in its large `frost` form, centred, max width 520, with the title **Your Focalyst plan.** above it.
- **Shows only filled rows.** Focus rhythm has a note under it (7.1).
- **Entrance:** rows fade up in sequence, 40 ms apart.
- **Button:** Primary **Continue** (or **Save my plan** when screen 26 is skipped).

**26. Your plan goes with you (only if a store link is set and not in the native app)**
- **Wide mode.** Desktop: text left, visual right. Phone: visual first.
- **Title:** Your plan goes with you.
- **Subtitle:** On the Focalyst phone app, interactive widgets let you tick off tasks, log a habit and start focusing from your home screen. Blocking pauses distracting apps while you focus.
- **Visual:** a phone frame (radius 44, 1 px `line-strong` outline, the app's dark home screen wallpaper made of the `AmbientBackground` glows) holding widget mock-ups built as plain React components that copy the real widgets' look, filled only from the answers:
  1. Focus timer (small): "25:00" and a **Start** pill
  2. Habit streak (small): the first habit's emoji and name, "Start your streak" and a round check button
  3. To-do list (medium): "Tomorrow" with up to 3 of their tasks and check circles
  4. Countdown (small): the countdown name and "{days} days" (`Pro` chip if pending)
  - **Fallback:** if fewer than 3 have data, add the date widget with today's date. Never invent content.
  - **Try it:** tapping a check fills it with `primary`; Start pulses once and reads "Started". A `Preview` chip sits at the top of the frame. Nothing is saved.
- **Blocking card** beside the frame (desktop) or under it (phone), `frost`: `ShieldCheck` tile, "{first app} is paused", 13 `ink-2` "Back to your focus session". Under it: "Gentle blocking is free. Strong modes are Pro."
- **Caption:** Log in on the app with the same account and your plan is already there.
- **Button:** Primary **Save my plan**. (Store links come on screen 32, after the plan is safe.)

### Chapter 6 · Save and Pro

**27. Save your plan (account)**
- The **existing `/login` page** with `?mode=save-plan`. In that mode only presentation changes:
  - **Desktop left panel:** `<PlanPreview/>` with the draft's plan instead of the 3 step cards.
  - **Title:** Save your plan. **Sub:** Synced across this browser and the phone app.
  - **Default tab:** sign up. The full name field is pre-filled with `answers.name` and stays editable.
  - **"Already have an account? Log in"** switches to login mode, still in save-plan mode.
- **Sign-in methods and functions are unchanged** (Google, Apple, email).
- **Return path:** in save-plan mode, Google and Apple use `next=/onboarding/finish`; email sign-up uses `emailRedirectTo: ${origin}/auth/callback?next=/onboarding/finish`; email sign-in and an instant email sign-up session go straight to `/onboarding/finish`.
- **27b. Check your email** (email sign-up when Supabase asks for confirmation; shown inside the login page in save-plan mode):
  - **Title:** Check your email.
  - **Line:** We sent a link to {email}. Open it in this browser to save your plan.
  - **Buttons:** Secondary **Resend link** (only if the page already has resend logic). Ghost **Use a different email**.
  - The draft stays in this browser. If the link is opened on another device, the routing rules send that user to screen 4 there.

**28. Your AI, with your plan (free users, not in the native app)**
- **Layout:** desktop split (plan panel on the left), phone one column. No back button.
- **Overline:** WITH PRO
- **Title:** Ask Claude or ChatGPT about your plan.
- **Chat preview** (`frost` card, padding 20):
  - User bubble (right, `bg-primary`, `text-snow`, radius 18 with a 6 px corner at the bottom right): What should I do first tomorrow?
  - Reply bubble (left, `bg-surface-2`, `ink`, radius 18 with a 6 px corner at the bottom left). Above it: "Claude" 12/600 `ink-2` and a chip "Focalyst connected" (`primary-soft`, `primary-text`, `Plug` icon 12).
  - Reply text from the answers only, dropping any part they skipped: "You have {task 1}{ and {n} more} for tomorrow. Start with {task 1} in a {minutes}-minute session, then tick off {habit}. {countdown name} is {days} days away."
  - If tasks, habits and the countdown were all skipped: "Your goal is {G} hours of focus a day. Start with one {minutes}-minute session at {time}."
  - The reply types in word by word over 1.2 s, once (shown at once with reduce motion).
  - Footnote 12 `ink-3`: An example built from your plan.
  - Logos: only the Claude and ChatGPT logo files the `/mcp` page already uses; otherwise names in text.
- **Benefit lines** (`Check` icon `primary-text`): Ask about your tasks, habits, focus time and notes · Add a task or log a habit by chat, only when you say so · Each AI app sees only your account. Disconnect any time.
- **Credits line** (12 `ink-3`): Pro includes 500 AI connection credits a month, plus 10 for each day you open Focalyst. Credits refill on your billing date.
- **Button:** Primary **Continue**.

**29. Pro (free users, not in the native app)**
- **Two versions,** chosen by `NEXT_PUBLIC_WEB_TRIAL_DAYS`:
  - **Trial set (for example 7):** title **Try Pro free for {n} days.**
  - **Not set:** title **Get more from your plan with Pro.**
- **Personalised benefits** (max 4, in this order, only when they apply; `frost` rows with icon tiles):
  1. `Timer` · "{minutes}-minute deep sessions, matched to how you focus" (only when the rhythm is a Pro one, 7.1)
  2. `Hourglass` · "Your {countdown name} countdown, {days} days away" (if pending)
  3. `Plug` · "Claude and ChatGPT, connected to your plan"
  4. `Repeat` · "More habits, notes and countdowns"
  5. `Sparkles` · "More Focalyst AI messages every day"
  6. `ChartColumn` · "The detailed Catalyst weekly report"
- **Timeline** (trial version only; 3 steps with dots and a line):
  - **Today** · Full Pro access, free
  - **Before day {n}** · Cancel any time from Settings › Pro
  - **Day {n}** · Your yearly plan starts, unless you cancel
- **Buttons:** Primary **Continue** (trial) or **See plans** (no trial). Ghost **Maybe later** (to 31, or 32 when there's no group).

**30. Paywall:** section 9.

**31. Your group (only if Start or Join was picked)**
The group step already ran during `/onboarding/finish` (8.5). This screen shows the result. No back button.
- **Group started:**
  - **Title:** Your group is ready.
  - **Line:** Share this code with up to 4 friends. They join with it in Focalyst.
  - **Code:** gradient, 56/60, letter spacing 0.12em, `font-ui` 600, tabular. Under it: **Copy code** (secondary, `Copy`; toast "Code copied") and **Share** (`Share2`).
    - Share uses `navigator.share` when it exists (phones); otherwise it copies the invite message and toasts "Invite copied".
    - Invite message: reuse the text from `HabitGroupLeaderboardSection` if it has one; otherwise "Join my habit group on Focalyst. We're tracking {habit}. Code: {code}. focalyst.online"
  - **Mini leaderboard:** the user's row and 4 "Invite a friend" rows, as on 16.
  - **Buttons:** Primary **Share invite**. Ghost **Done**.
- **Joined:**
  - **Title:** You're in.
  - **Line:** You and {n − 1} {friend|friends} are tracking together.
  - **Mini leaderboard:** the real standings from the existing leaderboard function (rank, name, streak).
  - **Button:** Primary **Continue**.
- **Join failed** (title **That code didn't work.**), with one line matched to the error the existing function returns:
  - not found: Check the code with your friend and try again.
  - full: This group already has 5 people.
  - already in a group: You're already in a group. You can manage it from Plan › Habits.
  - anything else: Something went wrong. You can try again from Plan › Habits.
  - A code field with **Try again** (a real call now). Ghost **Skip for now**.
- **Offline or timed out:** title **Almost there.** Line: We'll finish setting up your group next time you open Focalyst. Button **Continue**.

**32. You're all set**
- **Title:** You're all set, {name}.
- **Line:** Your plan is ready. The best time to start is now.
- **Next steps card** (`frost`, rows with icon tile · label · line · `ChevronRight`):
  - **Get the phone app** (only when a store link is set, not in the native app):
    - Desktop: the row opens inline into a QR code (160 px, `qrcode.react`, `fgColor` ink, on `surface`) pointing to `https://focalyst.online/get-app`, with the line "Scan with your phone. Log in with the same account."
    - Phone browser: one store button for the visitor's platform (iOS → App Store, Android → Google Play, otherwise both).
  - **Connect Claude or ChatGPT** (Pro users, including anyone who just bought Pro): opens `/mcp`.
- **Buttons:**
  - Primary **Start my first focus session**: opens `/focus` with the recommended preset (7.1).
  - Secondary **Go to my plan**: the normal home (desktop `/today`; phones keep their current home).
- **Then:** clear `onboarding:post:v1`. `onboarding_done` is already true.

---

## 5. Copy and data notes per screen

- **Name:** `complete_onboarding` sets `users.full_name` from `name`. If the account already has a full name (typed at sign-up or from Google or Apple), **leave `name` out of the payload** so it isn't shortened to the first name. Greetings always use the first word of the full name.
- **Time zone:** `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- **Number format:** `Intl.NumberFormat(navigator.language)`, so Indian visitors see "1,00,000" style when the locale asks for it.
- **12 or 24-hour times:** follow `Intl.DateTimeFormat` with `hour: 'numeric'`.

---

## 6. Report maths

One pure module, `src/lib/onboarding/report.ts`, exporting `computeOnboardingReport(answers)`. The same formulas as the phone app.

### 6.1 Inputs

| Symbol | Source | Default |
|---|---|---|
| `H` | daily phone hours (11; "10+" counts as 10) | required |
| `G` | daily goal in hours (19; "6 or more" counts as 6) | 2 |
| `D` | drift minutes (13) | 25 |

### 6.2 Formulas

```ts
const yearlyPhoneHours = Math.round(H * 365);               // 4.5 → 1,643
const wakingDays       = Math.round(yearlyPhoneHours / 16); // → 103
const weeklyHours      = Math.round(H * 7 * 10) / 10;       // → 31.5

const reclaimMinutes   = H >= 2 ? 60 : 30;
const reclaimLabel     = reclaimMinutes === 60 ? '1 hour' : '30 minutes';
const reclaimHoursYear = Math.round((reclaimMinutes / 60) * 365); // → 365
const reclaimWeeks     = Math.floor(reclaimHoursYear / 40);       // → 9

const ramp    = (k: number) => Math.min(1, 0.4 + 0.12 * (k - 1)); // k = 1..12
const weekly  = Array.from({ length: 12 }, (_, i) => Math.round(G * 7 * ramp(i + 1) * 10) / 10);
const total12 = Math.round(weekly.reduce((a, b) => a + b, 0));    // G = 3 → about 214
```

### 6.3 Guardrails

- Never round up to make it scarier. Always show the basis.
- Future numbers use "if", "can" and "up to". Never "will" or "guaranteed", no medical claims, no quoted studies.
- **If H is 1:** hero line "365 hours a year on your phone. A healthy base to build on." and the 30-minute hope.
- **Snapshot** saved in the payload as `report`: `{ H, G, yearlyPhoneHours, wakingDays, weeklyHours, reclaimMinutes, reclaimHoursYear, reclaimWeeks, weekly, total12, preset, version: 1 }`.

---

## 7. Plan builder

### 7.1 Focus rhythm (free plan has 25/5 only)

| Drift | Ideal rhythm | Free user's plan | Pro user's plan | Note under the rhythm on 25 |
|---|---|---|---|---|
| 10 | 25/5 × 4 | 25/5 × 4 | 25/5 × 4 | Start with 25 minutes. It gets easier fast. |
| 25 | 25/5 × 4 | 25/5 × 4 | 25/5 × 4 | The classic rhythm. |
| 45 | 45/10 × 3 | 25/5 × 4, plus "45/10 with Pro" | 45/10 × 3 | Free: Start with 25 minutes. Your ideal 45-minute sessions come with Pro. Pro: Longer, deeper sessions. |
| 60 | 60/15 × 2 | 25/5 × 4, plus "60/15 with Pro" | 60/15 × 2 | Free: Start with 25 minutes. Your ideal hour-long sessions come with Pro. Pro: Deep work blocks. |

- `{minutes}` in screens 28 and 29 is the ideal session length (25, 45 or 60).
- Save the plan's rhythm in `localStorage['onboarding:recommendedPreset']`. The Focus page selects it **once**, only if the user has never chosen one and only if their plan allows it. If the Focus page has no preset or duration choice, skip this.
- **Pro check:** before sign-in everyone is treated as free. After sign-in, use the app's existing `isPro` helper.

### 7.2 Focus time suggestions (screen 20)

| Best time | Chips |
|---|---|
| Early morning | 6:00, 6:30, 7:00 |
| Morning | 8:30, 9:00, 10:00 |
| Afternoon | 13:30, 14:00, 15:00 |
| Evening | 18:30, 19:00, 20:00 |
| Late night | 21:30, 22:00, 22:30 |

---

## 8. Saving the plan

### 8.1 Files

- `src/lib/onboarding/draft.ts` (read, write and expire the draft and post state, with try/catch)
- `src/lib/onboarding/report.ts` (6) and `plan.ts` (7)
- `src/lib/onboarding/payload.ts` (builds the payload)
- `src/components/onboarding/*` (stage, panels, `PlanPreview`, patterns, widget mock-ups, chat preview)
- `src/app/start/page.tsx`, `src/app/onboarding/finish/page.tsx`, `src/app/get-app/page.tsx`

### 8.2 Payload

```json
{ "name": "Riya", "profile_type": "student", "timezone": "Asia/Kolkata", "platform": "web",
  "acquisition_source": "instagram", "life_stage": "competitive_exam",
  "distractions": ["Phone scrolling"], "distracting_apps": ["Instagram", "YouTube"],
  "daily_phone_hours": 4.5, "focus_drift_minutes": 45, "best_focus_time": "evening",
  "daily_focus_goal_minutes": 180, "reminder_time": "19:00",
  "notifications_allowed": false, "blocking_set_up": false,
  "habits": [{ "name": "Read 20 minutes", "icon": "📚" }],
  "tasks": ["Revise chapter 4"],
  "countdown": { "name": "NEET 2027", "date": "2027-05-02", "icon": "⏳" },
  "group": { "mode": "create", "habit_index": 0 },
  "report": { "...": "snapshot" }, "answers": { "...": "full draft answers" } }
```

### 8.3 `/onboarding/finish`

1. **Show** the loader style, title "Saving your plan…".
2. **Check the account:** read `users.onboarding_done` and `full_name` with the existing client.
   - `onboarding_done = true` (an existing account logged in at 27): delete the draft, toast "Welcome back. Your existing plan is kept.", go home. Don't call the function.
3. **Call** `supabase.rpc('complete_onboarding', { p: payload })`.
   - **On error:** retry 3 times (after 1 s, 3 s and 6 s). Still failing: keep the draft, set `localStorage['onboarding:pendingFinish'] = '1'`, continue to `/start` at 28 anyway, and retry once on the next visit to any app page. The function never creates duplicates.
4. **On success:**
   - delete the draft; write `onboarding:post:v1`
   - refresh the user context the way the app already does after profile changes
   - run the group step (8.5) with the returned `habit_ids`, for at most 4 s
   - go to `/start` at 28, or 31 or 32 for Pro users and in the native app

### 8.4 What the function does (already built, `ONBOARDING_01.sql`)

- Saves the name, profile type and time zone; sets `onboarding_done = true`.
- Creates up to 2 habits (free users never go over 2 active), up to 3 tasks due tomorrow in their time zone, and the countdown when allowed (Pro, or within 90 days with no other active countdown); otherwise it saves the countdown as pending.
- Saves the answers and the report in `onboarding_profiles`.
- Returns `{ habit_ids, habits_created, tasks_created, countdown_created, countdown_pending }`. A repeat call creates nothing and returns the same `habit_ids`.
- Refuses AI-app tokens. Doesn't touch groups.

### 8.5 Group step

Runs inside `/onboarding/finish` only when `answers.group.mode` is `create` or `join`.

1. `habitId = habit_ids[habit_index] ?? habit_ids[0]`. No id: skip quietly (and skip 31).
2. Call the existing leaderboard function first. Already in a group: don't create or join; show that group on 31.
3. **Start:** the existing `habitGroupService` function that wraps `form_or_update_habit_group(p_habit_id)`, then read the code the way the Accountability section does.
4. **Join:** the existing function that wraps `join_habit_group_by_code(p_invite_code, p_habit_id)`.
5. Keep the result (`created`, `joined`, `failed` with the error, `offline`) in `onboarding:post:v1` for 31.
6. **Offline or timed out:** save `{ mode, habitId, code }` in `localStorage['onboarding:pendingGroup']` and retry once per later app visit (step 2 first, so it never doubles). Clear it on success or a definite failure, then toast "Your group is ready" or "That invite code didn't work. Try again from Plan › Habits."

Use `habitGroupService` exactly as it is. No new group SQL.

### 8.6 Pending countdown

- After a Pro purchase (9.4) and once on each later app visit, call `supabase.rpc('claim_pending_countdown')`.
  - `created: true`: toast "{name} countdown added".
  - `reason: 'needs_pro'`: a small `frost` card where countdowns live on the web: "{name} is {days} days away. Countdowns beyond 90 days are part of Pro." with **See Pro** (the existing paywall) and **Remove** (hides it on this device).
- Mount this, the pending finish retry and the pending group retry as one small hook, `useOnboardingFollowUps()`, called once in `(app)/layout.tsx`.

---

## 9. Paywall (screen 30)

### 9.1 Layout

- **Wide mode.** Close button (`X`, IconButton) at the top left from the start.
- **Title** `h1` serif: Unlock your full plan. **Line** `ink-2`: Everything you set up, with nothing held back.
- **Plan cards:** desktop 3 in a row (Monthly · Yearly · Lifetime, yearly in the middle); phones stacked (Yearly, Monthly, Lifetime). `frost`, radius 20, padding 24.
  - **Yearly** (selected by default): chips "Best value" and, when a trial is set, "{n} days free". Price "{yearly} a year", line "{yearly ÷ 12} a month". "Save {x}%" chip only when `1 − yearly ÷ (monthly × 12)` is at least 10%, computed from `PRICES` (today: 33% in USD, 16% in INR).
  - **Monthly:** "{monthly} a month".
  - **Lifetime:** "{lifetime} once", line "One payment. Yours for good."
  - **Selected:** 2 px `ring` border, `bg-primary-soft`. Cards are a `radiogroup`; keys 1 to 3 pick.
- **Prices:** `useCurrency()` and `PRICES`. While the currency is `null`, show `Skeleton` bars, never a wrong currency. Show "₹999", never "INR 999".
- **Primary button:**
  - Yearly with a trial: **Start my free week** (or **Start my free {n} days** when n isn't 7)
  - Yearly without a trial, and Monthly: **Continue**
  - Lifetime: **Get lifetime**
  - While waiting: "Opening checkout", disabled.
- **Under the button** (12 `ink-2`):
  - "Final price and any taxes are shown at checkout."
  - Trial: "{n} days free, then {yearly} a year. Renews automatically. Cancel any time from Settings › Pro before the trial ends."
  - Monthly or yearly without trial: "Renews automatically. Cancel any time from Settings › Pro."
  - Lifetime: "One-time payment. No subscription."
- **Footer links:** Terms · Privacy.

### 9.2 Rules

- **Checkout:** `startCheckout(plan)` with `'monthly' | 'yearly' | 'lifetime'`, unchanged. On an error result, re-enable and show the message in the existing Toast. On `already_pro`, treat the user as Pro and go to 31 or 32.
- **Never shown** when `isNativeApp()` is true.
- **Closing or "Maybe later"** goes to 31 or 32 on the free plan. No second paywall, no timers, no guilt screen.

### 9.3 Before leaving for Polar

Set `onboarding:post:v1.step = 30` and `checkoutPending = plan`, then call `startCheckout`.

### 9.4 Coming back from Polar

- **The existing success page** keeps its polling and copy. One allowed change: when `onboarding:post:v1` exists, its done-state button reads **Continue setting up** and goes to `/start`, after setting `step` to 31 (or 32) and calling `claim_pending_countdown()` once.
- **Cancelled checkout** (the user presses back): `/start` opens at 30 with the paywall as normal.

---

## 10. Accessibility and performance

- **Semantics:** options are `radiogroup` / `group` with `aria-checked`; chips are `aria-pressed` buttons; every option has a readable label ("Instagram, selected").
- **Focus:** visible focus ring everywhere (the kit's ring). Focus moves to each new title.
- **Contrast:** body text `ink` or `ink-2` only; `ink-3` only for hints and footnotes. On the brand panel, text is snow at 60% or more.
- **Zoom:** layouts survive 200% browser zoom; option cards grow instead of truncating.
- **Speed:**
  - `/start` loads without recharts, `qrcode.react` or the widget mock-ups (all `next/dynamic`).
  - Collage images are `next/image` with `sizes`, and only screen 1 loads them (`priority` on the first 2).
  - No new font loads (Inter and Instrument Serif are already there).
  - Pause the `AmbientBackground` blobs when `document.hidden`.

---

## 11. Protected code and allowed changes

**Protected:** don't change Supabase client setup, auth calls, the callback, middleware, billing (`checkout.ts`, `polar.ts`, the webhook, the region route), the MCP server and consent pages, `habitGroupService`, `PlanContext`, insights utils, levels, date utils, CSP, or any `src/app/api` route, **except** for these exact changes:

| Existing code | Allowed change |
|---|---|
| `src/middleware.ts` | Make `/start` and `/get-app` public. Send signed-in, not-onboarded users to `/start` instead of the old onboarding route, and let them reach `/onboarding/finish`. Send onboarded users who open `/start` home |
| `src/app/(auth)/login/page.tsx` | Accept `mode=save-plan`: heading and sub text, the left panel shows `<PlanPreview/>`, sign-up by default with the name pre-filled, the 27b check-email state, and the `/onboarding/finish` return paths in 27. The auth function calls themselves stay the same |
| `src/app/auth/callback/route.ts` | When `safeNext(next)` is `/onboarding/finish`, redirect there whatever the onboarding state |
| Landing page | Every "Get started" goes to `/start` |
| Old `/onboarding` pages | Replaced by redirects after phase W5 works |
| Payment success page | The **Continue setting up** button and the one `claim_pending_countdown()` call (9.4) |
| `(app)/layout.tsx` | Call `useOnboardingFollowUps()` once (8.6) |
| Focus page | Select `onboarding:recommendedPreset` once (7.1) |
| Countdowns on the web | The pending-countdown card (8.6). The web countdown form itself is unchanged for now |
| `package.json` | Add `qrcode.react` (the only new dependency) |

**Everything else is new code** in the files listed in 8.1.

**Check before each commit** (the only matches allowed are the changes above, each listed in the report):

```bash
git diff -U0 -- src ':!src/app/start' ':!src/app/onboarding/finish' ':!src/app/get-app' ':!src/components/onboarding' ':!src/lib/onboarding' \
 | grep -E '^[+-]' | grep -vE '^(\+\+\+|---)' \
 | grep -E 'supabase|\.from\(|\.rpc\(|\.auth\.|fetch\(|startCheckout|polar|webhook|middleware|redirect|router\.|habitGroup|isPro|localStorage'
```

**Never:** run SQL, print secrets, commit `.env` files, add route handlers, use `bg-white` or `text-white`, or add purchase links inside the native app.

---

## 12. Build order

Each phase: build, run the protected-code check, then ship with the usual steps (`next build` with the 15-minute limit, `git add -A`, confirm no `.env` is staged, commit, push to main). Never run `npm run dev`. Sohan checks each phase on focalyst.online.

| Phase | What | Done when |
|---|---|---|
| W0 | Sohan: section 13 steps 1 to 3 | Check table shows 1 / true / 2 |
| W1 | Draft store, step machine, desktop stage, phone layout, progress bar, keyboard, `PlanPreview`, routing (middleware and landing links) | A signed-out visitor lands on screen 1 from Get started; a refresh resumes on the same screen |
| W2 | Chapters 1 to 3 | Answers fill the plan panel live on desktop |
| W3 | Chapter 4 (15 to 20), including the group choice and the screen 20 check | All answers saved; the screen 20 report says whether web notifications exist |
| W4 | Chapter 5: report maths, loader, report screens, chart, plan summary, screen 26 with widget mock-ups | Numbers match 6.2 for H = 4.5, G = 3 (and H = 1); 26 hides when no store link is set |
| W5 | Save: login `save-plan` mode, 27b, callback rule, `/onboarding/finish`, retries, group step, old onboarding redirects | A new Google, Apple and email account each get habits, tasks, the countdown and the group exactly once |
| W6 | 28 to 32, paywall, the Polar round trip, success page button, `useOnboardingFollowUps`, `/get-app`, QR code, Focus preset | Checkout opens Polar and the user comes back to 31 or 32; Pro users skip 28 to 30 |
| W7 | QA (section 14) on a laptop and a phone browser, both themes | Checklist passes |

---

## 13. Sohan's steps

1. **SQL:** if `ONBOARDING_01.sql` (v3, the one that returns habit ids) isn't in Supabase yet, run it in the SQL Editor. Expected check: onboarding table 1, rls on true, functions 2. Safe to run again.
2. **Group privacy check** (before the new onboarding goes live). Run this read-only query and send the result to Claude, who will write and test a small fix so members can read only their own group:
   ```sql
   select tablename, policyname, cmd, roles, qual, with_check
   from pg_policies
   where schemaname = 'public' and tablename in ('habit_groups', 'habit_group_members')
   order by tablename, policyname;

   select table_name, column_name, data_type
   from information_schema.columns
   where table_schema = 'public' and table_name in ('habit_groups', 'habit_group_members')
   order by table_name, ordinal_position;
   ```
3. **Vercel environment variables** (Production and Preview), then redeploy:
   - `NEXT_PUBLIC_APP_STORE_URL` and `NEXT_PUBLIC_PLAY_STORE_URL`: the public store pages. Leave them unset until the apps are live; screen 26 and the phone-app row hide themselves.
   - `NEXT_PUBLIC_WEB_TRIAL_DAYS`: set to `7` only after the Polar yearly product really has a 7-day trial and you've tested it with a 100% discount code. Unset means no trial wording anywhere.
4. **Supabase → Authentication → URL configuration:** confirm `https://focalyst.online/auth/callback` (or `https://focalyst.online/**`) is in the redirect list, so `?next=/onboarding/finish` survives.
5. **Collage images** (after the facelift): 8 screenshots, light and dark, as `public/onboarding/collage-{1..8}-{light|dark}.webp`, about 600 px wide.
6. **After W7:** click through section 14 on your laptop and phone.

---

## 14. QA checklist

- [ ] Landing Get started → `/start` screen 1. Refresh at screen 14 → still 14.
- [ ] Desktop: the plan panel fills row by row and never shows an unanswered value. Phone: no plan panel, the bottom button never hides behind the keyboard.
- [ ] Keyboard only: finish screens 1 to 25 with Enter, number keys and arrows; focus lands on each title.
- [ ] Report for H = 4.5, G = 3: 1,643 h, 103 days, 31.5 h a week, 365 h, 9 weeks, about 214 h. H = 1 shows the positive version. Count-ups don't replay on back.
- [ ] Drift 45 on a free plan: the plan says 25/5 × 4 with the Pro note, and 29 lists the 45-minute benefit.
- [ ] Email sign-up with confirmation: 27b shows; the email link in the same browser finishes the plan once.
- [ ] Google and Apple from 27 → `/onboarding/finish` → habits, tasks and countdown created once, even after back and finish again.
- [ ] Existing onboarded account logs in at 27 → "Welcome back" toast, nothing created.
- [ ] A countdown 60 days away (free) is created; 128 days away is pending and shows the card; after buying Pro it's added.
- [ ] Group: Start shows a real code with Copy and Share; a second account joins with it; full, wrong and already-in-group codes show the right lines; an offline finish is completed once on the next visit.
- [ ] 28 and 29 appear only for free web users; no prices or purchase links in the native app.
- [ ] Paywall: real local prices (₹ from India), no trial wording when the variable is unset, checkout opens Polar, the success page's Continue setting up lands on 31 or 32, and a cancelled checkout returns to 30.
- [ ] 32: the QR code (desktop) and store button (phone) open the right store through `/get-app`; Pro users see Connect Claude or ChatGPT → `/mcp`.
- [ ] Both themes, 200% zoom, reduce motion, VoiceOver on Safari and TalkBack on Chrome.
- [ ] No em dashes, no exclamation marks, sentence case everywhere.
- [ ] The protected-code check is clean except for the allowed changes.

---

## 15. Change register (for the phone app later)

Record every change made while building this, in this table, so the native redesign can copy it in one go.

| # | Date | Screen or area | Change | Why | Applies to phone app? |
|---|---|---|---|---|---|
| 1 | 2026-10-29 | Plan builder | Free users get 25/5 only; longer rhythms shown as Pro | The free plan has one timer preset | Yes, update the phone spec 6.1 |
| 2 | 2026-10-29 | Screen 29 | "More habits, notes and countdowns" instead of "Unlimited…"; "The detailed Catalyst weekly report" | Pro has 3 countdowns, not unlimited | Yes |
| 3 | 2026-10-29 | Visual system | Gradient text only for the hero numbers (23, 24) and the invite code (31), 40 px or larger | Keeps the web's no-gradient-text rule apart from the big reveals | Yes, narrow the phone spec's use to the same places |
| 4 | 2026-10-29 | Desktop | Live `PlanPreview` panel that fills as people answer | Belonging and investment are visible on every screen | Consider a compact version on tablets |
| 5 | 2026-10-29 | Screen 26 | Store links moved to screen 32, after the plan is saved | People installing the app mid-flow would lose the draft | Not applicable |
| 6 | 2026-10-29 | Screen 5 data | Leave `name` out of the payload when the account already has a full name | Stops a full name being cut to the first name | Yes |
| 7 | 2026-10-29 | Screen 12 | The "Other" app chip is left out of "mostly on…"; the 2nd distraction is lowercased; "it" for 1 pick, "both" for exactly 2, "them" for 3 or more | "mostly on Other" reads badly, and the spec didn't say when "them" applies | Yes |
| 8 | 2026-10-29 | Screens 5, 17, 18 | Focus goes to the text field (labelled by the title) instead of the title | Autofocus and title focus can't both hold; screen readers still announce the title | Not applicable |
| 9 | 2026-10-29 | Step transition | The new content fades and slides 12 px in; the old content isn't kept for a cross-fade out | framer-motion isn't installed; CSS and React state only | Not applicable |
| 10 | 2026-10-29 | PlanPreview | "Just me" shows as "Just me"; a 360-minute goal shows as "6+ hours"; the Working towards row hides once the role isn't student | The spec gave no value for these cases | Yes, for the compact tablet version |
| 11 | 2026-10-29 | `/start` page | `page.tsx` is a server wrapper (metadata, plus a build-time check that both collage files exist) around the client `StartFlow` inside `<Suspense>` | A client page can't export metadata; static export stays safe | Not applicable |
| 12 | 2026-10-29 | Screen 2 | Floating chip reads "Exam in 128 days" instead of "NEET in 128 days" | Fits every visitor, not only NEET students | Yes |
| 13 | 2026-10-29 | PlanPreview | Compact rows: one line, 40 tall, label column 136 px, value right aligned and truncated (full value in the title and accessible label); multi-value rows show the first item plus "+n"; a Pro rhythm shows as a small second line only when the card is wide enough, otherwise just the Pro chip; header 32/36, truncated | Long answers broke mid-word and made the card taller than the panel | Yes, wherever the plan card appears |
| 14 | 2026-10-29 | PlanPreview | Shows every filled or skipped row, plus the empty rows of the current and the next chapter only; later rows appear when their chapter is reached. The panel middle scrolls inside (hidden scrollbar, 24 px fade) between the fixed wordmark and chapter list | Keeps the card short so nothing overlaps down to a 700 px window | Yes, wherever the plan card appears |
| 15 | 2026-10-29 | Screen 15 | A habit typed into "Something else" is saved with the ✨ icon | The spec gave no icon for a custom habit (➕ is the option's own icon) | Yes |
| 16 | 2026-10-29 | Screen 16 | Join needs the full 6-character code before Continue (max 6 characters, trimmed, upper-cased), not just a non-empty field | Matches the existing join form in `HabitGroupLeaderboardSection`, which rejects shorter codes | Yes |
| 17 | 2026-10-29 | Screen 17 | The countdown is saved only once the name and a valid date are both filled; Enter in the name field moves to the date while the date is empty | The plan never holds half a countdown | Yes |
| 18 | 2026-10-29 | Screen 18 | Only the first field shows the placeholder | The same example three times reads oddly | Yes |
| 19 | 2026-10-29 | Screen 20 | The time field shows the first suggestion, but the plan row fills only on a chip pick or Continue | A row never fills before the user answers (3.4) | Yes |
| 20 | 2026-10-29 | Screen 20 | No step B on the web: there is no push or subscription code (no `PushManager`, no push handler in `public/sw.js`); only in-tab `setTimeout` reminders in the task and habit forms. `notifications_allowed` is false | Per the screen 20 rule | Not applicable |
| 21 | 2026-10-29 | Steps | Back from 23 skips the loader (22) and returns to 20 | Going back into the loader would just bounce forward again | Yes |
| 22 | 2026-10-29 | Draft | `countedUp` is the list of screens whose count-up has played (23, 24) instead of one boolean; the draft also stores the computed `plan` | One flag would stop 24 counting after 23 | Not applicable |
| 23 | 2026-10-29 | Screen 23 | The "Other" app chip is left out of "Mostly on" (as on 12); the footnote shows the hours used in the maths (10 for "10+") | Same reason as #7; the basis shown must match the sum | Yes |
| 24 | 2026-10-29 | Screen 24 | The two hope numbers are 44 px inside the 28 px statement (line height 44) | Keeps the gradient exception at 40 px or larger (3.7) | Yes |
| 25 | 2026-10-29 | Screen 26 | Blocking card reads "Distracting apps are paused" when no app (or only Other) was picked; the timer widget always counts as one with data | The spec had no value for that case | Yes |
| 26 | 2026-10-29 | Plan builder | `onboarding:recommendedPreset` holds `{ focusMinutes, breakMinutes, sets, idealMinutes }`, the Focus page's own preset shape | The spec didn't give a format | Yes |
| 27 | 2026-10-29 | Middleware | `/onboarding/finish` is reachable for onboarded accounts too, not only not-onboarded ones | The callback sends there "whatever the onboarding state", and the "Welcome back" case (8.3) needs the page to run | Not applicable |
| 28 | 2026-10-29 | Middleware | Onboarded accounts with the `onboarding_post=1` cookie can open `/start`. `/onboarding/finish` sets it (7 days); it clears with `onboarding:post:v1` | `onboarding_done` is already true when screens 28 to 32 run on `/start` | Not applicable |
| 29 | 2026-10-29 | Screen 27 | The link is `/login?mode=save-plan&next=/onboarding/finish` | The existing middleware and "already signed in" logic on `/login` follow `next` | Not applicable |
| 30 | 2026-10-29 | Screen 27 | "Save your plan." stays the heading after switching to log in (reset keeps its own); on phones it sits under the wordmark | The spec gave one heading | Not applicable |
| 31 | 2026-10-29 | Screen 27b | A new check-email panel with the same `auth.resend` call and 60 s cooldown as `CheckInboxPanel` | `CheckInboxPanel` is shared with normal sign-up, whose copy must not change | Not applicable |
| 32 | 2026-10-29 | `/onboarding/finish` | "Welcome back" toast shows on the finish page for 1.6 s, only when a draft existed, then home | Toasts don't survive navigation; with no draft there is nothing to keep | Not applicable |
| 33 | 2026-10-29 | `/onboarding/finish` | `page.tsx` is a server wrapper (metadata) around the client `FinishFlow` | Same as #11 | Not applicable |
| 34 | 2026-10-29 | Group step | "Already in a group" is stored as `existing` with its code; a create call that throws is stored as `failed` | The spec showed that group on 31 but named no status, and listed failures for join only | Yes |
| 35 | 2026-10-29 | Plan builder | After sign-in, Pro accounts get their Pro rhythm saved again in `onboarding:recommendedPreset` | 7.1: use `isPro` after sign-in | Yes |
| 36 | 2026-10-29 | Payload | `group` is sent as `{ mode, habit_index }` (the code stays in `answers`); list fields are always arrays; unanswered fields and the countdown are left out rather than null | Matches the 8.2 example; JSON null and a missing key differ in SQL | Yes |
| 37 | 2026-10-29 | Post state | `onboarding:post:v1` also keeps `answers`, `skipped`, `plan`, `groupHabitId`, `purchased` and `chatShown` | The draft is deleted before 28, and 28, 29, 31 and the plan panel need the answers; Try again on 31 needs the habit id | Not applicable |
| 38 | 2026-10-29 | Screen 28 | Names in text (the `/mcp` page has no Claude or ChatGPT logo files). Reply: with no tasks but a habit, "Start with a {minutes}-minute session, then tick off {habit}."; the habit's first letter is lowercased; "1 day", and "is today" at 0 days; the all-skipped line drops " at {time}" when no time was set and uses 2 hours when no goal was set | The spec didn't cover these mixes | Yes |
| 39 | 2026-10-29 | Screen 31 | `HabitGroupLeaderboardSection` has no share text, so the fallback invite is used; "We're tracking {habit}." is dropped when there is no habit name | Per 31 | Yes |
| 40 | 2026-10-29 | Screen 31 | Started shows the real standings plus "Invite a friend" rows up to 5 (the screen 16 preview while loading). An existing group with a code uses the Started layout | Never shows invented rows for a group that already has people | Yes |
| 41 | 2026-10-29 | Screen 31 | A failed create: title "That didn't work.", the "anything else" line, Try again repeats the create (no code field). Try again while offline shows the "anything else" line | The spec listed failures for join only | Yes |
| 42 | 2026-10-29 | Screen 32 | Row lines "Widgets, blocking and your plan on the go." and "Ask about your plan from your AI app."; the phone store row has no chevron; Go to my plan is a secondary button (a `variant` on the footer action) | The spec gave labels only | Yes |
| 43 | 2026-10-29 | Paywall | Desktop cards show a small number hint (1 to 3) instead of a `Kbd`; the Save % is rounded (33% USD, 16% INR) | Matches the spec's own numbers | Yes |
| 44 | 2026-10-29 | Paywall | `startCheckout(plan)` is unchanged, so Polar's own back link returns to `/paywall` and a 401 goes to `/login?next=/paywall`; the browser back button returns to `/start` at 30 | `checkout.ts` and the checkout route are protected and only accept `/paywall`, `/pricing` and `/onboarding/plans` | Not applicable |
| 45 | 2026-10-29 | 8.6 | `claim_pending_countdown` is called only when this browser saved a pending countdown (`onboarding:pendingCountdown`, written by `/onboarding/finish`). The success page's claim shows its toast on the next `/start` screen. The response is read as `created`, `reason`, `name` or `title` | Avoids a call on every visit for everyone; the SQL isn't in this repo | Yes |
| 46 | 2026-10-29 | 8.3 | When `complete_onboarding` kept failing, 28 to 32 run in memory from the kept draft; Go to my plan leaves the draft for the retry | The draft must survive until the save works | Not applicable |
| 47 | 2026-10-29 | Focus page | The Focus page doesn't remember a chosen preset, so the key is used on the first visit and removed. Phones match their 45/10 × 3 and 60/15 × 2 presets; desktop has no such pill, so Pro gets them as the custom timer (desktop keeps 4 sets). Free stays on 25/5 | "Never chose one" has nothing else to check | Not applicable |
| 48 | 2026-10-29 | `/get-app` | `page.tsx` is a server wrapper (metadata) around the client `GetApp`. With no store link set it reads "The phone app isn't available yet. Your plan is ready on focalyst.online." | Same as #11; the spec had no copy for that case | Not applicable |
| 49 | 2026-10-29 | Pending countdown card | Shown on desktop Focus and the phone Focus page; See Pro is hidden in the native app | No purchase links in the native app | Yes |
| 50 | 2026-10-30 | Screens 28 and 29 | Replaced by "Your starting report" with free and locked sections; 29 removed | A personal report gives a concrete reason to upgrade | Yes |
| 51 | 2026-10-30 | Paywall | "Unlock your full report." title, "Also with Pro" list, yearly trial chip, line and timeline | Benefits sit where the decision is made; the trial is clear | Yes (store trial) |
| 52 | 2026-10-30 | Plan panel | Reads `onboarding:post:v1` after sign-up | It went empty after the draft was cleared | Yes |
| 53 | 2026-10-30 | Insights | Starting report card and page | Keeps the promise to buyers; a lasting upgrade path for free users | Yes |
| 54 | 2026-10-30 | Starting report | `buildStartingReport` also returns `overline` and `chips`; a block can be `chat` (the P4 chat preview in section 7); the header date includes the year ("30 Oct 2026") | The renderer needs the header chips and a place for the chat visual; a report read months later needs the year | Yes |
| 55 | 2026-10-30 | Starting report | "1 hour" and "hour" in the singular wherever H or G is 1 ("At 1 hour a day", "building to 1 hour a day") | "At 1 hours a day" reads badly | Yes |
| 56 | 2026-10-30 | Starting report | App tactics show the app as the bold row label and the tactic after it ("Instagram" · "Log out on your phone…"), as the distraction rows do | The R4 text starts with "{app}:", which repeated the label | Yes |
| 57 | 2026-10-30 | Starting report | Section 1 leaves "Other" out of the apps (as #7 and #23); "Low energy" is skipped when there is no best time; section 6 is skipped when the countdown date is today or past; section 2 is one paragraph | Data missing, or the line would be wrong | Yes |
| 58 | 2026-10-30 | Starting report | For Pro users with a longer rhythm, section 2 reads "Your plan starts with 45/10 sessions…" (or 60/15) | A Pro plan already uses the longer rhythm (7.1), so "25/5" would be wrong | Yes |
| 59 | 2026-10-30 | Screen 28 | Shown for everyone with saved answers (free, Pro, native); skipped only when `onboarding:post:v1` has no answers (a save from before P4). `already_pro` and the success page both return to 28 | R1 shows the report to every group; an old post state has nothing to build from | Yes |
| 60 | 2026-10-30 | Screen 28 | On phones the bottom bar keeps the existing fade-to-canvas footer rather than a `glass` bar; Maybe later is a text link above the primary | Same footer as every other step | Not applicable |
| 61 | 2026-10-30 | Paywall | "Also with Pro" is a 2-column list on desktop; the trial timeline sits under the 3 cards, not inside the yearly card; the "No payment today" line sits in the footer above the button, behind `SHOW_NO_PAYMENT_TODAY` in `flags.ts` | Keeps the cards the same height; the line belongs next to the button | Yes |
| 62 | 2026-10-30 | Insights | The card's Lock and Pro chip are hidden in the native app; the card sits above and below `DesktopInsightsView` on desktop (the view itself is unchanged); with no row the page shows "No starting report yet" and a back link | No upsell in the native app; only the Insights page may change | Yes |
