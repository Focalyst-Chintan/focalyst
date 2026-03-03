# Focalyst — Project Requirements Document (PRD)
**Version 2.0 | March 2026**
**Document Type:** Product Requirements Document
**Purpose:** Complete reference for AI-assisted development of Focalyst. Based on finalised Figma UI designs. Feed this to AI before every coding session.

---

## Core Instruction for AI

> This is the single source of truth for building Focalyst.
> Read every section before writing a single line of code.
> Build exactly what is described here — screen by screen, feature by feature.
> When in doubt, refer back to this document. Do not invent features or flows.

---

## 1. Product Overview

### 1.1 What is Focalyst?
Focalyst is an AI-powered all-in-one productivity web application that helps users plan their work, focus deeply, capture ideas, and review their progress — all in one unified experience. It replaces the need for separate task managers, focus timers, note-taking apps, and habit trackers.

### 1.2 Tagline
**"Own your time."**

### 1.3 Value Proposition
*"Your all-in-one productivity hub"*

### 1.4 Problem Statement
Students, professionals, and freelancers are forced to juggle multiple disconnected apps — Todoist for tasks, Forest for focus, Notion for notes, and separate habit apps. Context-switching between these tools kills productivity. Focalyst replaces all of them with one cohesive AI-powered experience.

### 1.5 Platform Phases
- **Phase 1:** Responsive web application (mobile + desktop)
- **Phase 2:** Progressive Web App (PWA) — installable on phone home screen
- **Phase 3:** Native Android and iOS apps via Capacitor

---

## 2. Target Users

### Primary — Early Career Professional ("Rohit")
- Age 25–32, software engineer, medical professional, or similar
- Manages multiple projects and deadlines simultaneously
- Tech-savvy early adopter
- Wants one tool to replace Todoist + Notion + Google Calendar
- Willing to pay ₹99–999/month for genuine time savings

### Secondary — College Student ("Neha")
- Age 18–23, undergraduate student
- Juggles assignments, exams, clubs, and part-time work
- Budget-conscious, responds strongly to gamification and streaks
- Discovers apps through friends, Instagram, Reddit
- Prefers free or ₹99/month maximum

### Tertiary — Freelancer ("Deepak")
- Age 28–38, freelance developer or designer
- Wears many hats — client work, invoicing, self-marketing
- Needs one place to see all tasks and deadlines
- Responds to lifetime deals due to variable income

---

## 3. App Architecture

### 3.1 Navigation Structure

**Bottom Navigation Bar (Mobile)** — 5 items:
```
[ 📅 Plan ]  [ 🎯 Focus ]  [ + ]  [ 📝 Notes ]  [ 📊 Insights ]
```
- The **+** in the centre is a quick-add button (not a tab)
- Tapping + opens a floating capsule with 3 options: **Task | Session | Note**

**Top Header (All Screens):**
- Left: User account avatar button → opens Profile page
- Centre: **FOCALYST** wordmark
- Right: AI chat icon button → opens AI chat

**Exceptions — Distraction-Free Mode:**
During active Pomodoro sessions and while writing in the Note Editor:
- Bottom navigation bar is hidden
- Top header (avatar + AI chat button) is hidden
- Only the essential timer or note interface is shown

**Left Sidebar (Desktop 1024px+):**
- Replaces bottom navigation
- Shows Plan, Focus, Notes, Insights tabs vertically
- 240px wide, navy background

### 3.2 Responsive Layout
- **Mobile (< 768px):** Bottom nav, single column, 16px screen padding
- **Tablet (768px–1024px):** Bottom nav, 2-column card layouts
- **Desktop (> 1024px):** Left sidebar (240px), centred content (max-width 800px), AI chat as right panel (380px)

---

## 4. Complete Screen List (21 Screens)

| # | Screen Name | Tab / Section |
|---|---|---|
| 1 | Welcome screen | Onboarding |
| 2 | Log in / Sign up | Onboarding |
| 3 | Subscription plans (Monthly view) | Onboarding |
| 4 | Subscription plans (Annual view) | Onboarding |
| 5 | Enter your name | Onboarding |
| 6 | Profile type selection | Onboarding |
| 7 | Plan tab — Today view | Tab 1 Plan |
| 8 | Plan tab — Calendar view | Tab 1 Plan |
| 9 | New task screen | Tab 1 Plan |
| 10 | New habit screen | Tab 1 Plan |
| 11 | Quick add tab (floating capsule) | Navigation |
| 12 | Focus tab home | Tab 2 Focus |
| 13 | Pomodoro active timer | Tab 2 Focus |
| 14 | Break timer | Tab 2 Focus |
| 15 | Session complete screen | Tab 2 Focus |
| 15b | New countdown screen | Tab 2 Focus |
| 16 | Notes home screen | Tab 3 Notes |
| 17 | New note / Note editor | Tab 3 Notes |
| 18 | User account icon clicked (Notes context) | Account |
| 19 | User profile page | Account |
| 20 | AI chat icon clicked (Notes context) | AI Chat |
| 21 | AI chat interface | AI Chat |
| 22 | Insights dashboard | Tab 4 Insights |

---

## 5. Onboarding Flow (First-Time Users Only)

### Screen 1 — Welcome Screen
**Layout:**
- Full navy-blue (#4A6C8C) background
- Focalyst logo icon (white, top centre)
- App name: **FOCALYST** (white, bold)
- Tagline: **"Own your time."** (white, regular)
- Hero copy: **"Your all-in-one productivity hub"** (white, large, centred)
- Bottom: **"Create account"** button (outlined, white) + **"Sign in"** text link below it

### Screen 2 — Log In / Sign Up
**Layout:**
- White background
- **"Continue with Google"** button (outlined, navy)
- Divider: "or"
- **"Enter your email"** input field
- **"Continue with email"** button (navy filled)

### Screen 3 — Subscription Plans (Monthly toggle selected)
**Layout:**
- Header: **"Plans to catalyse your focus"** (navy, large, bold)
- Toggle switch: **Monthly | Yearly (2 months free)** — Monthly selected by default
- 3 plan cards stacked vertically:

**FREE card:**
- Title: FREE
- Subtitle: Start your focus journey
- Price: INR 0
- Button: "Use for Free" (navy)
- Features listed below button

**PRO card (highlighted — Most Popular):**
- Title: PRO | "Most Popular" badge (navy)
- Subtitle: Unlock your full potential
- Price: INR 99/month
- Button: "Get Pro plan" (navy filled)
- Features listed

**LIFETIME card:**
- Title: LIFETIME
- Subtitle: Best Value. Pay once. Focus forever.
- Price: INR 2999 billed once
- Button: "Get Lifetime plan" (navy)
- Features listed

### Screen 4 — Subscription Plans (Yearly toggle selected)
- Same layout as Screen 3
- Toggle: **Monthly | Yearly** — Yearly selected
- Pro price changes to: **INR 999/year** with "Save 16%" badge in orange

### Screen 5 — Enter Your Name
**Layout:**
- Headline: **"Before we get started, what should I call you?"**
- Name input field with arrow/submit button
- Clean, minimal, centred layout

### Screen 6 — Profile Type Selection
**Layout:**
- Headline: **"What best describes you?"**
- Subheadline: **"We'll personalise Focalyst to fit your life"**
- 5 options as selectable cards (single select):
  - Student
  - Freelancer
  - Creator
  - Working Professional
  - Entrepreneur
- **"Let's go"** button (navy filled, bottom)
- **"Skip for now"** text link

**Data saved:**
- `users.full_name` — from Screen 5
- `users.profile_type` — from Screen 6
- `users.onboarding_done` — set to TRUE after Screen 6

---

## 6. Tab 1 — Plan

### Screen 7 — Plan Tab Home (Today View)

**Top section:**
- Greeting: **"Good morning/afternoon/evening, [First Name]"** (navy, 18px SemiBold)
- Two capsule toggle buttons: **TODAY** (selected/navy filled) | **CALENDAR**

**Today's date section:**
- Large date display: e.g. **"28 Feb"** with day label "Friday"
- Right-aligned: **"No events"** or **"X events"** (grey text)

**TO-DO List Card:**
- Section label: **"TO-DO List"** (navy, SemiBold)
- List of tasks, each showing:
  - Empty checkbox (left) — tap to complete
  - Task title (body text)
  - Three-dot option button (right) → Delete, Rename, Add Tag
  - Tasks are draggable to reorder priority sequence
- **"+ Add new task"** button (orange accent, full width, rounded-xl)

**My Habits Card:**
- Section label: **"My Habits"** (navy, SemiBold)
- List of habits, each showing:
  - Empty checkbox (left) — tap to mark done today
  - Habit name
  - **"Streak X days"** label (blue-muted, small)
  - Three-dot option button (right) → Edit, Delete
- **"+ Add new habit"** button (orange accent, full width, rounded-xl)

---

### Screen 8 — Plan Tab (Calendar View)

**Top section:**
- Same greeting header
- Capsule toggle: **TODAY** | **CALENDAR** (Calendar selected/navy filled)

**Calendar card:**
- Full month calendar grid (Mo Tu We Th Fr Sa Su)
- Current date highlighted (navy circle)
- Orange dot on dates with events
- Scrollable to view other months

**Below calendar — Event/Reminder section:**
- Text: **"No reminders"** or list of reminders for selected date
- **"+ Add reminder"** expandable card, which when tapped shows:
  - Event name input (typed by clicking the "+ Add reminder" text)
  - **All-day** toggle (on/off)
  - **Starts** — date + time dropdown (e.g. "28 Feb 2026 ↕ 8:00 AM ↕")
  - **Ends** — date + time dropdown
  - **Repeat** dropdown: Never / Every day / Every week / Every 2 weeks / Every month / Every year
  - Save button

---

### Screen 9 — New Task Screen

**Full screen (no bottom nav):**
- Back arrow (top left)
- Title: **"New task"** (24px Bold, navy)
- **"Describe"** label + text input field (pre-filled placeholder: "Practicals")
- **"Set duration"** label + Start | End date inputs side by side
- **"Add Tags"** label + tag input field
- **"Priority level"** label + 3 numbered circle buttons: **1** (High) | **2** (Medium, selected/navy) | **3** (Low)
- **"Get reminders"** label + toggle switch (off by default)
- **"Save task"** button (orange accent, full width, bottom)

---

### Screen 10 — New Habit Screen

**Full screen:**
- Title: **"New habit"**
- **"Name your habit"** label + input (e.g. "Meditation")
- **"Set a goal"** label + Start date | End date inputs side by side
- **"Repeat days"** label + day selector: **M T W T F S S** (individual toggles) + **"All days"** checkbox
- **"Get reminders"** toggle (off by default)
  - When ON: **"Select time: 07:00 AM ↕"** time picker appears
- **"Save habit"** button (orange accent, full width, bottom)

---

### Screen 11 — Quick Add Tab (Floating Capsule)

**Trigger:** Tap the **+** button in the centre of the bottom navigation bar

**Behaviour:**
- A floating capsule/card appears above the + button with 3 icon options:
  - 📅 **Task** — opens Screen 9 (New task)
  - ⏱ **Session** — opens Screen 12 (Pomodoro setup) to select preset and start
  - 📝 **Note** — opens Screen 17 (Note editor, new blank note)
- Tapping anywhere outside the capsule dismisses it

---

## 7. Tab 2 — Focus

### Screen 12 — Focus Tab Home

**Two sections stacked:**

**Pomodoro Section (top):**
- Header: **"Pomodoro"** (24px Bold, navy) + **"Start Session"** button (orange, top right beside header)
- Input card (light navy card background):
  - **Duration (minutes)** label + input field
  - **Break (minutes)** label + input field
  - **Number of Sets** label + input field
  - *Free plan: inputs disabled with lock icon. Paid plan: inputs active.*
  - 4 preset chip buttons (2×2 grid, navy filled):
    - **25/5×4**
    - **45/10×3**
    - **60/15×2**
    - **90/30×2**

**Countdown Section (below Pomodoro):**
- Header: **"Countdown"** (24px Bold, navy)
- Countdown cards, each showing:
  - Large day number: **"7"** (accent orange) + **"Days to"** (navy)
  - Date + Event name below (blue-muted, small)
  - Three-dot options (right) → Edit, Delete
- **"+Add new"** button (orange accent, full width)

---

### Screen 13 — Pomodoro Active Timer

**Full screen — distraction-free (no top header, no bottom nav):**
- Status badge: **"FOCUS TIME"** (navy filled capsule, top centre)
- Set counter: **"Set 1/3"** (below badge, blue-muted)
- Large countdown: **"29:30"** (48px Bold, navy, centre)
- Linear orange progress bar below the time
- **"Pause"** button (outlined, navy)
- **"Reset"** button (outlined, navy)
- WakeLock API enabled — screen stays awake

**On completion of focus block:**
- Vibration alert
- Auto-transition to Screen 14 (Break timer)

---

### Screen 14 — Break Timer

**Full screen — distraction-free:**
- Large navy background fills most of screen
- **"Well done"** (large, white, bold, centre)
- **"Set 1 of 3 complete"** (white, regular)
- **"Next session begins in"** (white, regular)
- Large countdown: **"04:53"** (large, white, centre)
- **"Skip"** button (navy outlined, bottom left)
- **"Back"** button (navy outlined, bottom right)

---

### Screen 15 — Session Complete Screen

**Full screen — distraction-free:**
- Navy/card-bg background
- **"Great job"** (large, navy, bold, centre)
- **"You focused for X minutes across Y sets"** (navy, regular, centre)
- **"Start new"** button (navy outlined)
- **"Back"** button (navy outlined)
- Session automatically logged to `pomodoro_sessions` table

---

### Screen 15b — New Countdown Screen

**Full screen:**
- Title: **"New countdown"**
- **"Describe"** label + input (event name)
- **"Date"** + **"Time"** inputs side by side
- **"Get reminders"** toggle
- **"Save"** button (orange accent, full width)

**Free plan limits:**
- Maximum 1 active countdown
- Target date must be within 30 days
- Attempting to add 2nd → upgrade modal

---

## 8. Tab 3 — Notes

### Screen 16 — Notes Home Screen

**Layout:**
- Search bar at top: **"Search your note"** placeholder, rounded, card-bg background
- Filter chips (horizontal, scrollable): **All** | **Recents** | **Favourite** | **Folders**
- **"+ New note"** button (orange accent, full width, below filters)
- List of note cards, each showing:
  - Note document icon (left)
  - Note title (body text)
  - Three-dot option button (right) → Delete, Download, Rename, Add to Folder, Add to Favourites, Edit

**Free plan:** Maximum 5 notes — + button shows upgrade modal when limit reached

---

### Screen 17 — Note Editor (New Note)

**Full screen — distraction-free (no top header, no bottom nav):**
- Top bar: back arrow (left), note title (centre, editable), favourite heart icon + download icon (right)
- Title field: **"Untitled document"** (editable, large)
- Body: large text area — **"Start writing..."** placeholder
- Bottom formatting toolbar (fixed):
  - Bold, Italic, Underline
  - H1, H2
  - Bullet list, Numbered list, Checklist
  - Microphone (speech to text)
- Auto-save every 30 seconds
- Speech to text: English only, Web Speech API, pulsing mic indicator when active

**Free plan:** Maximum 5 notes, 50 pages each

---

## 9. Account & Profile

### Screen 18 — Notes Screen with Account Icon Clicked
- Shows notes home with account icon in top-left highlighted
- Transitions to Screen 19

### Screen 19 — User Profile Page

**Full screen:**
- Back arrow (top left) + **"PROFILE"** title (centre)
- Profile photo (circular, from Google) with **"PRO"** badge overlay (orange)
- User name: **"Alex Morgan"** (18px Bold, navy)
- Email: "alex.morgan@example.com" (blue-muted)
- **"Edit Profile"** button (outlined, navy, small)

**My Plan card (navy background, white text):**
- **"My Plan"** label
- **"Pro"** + **"Annual"** badge
- **"Renewal Date: Dec 12, 2024"**
- **"Manage Plan"** button (white outlined)
- Decorative icon (top right of card)

**Preferences section:**
- **Task Reminders** toggle (ON — orange)
- **Habit Reminders** toggle (ON — orange)
- **Pomodoro Alerts** toggle (OFF — grey)
- **Language** row → "English >" (chevron)

**Dark Mode card:**
- **"Dark Mode"** with moon icon + toggle (OFF by default)

**Support section (header in accent orange):**
- **Help & FAQ** row (chevron right)
- **Contact Us** row (chevron right)
- **Privacy Policy** row (chevron right)
- **Terms of Service** row (chevron right)

**Bottom:**
- **"Delete my account"** button (navy filled, destructive — confirmation modal required)
- App info: **"Version: Focalyst V1"** + **"Built by Chintan"** (blue-muted, small, centre)
- **"Log out"** button (orange accent, full width)

---

## 10. AI Chat

### Screen 20 — AI Chat Icon Clicked (Notes context)
- Shows the notes screen with the AI chat icon highlighted in top-right
- Transitions to Screen 21

### Screen 21 — AI Chat Interface

**Appearance:**
- Mobile: bottom sheet, slides up, covers ~85% of screen
- Desktop: right side panel, 380px wide, slides in from right

**Top bar:**
- Title: **"Ask Focalyst AI"** (navy, SemiBold)
- Subtitle: **"Powered by Gemini"** (blue-muted, 11px)
- **X** close button (top right)

**Suggested prompt chips (shown before first message):**
- "What should I focus on today?"
- "Add a task for tomorrow"
- "How productive was I this week?"
- "Remind me to review notes at 8pm"

**Helper text:**
- "I can add tasks, set reminders, summarise your week, and answer productivity questions."

**Chat bubbles:**
- User messages: right-aligned, navy blue bubble, white text
- AI messages: left-aligned, light card-bg bubble, navy text

**Input bar (fixed bottom):**
- Microphone icon (left)
- **"Ask anything..."** placeholder input
- Send arrow button (navy filled, right) — activates when text is entered
- Free plan counter below input: **"3 of 5 free messages used"**

**AI capabilities:**
- Add task: *"Add task — submit report — due Friday 5pm"*
- Set reminder: *"Remind me to call client at 3pm"*
- Productivity summary: *"How did I do this week?"*
- General productivity Q&A

**Context awareness:**
- AI receives the user's tasks, habits, and Pomodoro data as context
- Personalised based on profile type (student / professional / freelancer etc.)

**States:**
- Typing indicator: animated 3 dots while Gemini generates
- Error state: "Something went wrong. Try again." with retry button
- Rate limit: "You've used all 5 free messages today. Upgrade to Pro for unlimited AI chat 🚀" + "Upgrade Now" inline button

**Free plan:** 5 messages per day
**Paid plan:** Unlimited messages

---

## 11. Tab 4 — Insights

### Screen 22 — Insights Dashboard

**Top section:**
- **"Insights"** (24px Bold, navy, left)
- **"Today, [Date]"** (blue-muted, right)

**Tasks Completed card (full width, card-bg background):**
- Title: **"Tasks Completed"** (SemiBold, navy)
- Subtitle: "Great job! You're almost there." (blue-muted)
- Left: **"12 / 15 tasks"** — large number in orange accent
- Right: Circular donut chart in orange showing **80%**

**Two smaller cards side by side:**

*Focus Time card:*
- Orange timer icon (top left)
- **"+12%"** (green, small — vs last week)
- **"4h 30m"** (large, navy, bold)
- **"Total Focus Time"** (blue-muted, caption)

*Productivity Score card:*
- Trend arrow icon (top left)
- **"92"** (large, navy, bold)
- **"Productivity Score"** (blue-muted, caption)
- *Paid plan only — shows blurred/locked on free plan*

**Focus Activity card (full width):**
- Title: **"Focus Activity"** (SemiBold, navy)
- Toggle chips: **Weekly** (selected, navy) | **Monthly** (outlined)
- Stacked bar chart (Mon–Sun):
  - Navy bars = Focus time
  - Orange bars = Break time
  - Legend: ● Focus ● Break
- *Free plan: current week only. Paid: any past week + monthly toggle*

**Current Streaks section:**
- Title: **"Current Streaks"** (SemiBold, navy)
- 2-column grid of habit streak cards, each showing:
  - Habit icon (circular, coloured background)
  - Habit name (e.g. "Meditation")
  - **"12 days in a row"** (blue-muted, caption)

**AI Summary (below streaks — Paid only):**
- Gemini-generated 3–4 sentence personalised analysis
- 2–3 actionable improvement suggestions
- Refreshed weekly

---

## 12. Productivity Score Calculation

```
Score = weighted average out of 100

Tasks completed on time:    40% weight
Habit consistency:          35% weight
Focus hours vs avg:         25% weight

Colour:
  75–100 → Green
  50–74  → Orange
  0–49   → Red
```

---

## 13. Plans & Pricing

### Pricing Table

| Feature | Free | Pro Monthly | Pro Yearly | Lifetime |
|---|---|---|---|---|
| Price | ₹0 | ₹99/month | ₹999/year | ₹2,999 once |
| To-Do tasks | Unlimited | Unlimited | Unlimited | Unlimited |
| Habits | 2 max | Unlimited | Unlimited | Unlimited |
| Pomodoro presets | 4 built-in | + Custom | + Custom | + Custom |
| Day countdowns | 1 (30 days) | Unlimited | Unlimited | Unlimited |
| Notes | 5 notes | Unlimited | Unlimited | Unlimited |
| Note length | 50 pages | Unlimited | Unlimited | Unlimited |
| Weekly insights | This week | Any week | Any week | Any week |
| Monthly insights | No | Yes | Yes | Yes |
| AI Productivity Score | No | Yes | Yes | Yes |
| AI chat | 5/day | Unlimited | Unlimited | Unlimited |
| App blocker | No | Yes (mobile) | Yes (mobile) | Yes (mobile) |
| Future features | No | No | No | Free |
| Support | Standard | Priority | Priority | Premium |

### Upgrade Modal (triggered on hitting free limit)
- Title: "You've reached your free limit"
- Brief description of what is locked
- **"Upgrade to Pro"** button (orange accent)
- **"Maybe Later"** text link (always present — never force the upgrade)

---

## 14. User Flows

### New User Flow
```
Welcome (S1) → Sign Up (S2) → Plans (S3/S4) → Enter Name (S5) 
→ Profile Type (S6) → Plan Tab Home (S7)
```

### Returning User Flow
```
App open → Auto-login check → Plan Tab Home (if session active) 
                            → Welcome Screen (if logged out)
```

### Quick Add Flow
```
Any tab → Tap + (centre nav) → Floating capsule appears 
→ Task → New Task screen (S9)
→ Session → Pomodoro setup (S12)
→ Note → Note editor (S17)
```

### Pomodoro Flow
```
Focus tab (S12) → Select preset or enter custom → Tap "Start Session" 
→ Active timer (S13) → Break timer (S14) → [repeat sets] 
→ Session complete (S15) → Stats logged to Supabase
```

### AI Chat Flow
```
Any tab → Tap AI chat icon (top right) → Chat slides up (S21) 
→ Type or tap prompt chip → Gemini responds 
→ If action (add task etc.) → Executes and confirms
→ X to close → Returns to previous screen
```

### Upgrade Flow
```
Hit free limit → Upgrade modal → Tap "Upgrade to Pro" 
→ Plans page (S3/S4) → Select plan → Razorpay checkout 
→ Payment success → Plan updated in Supabase → Feature unlocked
```

### Account / Logout Flow
```
Any tab → Tap avatar (top left) → Profile page (S19) 
→ Scroll to bottom → "Log out" → Session cleared → Welcome screen (S1)
```

---

## 15. Non-Functional Requirements

### 15.1 Performance
- Initial page load under 3 seconds on mobile
- All list queries paginated (maximum 20 items per request)
- Database indexes on: `user_id` (all tables), `due_date` (tasks), `completed_date` (habit_logs), `updated_at` (notes)
- Lazy load images and heavy components
- Skeleton loading screens on all data-fetching components — never blank screens

### 15.2 Security
- Row Level Security (RLS) enabled on ALL Supabase tables
- Users can only read and write their own data — never another user's
- No secret API keys exposed on client side
- All Gemini and Razorpay API calls routed through Next.js server actions or API routes
- All user inputs validated and sanitized before database writes
- Rate limiting: AI chat — maximum 10 requests per minute per user
- Rate limiting: Auth attempts — maximum 5 per minute per IP
- HTTPS enforced on all routes
- Environment variables for all secrets — never hardcoded

### 15.3 Error Handling
- Every component must have an error state (not only loading and success)
- Network errors show user-friendly messages (not raw error codes)
- Failed API calls retry once automatically before showing error
- Form validation errors shown inline below the relevant field
- Global 404 page for invalid routes
- Global error boundary to catch unexpected crashes

### 15.4 Accessibility
- All interactive elements keyboard navigable
- Minimum tap target size 44×44px on all touch targets
- WCAG AA colour contrast minimum on all text
- Alt text on all images and icons
- Screen reader-friendly labels on all inputs

### 15.5 Offline Behaviour
- Show "You're offline" banner when internet connection is lost
- Cache last loaded data for read-only offline viewing
- Queue writes when offline and sync on reconnect (Phase 2)

---

## 16. Out of Scope for Version 1

- App blocker (Phase 2, mobile only)
- Team collaboration features
- Google Calendar sync
- Multiple languages (English only for v1)
- Apple Sign-In
- Dark mode (v1.1)
- iPad / tablet specific layouts
- Offline write sync

---

## 17. Success Metrics

| Metric | Target |
|---|---|
| Day 1 retention | > 60% |
| Day 7 retention | > 30% |
| Free to paid conversion | > 5% |
| AI chat usage | > 50% of active users weekly |
| Onboarding completion | > 70% |
| Average session length | > 5 minutes |

---

## 18. Build Order (Screen by Screen)

Build in this exact sequence for the smoothest development experience:

1. Project setup — Next.js, Tailwind, Supabase, environment variables
2. Auth — Google OAuth, session middleware, welcome screen, login screen
3. Onboarding — Plans screen, name input, profile type selection
4. Tab 1 — Plan home (Today view), task list, habit list
5. Tab 1 — Calendar view, add task screen, add habit screen
6. Tab 2 — Focus home, Pomodoro timer, break timer, session complete
7. Tab 2 — Countdown list, add countdown screen
8. Tab 3 — Notes home, note editor, speech to text
9. Tab 4 — Insights dashboard, charts (Recharts), streak cards
10. AI Chat — Gemini API integration, chat interface, context passing
11. Account / Profile page — preferences, plan management
12. Payments — Razorpay integration, subscription management, feature gates
13. PWA configuration — manifest, service worker
14. CodeRabbit review → AI fixes → final testing → deploy to Vercel

---

*Focalyst PRD v2.0 — March 2026*
*Based on finalised Figma UI designs. This is the single source of truth for all development decisions.*
*Built by Chintan*
