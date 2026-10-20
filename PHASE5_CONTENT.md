# FOCALYST PHASE 5: BUILD SPEC + FINAL COPY
Antigravity: this file is the source of truth for Phase 5. Use the copy EXACTLY as written (no em dashes, no exclamation marks, sentence case). Section A is the build spec. Section B is the page copy.

Business facts (use everywhere they apply):
- Product: Focalyst. Operator: "Focalyst by Chintan". Chintan is an MSME registered in India, based in Kolkata, West Bengal, India.
- Founder and CEO: Sohan Tamang.
- Support email: contactfocalyst@gmail.com
- Grievance Officer: Sohan Tamang, contact.sohantamang@gmail.com
- Last updated / effective date for legal pages: 20 October 2026
- Prices: Pro Monthly $4.99, Pro Annual $39.99, Lifetime $99.99 (one-time). India: ₹99/month, ₹999/year, ₹2,999 lifetime.
- Payments: Polar (polar.sh). Razorpay is not used anywhere.
- AI: OpenRouter for Focalyst AI chat, summaries and reports. Speech to text: Whisper Large v3 Turbo.
- No analytics or advertising tools are used.
- Chintan's tagline is Productivity and Mindful Living.

---------------------------------------------------------------------
## A. BUILD SPEC
---------------------------------------------------------------------

### A0. CSP (first)
Search once for `Content-Security-Policy`. Without removing anything: add `https://app.kit.com` to connect-src; add or extend form-action with `'self' https://app.kit.com`; ensure img-src allows `https: data: blob:`. Keep `wss://*.supabase.co`.

### A1. Public page shell (About, Contact, Help, Privacy, Terms, Blog, MCP marketing strip)
- New `PublicLayout`: AmbientBackground, theme-aware glass nav, footer. Must look great at 375px, 768px, 1280px, 1440px.
- Nav (glass-strong, sticky top-3, radius 20, max-w-[1200px] mx-auto): left wordmark (small-logo 24 + FOCALYST); centre links: Features (/app), Blog (/blog), MCP (/mcp-preview, see A4), About (/about); right: "Log in" ghost + primary "Get started" (/login?mode=signup). If signed in: "Open app" (/today). On phones: links collapse into a menu button that opens a glass sheet.
- The landing hero nav keeps its current white-on-photo style but uses the same links.
- Footer (all public pages + landing), 4 columns on desktop, stacked on phones:
  - Brand: wordmark, "Own your time.", "Focalyst by Chintan · Kolkata, India"
  - Product: Features (/app), MCP (/mcp-preview), Blog (/blog)
  - Company: About (/about), Contact (/contact)
  - Support: Help and FAQ (/help), Privacy Policy (/privacy), Terms of Service (/terms)
  - Bottom line: "© 2026 Focalyst by Chintan. All rights reserved." 13 text-ink-3
- Fix all existing links: "About" must go to /about (NOT /app). "Features" goes to /app.

### A2. Legal layout (Privacy, Terms)
- Header: micro "LEGAL", font-display clamp(40px,5vw,56px) title, 14 text-ink-3 "Last updated 20 October 2026".
- "The short version" glass liquid card (radius 20, p-6, max-w-[760px]): 5 check-icon bullets (copy in B).
- Body: lg: grid [240px | minmax(0,720px)] gap 48. Left: sticky (top 96) table of contents of the numbered H2s, 13px, active section text-ink with 2px primary bar (IntersectionObserver). Phones: TOC becomes a collapsible "On this page" frost card above the content.
- Typography `.fx-article`: body 16/28 text-ink-2, H2 font-display 28/34 text-ink mt-14 scroll-mt-28 with anchor ids, H3 18/26 600 mt-8, lists 8px gap, links text-primary-text underline offset-3 (external links open in a new tab, rel="noopener noreferrer").
- Tables (frost, radius 16, overflow-hidden, rows hairline, header micro text-ink-3, cells 14px). On phones tables become stacked cards.
- Bottom: frost card "Questions about this policy? Email contactfocalyst@gmail.com" with Copy button.
- Print styles: hide nav/footer/TOC, black text on white.

### A3. Help and FAQ (/help)
- Header micro "HELP CENTRE", H1, search Input (filters questions and answers client-side, highlights matches), category chips (sticky under nav on scroll).
- Each category: H2 + accordion of questions (button rows 56px, radius 16, frost; Plus rotates to X; answer 15/26 text-ink-2; smooth height animation). Each question has an id for deep links (/help#cancel-pro) and opens automatically when linked.
- Add FAQPage JSON-LD built from the same data.
- Bottom CTA card (copy in B).

### A4. MCP
- In-app page /mcp (signed in, desktop shell) AND public marketing page /mcp-preview (PublicLayout). Same content component, copy in B.
- Waitlist: existing KitWaitlist. Signed in: prefilled email + first name, store `fx-mcp-joined=1` after success and show success state on later visits.
- Chips "Coming soon" (primary-soft) and "Pro" (brand gradient, snow text).
- Comparison card: two columns (stack on phones): left frost "An ordinary AI", right glass liquid with brand gradient border "Your AI, with Focalyst". Chat bubbles styled like the AI drawer.
- Capability grid 3x2 (1 col phones), each frost card with 36px icon chip: MessageSquareText, ChartSpline, Compass, CalendarPlus, NotebookPen, AppWindow.
- "Part of Focalyst Pro" card: brand gradient, onDark buttons: "Join the waitlist" (scrolls to the form) and "See Pro plans" (signed in: /settings?tab=pro; signed out: /login?mode=signup).
- Mini FAQ accordion (same component as /help).

### A5. About (/about) and Contact (/contact)
- About: hero (centred, max-w-[760px]), sections with generous spacing (py-20), 4 principle cards (2x2), 6 feature tiles (3x2, each with a lucide icon), "Who we are" split card (left: text + founder line; right: a brand-gradient tile with grain showing the word "Chintan" in font-display italic 56 snow and "Thoughtful reflection." 14 snow/75 below), CTA band (glass liquid, centred).
- Contact: hero, primary email card (glass liquid, large email in font-display 32, buttons "Copy email" with Toast "Email copied" and "Write an email" mailto), 4 topic cards (2x2), quick links row, business details line.

### A6. Accountability moves into Plan > Habits (remove the Groups page)
- Remove "Groups" from the sidebar and Cmd+K Navigate. Add Cmd+K item "Accountability" -> /plan?view=habits#accountability.
- /groups on desktop: router.replace('/plan?view=habits#accountability'). Mobile /groups behaviour unchanged.
- Today "Your group" card: "Open group" -> /plan?view=habits#accountability (smooth scroll to the section).
- In the Habits view main column, below the habit list (mt-10), add section id="accountability":
  - Header row: font-display h2 28 "Accountability" + 13 text-ink-3 "Stay consistent together." Right: group switcher (SegmentedControl when 2-3 groups, Select when more; hidden when 1), ghost sm "Join with code", secondary sm "Create group".
  - Card (frost, radius 24, p-6): grid [minmax(280px,340px) | 1fr] gap 28 (stack below 1280px).
    - Left: compact podium (2nd, 1st, 3rd): Avatar 44, name 13/600, metric 12 text-ink-2, pedestals h 72 / 96 / 56, radius 14 top, #1 brand gradient + grain + Crown 14, #2/#3 bg-surface-2. Under it: invite code chip (monospace, Copy) + MoreHorizontal menu (Share invite, Leave group).
    - Right: micro "STANDINGS" + rows (h 44, radius 12): rank, Avatar 28, name (+ "(You)"), habit name 12 text-ink-3, Flame + streak right. Current user row bg-primary-soft. Max 6 rows, then "Show all N" expands.
  - Empty (no groups): frost card, font-display 28 "Stay accountable together.", 15 text-ink-2 "Create a group or join one with a 6 character code. Members only see your name, your chosen habit and your streak.", buttons Create group / Join with code.
  - Reuse habitGroupService + the safe realtime pattern (unique channel per mount, try/catch, removeChannel).
- Avatar fix everywhere (group cards, podium, standings, stacks):
  - Colour per member from a stable hash of user_id over: #1951FC, #3781FC, #0B2CB1, #4B5675, #6FA4FF; initials text-snow 11/600 (28px) or 15/600 (44px).
  - Stacks: `flex -space-x-2`, each avatar 28px with `ring-2 ring-[var(--surface)]` (match the card background), max 3 avatars then a "+N" pill (28px, bg-surface-3, text-ink-2 11/600). No avatar may overlap without the ring.

### A7. Notes folders: Kintsugi colours (fixed glossy silver, both themes)
The current dark-mode folders look muddy. Folders are a physical object: they keep the light glossy silver look of the reference in BOTH themes. Replace the folder CSS variables with fixed values:
```css
.fx-folder { --f-back-top: #F2F4F8; --f-back-bot: #DEE3EA; --f-paper: #FFFFFF; --f-paper-2: #F6F7FA;
  --f-front: linear-gradient(180deg, rgba(255,255,255,0.78) 0%, rgba(241,244,248,0.94) 38%, #E4E8EF 100%);
  --f-ink: #0A1022; --f-ink-2: #4B5675; --f-ink-3: #8A93AB; }
.fx-folder[data-active="true"], .fx-folder:hover {
  --f-back-top: #D9E7FF; --f-back-bot: #A9C8FF;
  --f-front: linear-gradient(180deg, rgba(170,203,255,0.92) 0%, #7FAEFF 45%, #5B93F8 100%);
  --f-ink: #FFFFFF; --f-ink-2: rgba(255,255,255,0.88); --f-ink-3: rgba(255,255,255,0.75); }
.dark .fx-folder { filter: brightness(0.9) saturate(0.95); }
.fx-folder .fx-folder-front { background: var(--f-front); border-top: 1px solid rgba(255,255,255,0.95);
  box-shadow: inset 0 1px 0 #fff, 0 -8px 18px -12px rgba(3,25,91,0.22); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); }
```
- Card proportions like the reference: aspect-[1.15/1] (min-h 176), radius 22, outer shadow `0 1px 0 rgba(255,255,255,0.8) inset, 0 12px 28px -16px rgba(3,25,91,0.35)`.
- Back: SVG path with a soft tab on the TOP LEFT, filled with linear-gradient(var(--f-back-top) to var(--f-back-bot)).
- Two paper sheets peeking (back sheet var(--f-paper-2) offset 6px right, front sheet var(--f-paper) with 3 lines of 10.5px preview text in #8A93AB), lifting 8px on hover/active.
- Front pocket covers the bottom 60%, radius 18, with name 15/600 var(--f-ink), "N notes" 12 var(--f-ink-2), "Updated 1h ago" 11 var(--f-ink-3).
- All folder text uses the --f-ink variables (never theme ink). The dashed "New folder" tile stays theme-aware.

### A8. Settings (/settings, desktop)
Grid [220px | 1fr] gap 24, tabs via ?tab=profile|appearance|notifications|pro|account with sliding .fx-active-pill.
- Profile: Avatar 72, Full name (users.full_name, save on blur, Toast "Saved", emitDataChanged), Email read-only.
- Appearance: 3 theme cards with drawn mini previews (Light, Dark, System split), selected gradient border + Check; "Reduce motion" switch (localStorage fx-reduce-motion -> html class fx-reduce-motion -> .ambient-blob animation none).
- Notifications: switches for users.task_reminders_enabled, habit_reminders_enabled, pomodoro_alerts_enabled (optimistic, revert + Toast on error).
- Focalyst Pro: Pro users: brand gradient card with plan name (Lifetime, Pro Annual, Pro Monthly), renewal/expiry from plan_expires_at or "Yours for life" for lifetime, onDark "Manage" (existing billing flow). Free users: same card style, "Focalyst Pro", 5 benefit lines (copy from Help "What do I get with Pro"), prices line "From $4.99 a month · ₹99 in India", onDark "Upgrade" (existing Paywall).
- Account: Time zone select (users.timezone, Intl.supportedValuesOf('timeZone')), Sign out, danger card "Delete account": if an existing delete-account flow exists, use it; otherwise a button "Request deletion" that opens mailto:contactfocalyst@gmail.com?subject=Delete%20my%20account.

### A9. Blog (UI only, no backend)
- src/lib/blog/source.ts with `getPosts(): Promise<BlogPost[]>` returning [] (single swap point for later).
- Reusable PostCard, FeaturedPostCard, ArticleLayout components (not routed yet).
- /blog static page (PublicLayout): header + empty-state glass card with KitWaitlist ("Notify me") + topic chips. No sample posts. Copy in B.

### A10. Site basics
- src/app/not-found.tsx (copy in B).
- Root metadata: metadataBase https://focalyst.online, title template "%s | Focalyst", default "Focalyst · Own your time", description "A calm, all-in-one productivity hub. Plan your days, focus deeply, capture ideas and see how you grow.", Open Graph + Twitter large image /landing/hero.png, icons /small-logo.png.
- Per-page metadata titles: About, Contact, Help and FAQ, Privacy Policy, Terms of Service, Blog, MCP.
- robots.ts (allow /, disallow /today /plan /focus /notes /insights /settings /mcp) and sitemap.ts (/, /app, /about, /contact, /help, /privacy, /terms, /blog, /mcp-preview). Must not break the mobile/Capacitor export build.
- Landing #features uses /landing/app-preview.png.

### A11. Final QA
Every desktop page in light and dark at 1280 and 1440, plus all public pages at 375: fix legacy orange, hardcoded hex, `white` utilities, missing hover/active/focus-visible states, missing Skeleton/EmptyState/error states, contrast below 4.5:1, em dashes, exclamation marks, Title Case. AmbientBackground pauses when the tab is hidden. Mobile app pages at 375 unchanged. Mobile export build succeeds. Search the whole codebase for "Razorpay", "razorpay", "Gemini" in user-facing copy and remove or replace (payments: Polar; AI: OpenRouter).

---------------------------------------------------------------------
## B. PAGE COPY
---------------------------------------------------------------------

### B1. MCP (/mcp and /mcp-preview)

Eyebrow: FOCALYST LABS · chips: Coming soon · Pro

H1: Your Focalyst, inside your AI.

Lead: Connect your Focalyst data to ChatGPT, Claude, Gemini or any AI assistant you already use, and turn an ordinary chatbot into a productivity coach that actually knows you.

Waitlist button: Join the waitlist
Under the form (12, text-ink-3): MCP will be available on Focalyst Pro. Join now for early access.

Section: Generic advice, or advice built on your week?
Ask a regular AI how to focus better and you get the same tips it gives everyone. It has never seen your habits, your deadlines or the hours you actually do your best work. Connect Focalyst and that changes. Your AI can read your tasks, habits, focus sessions, notes and goals, so every answer starts from your real life, not from an average person's.

Comparison card
- Question (shared, top): "How do I stay consistent this month?"
- An ordinary AI: "Set clear goals, remove distractions and try the Pomodoro technique."
- Your AI, with Focalyst: "Your Yoga streak is your strongest right now, but Run has slipped five times this week, and each time you focused past 11 PM the night before. You do your best work around 9 PM. Try running before 7 PM and protect a 9 PM deep work block."
- Caption: Example answer. Your coach works from your own data.

Section: What your coach can do
1. Answer with context. Ask why your focus dipped this week and get an answer built on your sessions, not on guesses.
2. Analyse in depth. Spot patterns across weeks: when you focus best, which habits slip first and what quietly derails a good day.
3. Build new strategies. Turn your data into a plan you can follow: a revision schedule, a habit stack or a realistic week.
4. Plan from any chat. Say "Add revise anatomy for tomorrow at 7" and it lands in Focalyst, ready when you are.
5. Review your progress. Ask for a weekly debrief, detailed or brief, in the tone that keeps you going.
6. Stay where you already work. No new app to learn. Your coach lives inside the AI assistant you already open every day.

Section: Why this matters
Advice is everywhere. Context is rare.
Most productivity advice fails because it ignores the person reading it: your schedule, your energy, your history. Focalyst already holds an honest record of how you actually spend your time. MCP lets your AI read that record, so the guidance you get is specific, grounded and built around what you have really done. Your data becomes a mirror. Your AI becomes a coach.

Section: How it will work
1. Connect. Link Focalyst to your AI assistant with a secure connection in a few clicks.
2. Ask. Ask anything about your habits, tasks, focus and notes in plain language.
3. Act. Let your coach analyse, plan and, with your permission, add items to Focalyst.

Section: You stay in control
We are designing MCP so that:
- It is read-only by default. Your AI can look, not change, until you allow it.
- You choose what to share. Connect only the parts of Focalyst you want.
- You can disconnect anytime. One click and the connection is gone.
- Your data is never sold or used for advertising.

Pro card
Title: Part of Focalyst Pro
Body: MCP will be available to Focalyst Pro members. Join the waitlist today and we will email you the moment early access opens.
Small line: Pro starts at $4.99 a month, or ₹99 in India.
Buttons: Join the waitlist · See Pro plans

Mini FAQ
- What is MCP? MCP, the Model Context Protocol, is an open standard that lets AI assistants connect securely to apps and data sources. It is how your AI assistant will read your Focalyst data.
- Which AI assistants will work? Any assistant that supports MCP connections. That includes ChatGPT, Claude and Gemini where their apps offer MCP support, and more tools are adding it all the time.
- Is it free? MCP is a Focalyst Pro feature. Anyone can join the waitlist.
- When will it launch? We are building it now. Waitlist members hear first.

### B2. About (/about)

Eyebrow: ABOUT FOCALYST
H1: Own your time.
Lead: Focalyst is a calm, all-in-one productivity hub for people who want to do meaningful work without the noise. Plan your days, focus deeply, capture your ideas and see how you are really growing, all in one quiet place.

Section: Why Focalyst exists
Most productivity tools compete for the very thing they promise to protect: your attention. Notifications, endless features and scattered apps turn getting organised into another job. Focalyst takes a different path. It brings planning, focus, notes and reflection together, keeps every screen calm, and uses AI only where it genuinely helps you think more clearly about your own time.

Section: What we believe
- Calm over clutter. A tool should lower the noise in your day, not add to it. Every screen in Focalyst is designed to be quiet and clear.
- Focus is a skill. Deep work is not a personality trait. It is built one session at a time, and Focalyst helps you practise it.
- Reflection drives growth. You cannot improve what you never look at. Insights, streaks and weekly reports turn your days into lessons.
- Your data is yours. What you write and track stays private. We never sell it and never use it for advertising.

Section: Everything in one place
- Plan. Habits, tasks and a calendar that keeps your week in view.
- Focus. A distraction-free timer, with every minute you focus saved.
- Notes. Rich notes, checklists and voice notes with AI summaries.
- Insights. Levels, streaks, a productivity score and a weekly Catalyst Report.
- Accountability. Habit groups that keep you consistent with friends.
- Focalyst AI. A coach that understands your tasks, habits and focus.

Section: Who we are
Focalyst is built by Chintan, an independent MSME based in Kolkata, India. The word chintan means deep, thoughtful reflection, and that idea shapes everything we make: tools that help you think clearly, act deliberately and grow quietly.
Founder line: Sohan Tamang, Founder and CEO
Brand tile: "Chintan" (font-display italic) + "Thoughtful reflection."

CTA band
Title: Start owning your time.
Buttons: Get started · Read the FAQ

### B3. Contact (/contact)

Eyebrow: CONTACT
H1: We would love to hear from you.
Lead: Questions, feedback, a bug you spotted or an idea that would make Focalyst better. Every message is read by a real person.

Email card
Label: Email us
Email: contactfocalyst@gmail.com
Buttons: Copy email · Write an email
Note: We read every message and reply as soon as we can.

Topic cards
- Support. Something not working the way it should? Tell us what happened, which device and browser you used and, if you can, attach a screenshot.
- Billing. Payments are processed securely by Polar. For receipts, plan changes or refunds, email us from the address you used to pay.
- Privacy and data. To access, export, correct or delete your data, email us with the subject "Privacy request". You can find the details in our Privacy Policy.
- Partnerships and press. Creators, educators and teams who want to work with Focalyst, we would be glad to talk.

Quick links: Help and FAQ · Privacy Policy · Terms of Service
Business details: Focalyst by Chintan · Registered MSME · Kolkata, West Bengal, India

### B4. Help and FAQ (/help)

Eyebrow: HELP CENTRE
H1: How can we help?
Search placeholder: Search questions

Getting started
- What is Focalyst? Focalyst is an all-in-one productivity hub. You can plan habits, tasks and reminders, run focus sessions, write notes and voice notes, review your progress in Insights and stay accountable with friends. Focalyst AI helps you make sense of it all.
- Which devices can I use? Focalyst works in any modern browser at focalyst.online, on your phone, tablet or computer. Sign in with the same account and your data stays in sync everywhere.
- How do I create an account? Choose Get started, then sign in with Google, Apple or your email and a password.

Plans and billing
- Is Focalyst free? Yes. The Free plan includes habits, tasks, the calendar, focus sessions with the classic 25 minute timer, notes, voice notes, Insights and habit groups, with lower limits than Pro.
- What do I get with Pro? Pro gives you more habits, notes and voice notes; higher daily limits for Focalyst AI (Free includes 5 messages a day); your productivity score; the detailed weekly Catalyst Report on your strengths and weaknesses; custom focus timers and every preset (Free uses 25 and 5 only); up to 3 countdowns (Free includes 1); and MCP, to connect Focalyst to your favourite AI assistant, when it launches.
- How much does Pro cost? Pro Monthly is $4.99, Pro Annual is $39.99 and Lifetime is a one-time $99.99. In India, Pro is ₹99 a month, ₹999 a year or ₹2,999 for Lifetime. Taxes may apply at checkout.
- Who processes payments? Payments are handled securely by Polar. Focalyst never sees or stores your card details.
- How do I cancel? You can cancel a monthly or annual plan at any time. You keep Pro until the end of the period you paid for, and you will not be charged again. Lifetime is a one-time payment, so there is nothing to cancel.
- Can I get a refund? Yes, within the windows described in the Refunds section of our Terms of Service. Email contactfocalyst@gmail.com from the address you used to pay.

Focus and timers
- How are focus minutes counted? Every focus session counts from the moment you start it. If you end, reset or skip a session after at least one minute, the time you focused is still saved. Breaks are not counted as focus time.
- Can I set my own timer lengths? Custom timers and the longer presets are part of Pro. Free includes the classic 25 minute focus and 5 minute break.
- What are countdowns? Countdowns show how many days are left until a date that matters, like an exam or a launch. Free includes 1 countdown and Pro includes up to 3.
- What is desk mode? On a computer, press F on the Focus page to go full screen with just your timer and a clock. Press Esc to leave.

Habits, tasks and calendar
- What is a streak? A streak counts how many scheduled days in a row you completed a habit. Missing a scheduled day resets it.
- How do levels and XP work? You earn XP by staying consistent in Focalyst. XP moves you through 15 levels, starting at Ignition, and you can follow your progress and the full roadmap in Insights.
- Can reminders repeat? Yes. Reminders can repeat on a schedule, such as every day, every week or every month.

Notes and voice
- How do voice notes work? Record a voice note and Focalyst turns your speech into text, then writes a short AI summary. The transcript and summary are saved with your note so you can search and edit them.
- Is there a limit on notes? Free includes a set number of notes and voice notes. Pro raises those limits.

Focalyst AI and privacy
- What can Focalyst AI do? Ask about your week, add a task, get a summary of your habits or plan your next steps. It uses your tasks, habits, notes and focus sessions as context, so its answers are about you.
- Does the AI see my data? Only to answer you. When you chat with Focalyst AI, the relevant parts of your data are sent securely to our AI provider to generate a reply. Chats are kept for 90 days and then deleted. We never sell your data. Read more in our Privacy Policy.
- Can the AI make mistakes? Yes. AI can be wrong. Treat its suggestions as guidance, not as professional, medical, legal or financial advice.

Accountability groups
- How do habit groups work? Create a group or join one with a 6 character code. Members see each other's name, chosen habit and streak on a shared leaderboard. Your notes, tasks and everything else stay private.
- How do I leave a group? Open Plan, go to Habits, and in Accountability open the menu next to the group, then choose Leave group.

Account and data
- Can I export my data? Yes. Email contactfocalyst@gmail.com with the subject "Data export" and we will send you a copy of your data.
- How do I delete my account? Email contactfocalyst@gmail.com from your account email with the subject "Delete my account", or use Delete account in Settings if you see it there. Deleting your account permanently removes your data. We do not keep backups of deleted accounts.

Bottom CTA card
Title: Still need help?
Body: Our team reads every message.
Buttons: Email us (mailto:contactfocalyst@gmail.com) · Contact page

### B5. Blog (/blog, UI only)
Eyebrow: THE FOCALYST JOURNAL
H1: Notes on focus, habits and owning your time. ("owning your time" in italic)
Lead: Essays on focus, study systems and behaviour science from the team behind Focalyst.
Empty card title: First posts are on the way.
Empty card body: Thoughtful, practical writing on doing deep work in a distracted world. Be the first to read it.
Button: Notify me
Topics label: Topics coming soon · chips: Focus, Habits, Study systems, Deep work, Behaviour science

### B6. 404
Title: This page took a focus break.
Body: It may have moved, or the link may be incomplete.
Buttons: Go to Today · Home

### B7. Privacy Policy (/privacy)

Title: Privacy Policy
Last updated 20 October 2026

The short version
- We collect only what Focalyst needs to work: your account, the things you create, and how you use the timer and AI.
- We never sell your data and we do not use analytics or advertising trackers.
- Focalyst AI uses your tasks, habits, notes and focus sessions as context to answer you. AI chats are deleted after 90 days.
- Voice notes and dictation are turned into text. The transcript is saved with your note.
- Delete your account and everything is permanently erased. We keep no backups of deleted accounts.

1. Who we are
Focalyst is a productivity service operated by Chintan, an MSME registered in India and based in Kolkata, West Bengal ("Focalyst", "we", "us"). Our founder and CEO is Sohan Tamang. This policy explains what personal data we collect when you use focalyst.online, the Focalyst apps and related services (together, the "Service"), why we collect it, who we share it with and the choices you have. For any question, write to contactfocalyst@gmail.com.

2. Information we collect
2.1 Account information. Your name, email address, profile photo if you add one, sign-in method (Google, Apple or email and password), time zone and plan.
2.2 Content you create. Habits and check-ins, tasks, reminders and calendar entries, countdowns, focus sessions, notes, checklists, folders, voice note transcripts and summaries, AI chat messages and the groups you create or join.
2.3 Voice and dictation. When you record a voice note or dictate a message to Focalyst AI, your audio is sent for transcription to produce text. The transcript, and for voice notes the AI summary, is saved in your account.
2.4 AI conversations. The messages you send to Focalyst AI and its replies.
2.5 Payment information. When you buy Pro, payment is processed by Polar. We receive your plan, purchase status, amount, currency and transaction identifiers. We never receive or store your full card details.
2.6 Notification settings. Your reminder preferences and, on our mobile app, a push notification token used to deliver reminders.
2.7 Waitlist and email. If you join a waitlist or ask for updates, your email address and, if you share it, your first name.
2.8 Technical information. Like any website, our hosting provider processes basic technical data such as your IP address, browser type and request logs to deliver the Service and keep it secure. We do not use analytics tools.
2.9 Stored on your device. We store a few preferences on your device, such as your theme, sidebar state and sign-in session.

3. How we use your information
- To provide the Service: sync your data across devices, run timers, send reminders and show your Insights, levels and reports.
- To power AI features: answer your questions, summarise voice notes and generate weekly reports.
- To process payments and manage your plan.
- To run accountability groups and show leaderboards to group members.
- To communicate with you about your account, support requests and, if you asked for them, product updates.
- To keep the Service secure, prevent abuse and fix problems.
- To meet legal obligations.
We do not sell your personal data, and we do not use it for advertising.

4. How Focalyst AI works
4.1 Context. To give answers that are about you, Focalyst AI uses the relevant parts of your tasks, habits, notes, focus sessions and goals as context. This data is sent securely to our AI provider, OpenRouter, which routes it to the language model that generates the reply.
4.2 Speech to text. Voice notes and dictation are transcribed using the Whisper Large v3 Turbo speech recognition model, accessed through our AI service providers.
4.3 Retention. AI chat conversations are stored for 90 days and then permanently deleted. Voice note transcripts and summaries stay with your note until you delete the note or your account.
4.4 Accuracy. AI can make mistakes. Focalyst AI is not a substitute for professional, medical, legal or financial advice.

5. Who we share data with
We share personal data only with service providers that help us run Focalyst, and only as needed for the purposes in this policy. Each provider handles data under its own privacy policy:
| Provider | What they do for us | Privacy policy |
| Supabase | Database, authentication and file storage | https://supabase.com/privacy |
| Vercel | Website hosting and delivery | https://vercel.com/legal/privacy-policy |
| OpenRouter | AI chat, summaries, reports and access to AI models | https://openrouter.ai/privacy |
| Polar | Payments, subscriptions and invoicing | https://polar.sh/legal/privacy |
| Kit | Waitlist and email updates you sign up for | https://kit.com/privacy |
| Google | Sign in with Google | https://policies.google.com/privacy |
| Apple | Sign in with Apple | https://www.apple.com/legal/privacy/ |
| Expo | Delivering push notifications on our mobile app | https://expo.dev/privacy |
We may also disclose data if the law requires it, to protect the rights and safety of our users or the public, or as part of a merger or sale of our business, in which case this policy will continue to protect your data.

5.1 Accountability groups. When you join a group, other members can see your name or initials, the habit you track in that group and your streak. They cannot see your notes, tasks, AI chats or any other data.

6. International transfers
Our providers may store and process data on servers outside India, including in the United States and the European Union. When data leaves India, we rely on providers that apply strong security and contractual protections.

7. How long we keep data
| Data | How long we keep it |
| Account and content you create | Until you delete it or delete your account |
| AI chat conversations | 90 days, then permanently deleted |
| Voice note transcripts and summaries | Until you delete the note or your account |
| Waitlist and email updates | Until you unsubscribe or ask us to remove you |
| Payment records | Kept by Polar for as long as tax and accounting laws require |
| Technical logs | Kept by our hosting provider for a short period under its own policy |
When you delete your account, we permanently delete your account and all associated data from our systems. We do not keep backups of deleted accounts. Inactive accounts are not deleted automatically.

8. Security
We protect your data with encryption in transit, secure authentication and access controls at the database level. No system is perfectly secure, so please use a strong password and keep your sign-in details private. If we become aware of a breach that affects you, we will notify you and the relevant authorities as the law requires.

9. Your rights
Depending on where you live, including under India's Digital Personal Data Protection Act, 2023 and, for users in the European Economic Area or the United Kingdom, the GDPR, you can:
- access the personal data we hold about you
- correct or update inaccurate data
- delete your data or your account
- receive a copy of your data
- withdraw consent where we rely on it
- nominate another person to exercise your rights if you are unable to
- raise a complaint with us, and if you are not satisfied, with your data protection authority
To exercise any right, email contactfocalyst@gmail.com with the subject "Privacy request". We will respond within 30 days.

10. Children
Focalyst is not intended for children under 13, and they may not create an account. If you are between 13 and 18, you may use Focalyst only with the consent and supervision of a parent or legal guardian. If you believe a child has given us personal data without proper consent, contact us and we will delete it.

11. Cookies and local storage
We use only what is strictly necessary for Focalyst to work, such as keeping you signed in and remembering your preferences. We do not use advertising or analytics cookies.

12. Changes to this policy
We may update this policy as Focalyst evolves. When we make significant changes, we will update the date above and, where appropriate, notify you in the app or by email.

13. Contact and grievance officer
Focalyst by Chintan, Kolkata, West Bengal, India
Email: contactfocalyst@gmail.com
Grievance Officer: Sohan Tamang, Founder and CEO, contact.sohantamang@gmail.com
We aim to respond to every request within 30 days.

### B8. Terms of Service (/terms)

Title: Terms of Service
Last updated 20 October 2026

The short version
- Focalyst is a productivity service run by Chintan, an MSME in Kolkata, India.
- You must be at least 13. If you are under 18, you need a parent's or guardian's consent.
- Your content belongs to you. We only use it to run Focalyst for you.
- Pro is billed through Polar. Cancel monthly or annual plans anytime.
- AI can be wrong. Use it as guidance, not professional advice.

1. Agreement
These Terms of Service ("Terms") are an agreement between you and Chintan, an MSME registered in India and based in Kolkata, West Bengal, which operates Focalyst ("Focalyst", "we", "us"). By creating an account or using focalyst.online, our apps or related services (the "Service"), you agree to these Terms and to our Privacy Policy. If you do not agree, please do not use the Service.

2. Eligibility
You must be at least 13 years old to use Focalyst. If you are under 18, you may use Focalyst only with the consent of a parent or legal guardian, who agrees to these Terms on your behalf.

3. Your account
You are responsible for the information you provide, for keeping your sign-in details secure and for activity on your account. Tell us promptly at contactfocalyst@gmail.com if you think your account has been accessed without permission.

4. Acceptable use
You agree not to:
- break any law or infringe anyone's rights
- upload anything harmful, abusive, hateful or sexually explicit, or that harasses others, including in group names
- try to access accounts or data that are not yours
- interfere with, overload or reverse engineer the Service, or bypass plan limits
- use automated means to scrape the Service or abuse Focalyst AI
- resell or commercially exploit the Service without our written permission
We may suspend or remove content or accounts that break these rules.

5. Your content
You own everything you create in Focalyst, including your notes, tasks, habits and recordings. You give us a limited licence to store, process and display your content only to operate and improve the Service for you, including sending relevant content to our AI providers when you use AI features. This licence ends when you delete your content or your account.

6. Focalyst AI
Focalyst AI, voice transcription, summaries and reports are generated by AI models and may be inaccurate or incomplete. They are for general productivity guidance only and are not professional, medical, legal, financial or psychological advice. You are responsible for how you use any AI output.

7. Plans, pricing and payment
7.1 Plans. Focalyst offers a Free plan and paid Pro plans: Pro Monthly ($4.99 a month), Pro Annual ($39.99 a year) and Lifetime ($99.99 one-time). In India, prices are ₹99 a month, ₹999 a year and ₹2,999 for Lifetime. Prices shown at checkout, including any taxes, apply.
7.2 Payments. Payments are processed by Polar, which may act as the seller of record and handle taxes and invoicing. Your purchase is also subject to Polar's terms.
7.3 Renewals. Monthly and annual plans renew automatically at the end of each period until you cancel. You can cancel anytime, and you keep Pro until the end of the period you have paid for.
7.4 Lifetime. Lifetime gives you access to Pro features for as long as Focalyst operates the Service. It is personal and cannot be transferred.
7.5 Price changes. We may change prices for future periods. If the price of your subscription changes, we will tell you before it applies, and you can cancel before the new price takes effect.

8. Refunds
If you are not satisfied, email contactfocalyst@gmail.com from the address you used to pay:
- Pro Monthly and Pro Annual: within 7 days of your first payment for a full refund. Renewal payments are not refundable, but you can cancel to stop future renewals.
- Lifetime: within 14 days of purchase for a full refund.
Refunds are processed through Polar to your original payment method. Where the law gives you additional rights, those rights still apply.

9. Free plan and limits
The Free plan has limits, for example 5 Focalyst AI messages a day, the 25 minute focus preset and 1 countdown. We may change features and limits over time to keep Focalyst sustainable, and we will try to give notice of significant changes.

10. Accountability groups
Groups let members see each other's name, chosen habit and streak. Be respectful. Group creators and Focalyst may remove members who break these Terms.

11. MCP and third-party AI tools
When available, MCP is a Pro feature that lets you connect Focalyst to third-party AI assistants you choose. Your use of those assistants is governed by their own terms and privacy policies. You decide what to connect and can disconnect at any time.

12. Third-party services
Focalyst relies on third-party providers such as Supabase, Vercel, OpenRouter, Polar, Kit, Google, Apple and Expo. We are not responsible for their services, but we choose them carefully.

13. Our intellectual property
Focalyst, its design, logo, software and content, other than your content, belong to Chintan and are protected by law. You may not copy, modify or distribute them without our written permission.

14. Suspension and termination
You can stop using Focalyst and delete your account at any time. We may suspend or end your access if you seriously or repeatedly break these Terms, if required by law, or to protect users or the Service. Where reasonable, we will give notice.

15. Disclaimers
The Service is provided "as is" and "as available". We work hard to keep Focalyst reliable, but we do not guarantee it will always be uninterrupted, error free or that data will never be lost. Focalyst is a productivity tool and does not guarantee any particular result.

16. Limitation of liability
To the fullest extent the law allows, Focalyst will not be liable for indirect, incidental or consequential losses, or for lost data, profits or opportunities. Our total liability for any claim is limited to the amount you paid us in the 12 months before the claim. Nothing in these Terms limits liability that cannot be limited by law.

17. Indemnity
You agree to compensate us for reasonable losses arising from your misuse of the Service or your breach of these Terms.

18. Governing law and disputes
These Terms are governed by the laws of India. Before going to court, please contact us so we can try to resolve the issue. Any dispute will be subject to the exclusive jurisdiction of the courts in Kolkata, West Bengal.

19. Changes to these Terms
We may update these Terms from time to time. If changes are significant, we will notify you in the app or by email. Continuing to use Focalyst after changes take effect means you accept the new Terms.

20. Contact
Focalyst by Chintan, Kolkata, West Bengal, India
Email: contactfocalyst@gmail.com
