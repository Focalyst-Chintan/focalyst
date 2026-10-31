# Focalyst phone web · Facelift log

Applies to the phone view of focalyst.online (viewport below 1024 px). Desktop (1024 px and wider) is frozen.
Spec being translated: `MOBILE_DESIGN_FACELIFT.md` (native Expo spec). Web sources that win on conflict: `src/app/globals.css`, `DESKTOP_DESIGN.md`. Onboarding register (`WEB_ONBOARDING_DESIGN.md` section 15) counts as already approved.
Copy checked against the unslop rules (github.com/heydamir/unslop, CC BY 4.0): sentence case, no em dashes, no exclamation marks, short plain words.

This file is the source for the final native spec. The table below is the summary; the entries under it are the detail.

---

## Spec amendments

Grouped by the `MOBILE_DESIGN_FACELIFT.md` section each row changes. Status: **web wins** (a web token or rule replaced the spec value), **amended** (we changed the spec), **gap** (spec was silent, we decided), **native-only**, **web-only**, **kept** (spec value kept on purpose where a web rule could be read as conflicting).

| § | What the spec said | What we do now | Status | Entry |
|---|---|---|---|---|
| **All** | Section 10 describes new layouts, orders and sets of elements per screen | **Reskin, not relayout.** Each phone screen keeps its original structure, section order, content, components and what is shown or hidden. Only the visual layer changes (colours, gradients, glass, glow, type, radii, spacing values, icons, chips, press and motion). Where section 10 describes a different layout, only its visual treatment is taken. Filtering, sorting and conditional rendering of data are logic | Sohan refinement | 016 |
| 10.5, 7.12 | (silent) Full-screen recorder and sheets sit above all chrome | Phone `<main>` uses a fade-in that leaves no transform behind (`animation-fill-mode: backwards`), and the voice recorder renders into `<body>` through a portal, so fixed overlays cover the header and tab bar and anchor to the screen | bug fix | 025 |
| 10.9 | Plan chip under the email, destructive rows grouped last | Original layout restored: plan badge on the avatar's corner (Free / Pro chip), role line under the email, AI connections card without an extra heading, then Delete account (danger button), version lines, Log out (secondary button) in the original order | Sohan refinement | 024 |
| 10.4 | Notes title, pinned grouping, note previews and meta line | Original layout restored: search, filters, New note + mic, list in the loaded order (no pinned grouping, which is sorting); rows show icon, title with the pin mark when pinned, folder for text notes, time · duration for voice notes, as before; "No notes match your search." is plain text again | Sohan refinement | 023 |
| 10.5 | Recorder hero with title on top, transcript card always shown | Original order restored inside the hero card: timer + state label, waveform, status ("Voice note" + status line), live transcript only once there is text | Sohan refinement | 023 |
| 10.11 | Note options sheet with the note title on top | Title line removed (it wasn't there); rows, icons, sheet and swipe stay | Sohan refinement | 023 |
| 10.2 | Focus: title, hero with big planned time, preset row, Customise with steppers, full-width Start | Original layout restored: Pomodoro card (now a hero card) with the title and a small Primary Start at the top right, Duration and Break fields side by side, Sets below, presets as a 2 × 2 grid; no page title. Steppers are not used here: they don't fit two to a row and the fields must stay visible (they were never collapsed) | Sohan refinement | 022 |
| 10.2 | Countdown card: name `title-3`, days, chips | Original order: days and unit on top with the more button, then "31 Oct 2026 · name" below; no Passed / Today chips (they weren't there); section title without a count | Sohan refinement | 022 |
| 10.3 | Mode pill and set dots above the ring | Mode pill and "Set 1 of 4" back in the top bar between back and full screen, as before; no set dots. Ring, glow and controls stay | Sohan refinement | 022 |
| 10.7 | Chat: sparkle tiles, empty-state icon and heading, chips, serif title, working row above composer, quota pill | Matches the mockup on the original structure: header "Ask Focalyst AI" Inter 600 20/26 left (original subtitle kept as a caption), close button, hairline divider; no sparkle tiles or empty-state heading. Suggestions are full-width cards (radius 24, glass, 1 px line, min height 64, gap 12) anchored just above the composer, with the original helper line centred under them. Typing dots back in the message list ("Thinking…"). Composer: dark glass pill, "Ask anything...", mic and send as two 40 circles on the right; send dimmed (not hidden) when empty, gradient with text; faint rim light along its bottom edge. Under the composer: "Focalyst Pro Active" for Pro, the original "N of 5 daily messages used" for free. Error rows show the original message text | Sohan refinement | 021 |
| 10.7 | Sheet background `surface-solid` 90% with blur | Dark navy #060A1A with a glow rising from the bottom (radial 140% × 55% at 50% 108%: rgba(55,129,252,0.85) → rgba(25,81,252,0.70) at 32% → rgba(11,44,177,0.55) at 62% → transparent), softened to 40% once messages exist (450 ms); light mode #F5F8FF with ice-blue stops (#A9C6FF, #CBE9FD, #DCE6FF). Fine grain over it against banding | Sohan refinement | 021 |
| 10.6 | Insights order: hero, strip, stat grid, bars, carousel, report | Original order restored: header, level card, tasks completed, focus time (as the hero with its trend) with the strip under it, productivity score, focus activity bars, active habits (2 × 2 grid, up to 4, as before), habit leaderboard, AI summary (Pro), weekly report, starting report. The best-streak tile and the habit carousel dots I had added are gone | Sohan refinement | 020 |
| 5.3 | Hero: bottom glow band 28% tall | Rim light instead: a 1.5 px gradient border, bright at the bottom edge (dark rgba(111,164,255,0.95), light rgba(55,129,252,0.55)), gone by 45% height, plus an inset 22 px glow and a faint radial wash under the bottom edge. No grid rectangle behind charts | Sohan refinement | 020 |
| 8.1 | Vertical grid lines 1 pt rgba(255,255,255,0.05) | Vertical only, rgba(255,255,255,0.04) dark / rgba(11,44,177,0.05) light; nothing else behind the line | Sohan refinement | 020 |
| 3.3, 9.4 | "41h 54m": units at subhead size | Number and unit tight together (1 px), unit 14 px 500 `ink-2` on the baseline with no tracking, one normal space between "7h" and "7m"; count-up unchanged | Sohan refinement | 020 |
| 7.11 | Week strip: dots above letters, today pill | Every column has the same two slots (28 mark on top, letter below), so all letters sit on one line; today adds the 36 × 56 gradient pill behind both slots (check when done, an open ring when not yet). Uses the same 7 days as the focus chart (last 7 days, today last), titled "Last 7 days" | Sohan refinement | 020 |
| 5.4 | Productivity as highlight tile with "41%" and a line under it | Same content as the original card (icon, score, label, the Pro lock overlay) on the highlight tile; no "/ 100" and no extra line. The score's green / orange / red tier colour can't sit on the blue tile, so it is white | Sohan refinement | 020 |
| 10.1 | Plan: greeting + subhead line, segmented control, sections | Original Plan order restored: greeting, Today/Calendar, then the date block (big day and month, weekday, events link), To-do list, Habits; Calendar inside its card. Greeting in `title-2` serif | Sohan refinement | 019 |
| 10.1 | To-do shows every task | Completed tasks are hidden on screen (display-only; the loaded list and its order are untouched). Count chip shows the pending count. With nothing pending, the original "No tasks yet…" line and the dashed Add task row | Sohan refinement | 019 |
| 7.10 | Task row min height 60, padding 14/16, 2-line title | Min height 56, padding 12/14, gap 8; title one line with ellipsis, priority chip 22 on the same line, tags as a slim `#tag` line only when present; drag handle kept (the original showed it) | Sohan refinement | 019 |
| 7.10 | Habit row: tile · name · streak · check | Original order restored: check (24) · emoji · name (struck through when done) · streak chip "Nd streak" · more; expanded view keeps the original two-column Completion / Average layout | Sohan refinement | 019 |
| 7.6 | Selected segment `grad-primary` with glow inside a glass track | Thumb fills its segment edge to edge (no inset, no ring), track is a subtle tint with no border, glow only 0 4px 12–14px −2px rgba(25,81,252,0.30 light / 0.45 dark) | Sohan refinement | 019 |
| 7.2 | Active tab: 44-high pill behind icon and label, slides | Pill is centred on its tab: same size on every tab (tab width minus 8, height 44), vertically centred with insets (no transform offset), slides by exactly one tab. No focus ring on tap; a ring only for keyboard focus (`:focus-visible`) | bug fix | 018 |
| 2.2 | `canvas` #060A1A dark / #F5F8FF light | Web `--canvas` #05070F / #F4F6FB | web wins | 002 |
| 2.2 | `ink` #F4F7FF / #0A1033, `ink-2` #B7C0D8 / #3D4566 | Web `--ink` #F2F5FF / #0A1022, `--ink-2` #A3ADC8 / #4B5675 | web wins | 002 |
| 2.2 | `ink-3` #7F8AA8 / #5F6787, allowed for captions | Web `--ink-3` #6B7591 / #8A93AB is 4.4:1 dark and 2.8:1 light, so it is used only for placeholders, disabled text and inactive icons. Every caption, meta line and axis label uses `ink-2` | web wins + amended | 002 |
| 2.2 | `line` / `line-strong` tinted #0B2CB1 in light | Web `--line` / `--line-strong` (tinted #03195B) | web wins | 002 |
| 2.2 | `primary-text` dark #6FA2FF | Web `--primary-text` #6FA4FF | web wins | 002 |
| 2.2 | `surface`, `surface-strong`, `surface-solid` | No web equivalent (web `--surface` is opaque, `--frost-bg` is near-opaque). Added as new phone variables with the spec values | kept | 002 |
| 2.3 | danger solid #F43F5E | Web `--danger` #F04438 for solids; spec text colours kept as new variables | web wins | 002 |
| 2.3 | success solid #22C55E | Web legacy `--color-success` (#2E7D52 light / #10B981 dark) for solids; spec text colours kept | web wins | 002 |
| 0.2, 13 | New files under `Focalyst/src/theme` and `src/ui` | Phone-only components live in `src/components/mobile/`; phone CSS in `src/app/mobile.css`, imported once from `globals.css` | web-only | 003 |
| 2.2 | `surface-solid` #0E1430 / #FFFFFF | Web `--surface` #0B1020 / #FFFFFF | web wins | 005 |
| 2.5 | Ambient: two radial glows over canvas, fixed | Same values, one fixed CSS layer (`.m-ambient`) behind the phone shell | kept | 005 |
| 2.6 | Glow on the primary CTA, add button, selected chart point, timer ring; unslop says no glows | Kept as spec says (spec ranks above unslop); dark only, light uses the soft shadow | kept | 006 |
| 4 | Radius scale 8 / 12 / 16 / 24 / 32; desktop uses 10 / 14 / 20 / 28 | Spec scale on the phone. DESKTOP_DESIGN's radii are scoped to desktop (its section 0) | kept | 006 |
| 5.2 | Bars: `surface` fill over real blur | Fill `--m-bar` rgba(13,19,38,0.62) dark / rgba(255,255,255,0.72) light, blur 20 px, saturate 180%. Solid `--surface` where blur is missing or transparency is reduced | amended | 005 |
| 7.3 | Primary is `grad-primary`; desktop primary is flat `--primary` | Spec gradient kept on the phone (blue to blue, brand only) | kept | 006 |
| 7.15 | Shimmer sweep rgba(255,255,255,0.06) | Same in dark; light uses rgba(3,25,91,0.05) (a white sweep is invisible on white) | amended | 005 |
| 9.1 | Durations 120 / 200 / 280 / 450; desktop uses 140 / 220 / 420 | Spec durations on the phone; spring approximated as cubic-bezier(0.32, 1.25, 0.5, 1) | kept + web-only | 006 |
| 3.2 | `overline` uppercase; unslop says sentence case labels | Kept uppercase as spec 3 says (source text stays sentence case) | kept | 006 |
| 7.1 | Wordmark "exactly as now" with 0.35em tracking | Inter 600, 15 px, tracking 0.35em, `ink` (the web header used 18 px bold at 0.2em in a beige bar) | amended | 008 |
| 7.1 | Avatar: photo or initial on `grad-primary` | Same; the initial is the first letter of the account's full name, else the email | gap | 008 |
| 7.2 | Tab icons: lucide, inactive `ink-3` | Lucide `CalendarCheck2`, `Timer`, `NotebookPen`, `ChartColumn` (the desktop sidebar's icons); inactive icon and label use `ink-2` because `ink-3` text fails contrast | web wins | 008 |
| 7.2 | Add button: same action as now | Same action; the plus turns 45° while the add menu is open, and the menu is a glass bar above the tab bar | amended | 008 |
| 7.2 | (silent) | Tab bar hides while the on-screen keyboard is open (slides down 280 ms) | gap | 008 |
| 7.10 | Task row order: checkbox · title + meta · more; drag handle far left | Same. Meta shows the priority chip and tags as `#tag` text. A completed row keeps its meta, title in `ink-2` with strikethrough, row at 70% | amended | 009 |
| 7.10 | Habit row: emoji tile · name · streak chip · check | Emoji tile · name with the streak chip under it · check (32) · more button. The chip moved under the name so the row fits 360 px with the existing menu | amended | 009 |
| 10.1 | Section header has a ghost "Add" on the right as well as the add row | Only the add row at the end of each list (one entry point, no duplicate handler) | amended | 009 |
| 10.1 | Greeting + subhead "Sunday, 25 Oct · No events" | Same; the event count stays a link to the Calendar view as before, and the big "31 Oct" date block is gone | spec as written | 009 |
| 8.4 | Heatmap 0 / some / done = brand-100 / brand-400 / brand-500 | The web heatmap is binary (done or not): empty #CBE9FD light / rgba(203,233,253,0.14) dark, done #1951FC, today ringed in #3781FC. 12 px cells, radius 4 | amended | 009 |
| 7.11 | Today pill shows a check or the date | Same; past days that weren't done show a 1.5 px `line-strong` ring (spec had no missed state) | gap | 009 |
| 10.2 | Big planned time, then "4 sets · 5 min breaks" | Same; singular forms "1 set", "1 min break" | gap | 010 |
| 10.2 | "Customise" expands three steppers | Same. On the free plan the steppers show disabled with a lock and a "Pro" chip next to Customise, as the inputs were disabled before | gap | 010 |
| 7.5 | Steppers: min and max as the current inputs allow | The web inputs had no limits; steppers use 1 to 999 and typing any value still works | gap | 010 |
| 10.2 | Countdown card: name, days, "days left", date, more | Same; "day left" for 1; Passed and Today chips sit on the days row; date as "31 Oct 2026". The old "total days" label meant days left (clamped at 0), so only the words changed | spec as written | 010 |
| 10.2 | Block distractions: blue Switch | Same switch, always off; tapping shows the existing "coming soon" note | web-only | 010 |
| 10.3 | Full-screen timer | The timer stays between the header and the tab bar so the tabs keep working during a session (hiding them would remove a way out) | deviation | 010 |
| 10.3 | Ring 280, 6 stroke, `grad-line`, glow on the head | Ring 280 in portrait (smaller on narrow phones), the whole arc glows in dark mode (drop shadow), digits `timer` 80 scaled with the ring | amended | 010 |
| 10.3 | Set progress as 4 dots + "Set 1 of 4" | Dots for up to 8 sets: done filled `primary-text`, current ringed `brand-400`, rest `surface-strong`; text always shown | gap | 010 |
| 10.3 | Pause Secondary + End Danger, 56 high | Same; while paused the left button reads Resume and turns Primary | amended | 010 |
| 10.6 | Title row with a Week / Month control | Title `title-1` with "Today, 31 Oct" on the right. No Week / Month at the top: the page only loads this week and last week. The existing Weekly / Monthly control stays inside the bar chart card | deviation | 011 |
| 10.6 | Hero: focus time, delta chip, trend chart | Same. The number is the page's existing total, which covers this week and last week (flagged, not changed); the chart shows the last 7 days the card already loads | deviation | 011 |
| 10.6 | "This week" habit strip | Built from the habit completion dates the Plan context already holds (no new query). A day is done when every habit due that day (its repeat days) was done; days with nothing due show as future. The streak chip shows the longest current habit streak | gap | 011 |
| 10.6 | 2 × 2 stat grid: tasks, productivity, sessions, best streak | Tasks completed is a wide tile with a 56 ring; productivity score (highlight tile) and best streak sit below it. Focus sessions is left out: the page doesn't load a session count | deviation | 011 |
| 10.6 | Productivity "41%" | Shown as "41 / 100": the score is points out of 100, not a percentage | amended | 011 |
| 10.6 | Copy "All done this week." | "All done for today." and "Nearly there. 5 tasks to go.": the counts are today's tasks; "No tasks on your list yet." when there are none | amended | 011 |
| 8.2 | Inactive bars `surface-strong`, today `grad-bar` with glow, stacked focus / break | Every day keeps its focus (#3781FC) and break segments so the legend reads; the selected day (today by default) is drawn at full strength with `grad-bar` and glow, the others at 55%. The value of the selected day shows above the chart | amended | 011 |
| 8.5 | Bars grow over 350 ms with a 30 ms stagger | 350 ms grow without the stagger (the chart library animates a series at once); off under reduced motion | web-only | 011 |
| 8.1 | Scrub snaps to each day, returns to the best day after 1.5 s | The chart's own touch tooltip scrubs; the best day keeps its marker the whole time | web-only | 011 |
| 10.6 | Active habit cards with a 7-day dot row | Same, 160 wide, snapping; the dots are 6 tall bars (done `primary`, today ringed) from the Plan context's completion dates | amended | 011 |
| 10.6 | (not in spec) XP level card, group leaderboard, AI summary, starting report | Level card restyled as a glass card with a gradient badge (the orange gradient is gone); the group leaderboard modal keeps its dark podium with gold for ranks; order after the habits carousel | gap | 011 |
| 10.7 | Empty state chips e.g. "Plan my evening", "Which habit am I missing?" | Kept the web's four suggestions ("What should I focus on today?", "Add a task for tomorrow", "How productive was I this week?", "Remind me to review notes at 8pm"); they are sent as messages, so changing them changes what the AI is asked | deviation | 012 |
| 10.7 | Timestamps on long press | Not shown: the web chat keeps no timestamps | web-only | 012 |
| 10.7 | Copy action under each reply | Always visible (it only appeared on hover before, so phones never saw it) | amended | 012 |
| 10.7 | Error text "I couldn't reach Focalyst AI…" | Same text replaces the old "busy" line; "Try again" uses the existing retry | spec as written | 012 |
| 10.7 | Voice mode: glowing top edge with a wave | The web composer has a recording state (timer + Done) instead; restyled as a danger pill | web-only | 012 |
| 10.7 | Quota pill "12 messages left today" | Same, worked out from the count the chat already loads; "Pro" success chip in the header for paid plans | spec as written | 012 |
| 7.12 | Sheet: swipe down or tap the backdrop to close | Same; the drag area is the grabber and header so the message list still scrolls; on tablets (768 to 1023) it stays a right-side panel as before | amended | 012 |
| 10.4 | Filter chips All / Notes / Voice; folders only if the app shows them | The web's five filters (All, Notes, Favourite, Folders, Voice notes) as glass pills | web-only | 013 |
| 10.4 | Pinned notes first under a "Pinned" overline | Same, grouped on screen from the loaded list (no new sorting in the data); the rest sit under "Notes" when anything is pinned | spec as written | 013 |
| 7.10 | Note row: title, 2-line preview, meta (updated, folder, type) | Same, plus a 36 icon tile (document or mic); the pin toggle stays on the row as before | amended | 013 |
| 7.4 | Search: pill with magnifier and clear button | Same; clear empties the field through the existing search handler | spec as written | 013 |
| 10.4 | Note editor title `title-2` serif, body 17/26, glass toolbar | Same on phones. The editor route has no desktop version, so its phone styles are scoped to below 1024 px with `mp-` classes and its copy is unchanged | web-only | 013 |
| 10.5 | Recorder: hero card, "Now recording" pill, timer, waveform, transcript card, controls | Same. The status line reads "Recording in high quality" ("High Accuracy Status" and "Interview Recording" are gone); the gear button stays (it had no action before either) | spec as written | 013 |
| 10.11 | Action menus: native menu or a sheet with 52 rows, icon + label | Note options are a sheet with 52 rows, icons, the note title on top and Delete in danger text; swipe down or tap outside to close; page scroll locked while open. Task and countdown menus stay popovers | amended | 013 |
| 10.8 | Forms: `title-2` title, 7.4 fields, 7.16 pickers, pinned Primary with a gradient fade | The task, habit and countdown form routes have no desktop version, so their phone look comes from `mp-` classes that only apply below 1024 px. Save button sticks 88 above the bottom safe area with glow (no separate fade layer, which would need new markup around it). Copy on these routes is unchanged so a desktop window shows exactly the old page | web-only | 014 |
| 2.4 | Picker offers the 8 new colours | Not changed yet: the colour list is saved with each habit and lives in a route desktop windows can also open. Needs your call | gap | 014 |
| 7.16 | Day picker: 40 circles, "All days" switch | Day buttons restyled as blue-gradient pills when selected; the existing "All days" control is kept as it is | amended | 014 |
| 10.9 | Theme: Light / Dark / System segmented control if the app has a setting | The web has a light/dark switch only, kept as a switch (a System option would be new behaviour) | deviation | 014 |
| 10.9 | Destructive rows last | Log out and Delete my account moved into an "Account" group at the end, in danger text; version lines under it | spec as written | 014 |
| 10.10 | Paywall header in `grad-brand`, glass plan tiles, selected tile 2 px brand-400 + glow | Same; headline "Plan, focus and grow with Pro." replaces "Unlock your full productivity." (unslop: no hype words) | spec as written | 014 |
| 7.13 | Toast: glass pill above the tab bar, 2.4 s | The shared toast keeps its 4 s timer (its logic is shared with desktop); on phones it is a centred pill 88 above the bottom safe area | amended | 014 |
| 7.15 | Skeletons in each screen's final shape | Done inside each phone screen; the route `loading.tsx` files are shared with the desktop shell and stay as they are | web-only | 014 |
| 5.4, 10.10 | White text on `grad-primary` / `grad-brand` | Small white text on blue fills stays at 90% opacity or more (white at 80% on #1951FC is 4.2:1, at 90% it is 5.0:1). Large white text on the light end of `grad-brand` (#3781FC) is kept to the top-left of the card | amended | 015 |
| 7.10 | Done task title in `ink-3` | `ink-2` with strikethrough and the row at 70%, because `ink-3` text fails contrast on the web canvas | web wins | 009 |
| 9.1 | easing cubic-bezier(0.2, 0.8, 0.2, 1) | Web `--ease` cubic-bezier(0.22, 1, 0.36, 1) | web wins | 002 |
| 10 | Screens listed in 10.1 to 10.11 | Web phone has extra screens (Groups, Guides, AI connections, Starting report, XP level card, group leaderboard) that get the same tokens; spec items with no web data are skipped, not invented (see entry 004) | gap | 004 |

---

## Entries

## Entry 001 · Phase W0 · 2026-10-31
Type: web-only
What changed: Scoped every phone change to below the desktop breakpoint.
Why: Desktop is frozen. The app already forks at 1024 px: `(app)/layout.tsx` renders the desktop shell in `hidden lg:contents` and the phone shell in `lg:hidden`, and each tab page picks its desktop or phone tree with `useIsDesktop()` (`min-width: 1024px`).
Exact values: breakpoint 1024 px (Tailwind `lg`). Phone-only files are styled freely. The few files desktop also renders (`focus/CountdownForm.tsx`, `onboarding/PendingCountdownCard.tsx`, `insights/LevelUpModal.tsx`, `PricingSection.tsx`, `desktop/ui/Toast.tsx`, `desktop/ui/Skeleton.tsx`, `desktop/ui/Modal.tsx`) only get `max-lg:` classes or are left as they are. New CSS variables use the `--m-` prefix so no desktop rule can pick them up.
Port to native: no
Native instruction: none; the native app has no desktop layout.

## Entry 002 · Phase W0 · 2026-10-31
Type: deviation
What changed: Mapped the spec tokens to the web CSS variables. Where both define a value, the web value is used.
Why: The brief and spec 2 both say the web tokens win.
Exact values: `canvas` → `--canvas`; `ink`, `ink-2`, `ink-3` → `--ink`, `--ink-2`, `--ink-3`; `line`, `line-strong` → `--line`, `--line-strong`; `primary` → `--primary`; `primary-text` → `--primary-text`; `warning` → `--warning`; `danger` solid → `--danger`; `success` solid → `--color-success`; easing → `--ease`. Added only what is missing: `--m-surface`, `--m-surface-strong`, `--m-surface-solid`, meaning text colours, gradients, glow, ambient layers. Measured contrast: web `ink-3` on canvas is 2.84:1 light and 4.39:1 dark, below the 4.5:1 that spec 11 asks for captions, so captions use `ink-2` (6.73:1 light, 8.98:1 dark).
Port to native: adapt
Native instruction: §2.2: use the web values (canvas #05070F / #F4F6FB, ink #F2F5FF / #0A1022, ink-2 #A3ADC8 / #4B5675, ink-3 #6B7591 / #8A93AB, line rgba(255,255,255,0.06) / rgba(3,25,91,0.08), line-strong rgba(255,255,255,0.12) / rgba(3,25,91,0.14), primary-text #6FA4FF / #1951FC); ink-3 is never used for readable text, captions use ink-2.

## Entry 003 · Phase W0 · 2026-10-31
Type: web-only
What changed: Where the phone building blocks live on the web.
Why: Spec 13.1 names Expo folders.
Exact values: tokens and component classes in `src/app/mobile.css` (imported from `globals.css`); React primitives in `src/components/mobile/` (`ui/` for primitives, `charts/` for chart wrappers on recharts, which is already installed). The Insights last-seen store is its own UI-only file.
Port to native: no
Native instruction: none.

## Entry 004 · Phase W0 · 2026-10-31
Type: deviation
What changed: Screens and spec items that don't line up between the spec and the web phone view.
Why: The brief says not to invent screens or load new data.
Exact values:
- On the web, not in the spec: `/groups` (group leaderboard), `/how-to` guides, `/settings?tab=connections` (AI connections), `/insights/starting-report`, the XP level card and group leaderboard on Insights, the AI summary card for Pro (Insights), `/today` (the desktop home, still reachable on a phone), `/mcp`.
- In the spec, not on the web: the Insights Week / Month control at the top (the web only has Weekly / Monthly inside the activity chart), the "This week" habit strip on Insights and the 7-day dots on habit cards (Insights loads no per-day habit logs), the Focus sessions stat (not loaded), a working distraction-blocking switch (the web shows a "coming soon" note), a separate reminder form (reminders are fields inside the task and habit forms), the chat voice-mode wave (the web composer has a recording state instead).
Port to native: no
Native instruction: none; this records what the web can't show yet.

## Entry 005 · Phase W1 · 2026-10-31
Type: deviation
What changed: Phone tokens and materials added in `src/app/mobile.css` (new `--m-` variables and `m-` classes in the components layer, so Tailwind utilities still win over them).
Why: Spec 2, 3 and 5, translated to CSS.
Exact values: `--m-surface` rgba(255,255,255,0.06) dark / 0.78 light; `--m-surface-strong` rgba(255,255,255,0.10) / #FFFFFF; surface-solid uses the web `--surface`. Meaning text colours: success #4ADE80 / #15803D, warning #FBBF24 / #B45309, danger #FB7185 / #BE123C, info #6FA4FF / #1951FC, neutral #A3ADC2 / #475569. Solids: success #10B981 / #2E7D52 (web legacy), warning #F59E0B, danger #F04438. Blur bars: 20 px blur, 180% saturate, `--m-bar` fill. Glass card: radius 24 (16 for `md`), 1 px `--line`, top highlight 1 px `--line-strong` fading out at 40%. Hero: radius 32, top tint rgba(25,81,252,0.18) to transparent at 55%, bottom glow from 72% (rgba(55,129,252,0.40) then rgba(203,233,253,0.70) at the edge); light: tint rgba(203,233,253,0.6), glow #CBE9FD then #DCE6FF. The ambient layer is mounted once in `(app)/layout.tsx` and page-level backgrounds on Focus, Notes, Insights and Account were removed so it shows through.
Port to native: adapt
Native instruction: §5.2: bar fill under the blur is a dark navy at 62% (rgba(13,19,38,0.62)) or white at 72%, not the 6% card surface, so text under it stays readable. §7.15: light-mode shimmer is rgba(3,25,91,0.05).

## Entry 006 · Phase W1 · 2026-10-31
Type: spec as written
What changed: Where the spec and the web rules disagree on shape, motion and effects, the phone follows the spec.
Why: `DESKTOP_DESIGN.md` scopes its radii, sizes and durations to the desktop (its section 0: desktop = 1024 px and wider). The brand rules that do apply to every size (colours, fonts, `--ease`, no gradient text, one primary per view, copy rules) are kept. Unslop ranks below the spec, so the spec's glow, gradient buttons and uppercase overlines stay.
Exact values: radii 8 / 12 / 16 / 24 / 32 / 9999; durations 120 / 200 / 280 / 450 ms with `--ease`; spring cubic-bezier(0.32, 1.25, 0.5, 1); glow dark 0 6px 20px rgba(25,81,252,0.45), light 0 8px 24px rgba(10,16,51,0.08).
Port to native: yes
Native instruction: §4, §7.3, §9.1: unchanged; use the native spring (damping 18, stiffness 220).

## Entry 007 · Phase W1 · 2026-10-31
Type: web-only
What changed: Phone primitives in `src/components/mobile/ui/`: `MobileAmbient`, `GlassCard`, `HeroCard`, `MButton` (primary, secondary, ghost, danger; loading keeps the width), `MIconButton` (44 px), `Chip` / `StatusChip` / `DeltaChip` / `StreakChip`, `SegmentedControl` (sliding thumb), `MSwitch` (51 × 31), `MCheckbox` (24 and 32), `Stepper`, `AddRow`, `SectionHeader`, `EmptyState`. Text styles are classes: `m-display`, `m-title-1..3`, `m-headline`, `m-body`, `m-callout`, `m-subhead`, `m-footnote`, `m-caption`, `m-overline`, `m-stat-xl/l/m`, `m-timer`. Inputs: `m-input` (52 tall, 16 px text so iOS doesn't zoom), `m-search`, `m-label`.
Why: Spec 7, built once and reused by every phase.
Exact values: press = scale 0.97, opacity 0.92, 120 ms; hover styles only under `@media (hover: hover)`; tap highlight off. Stepper: long press repeats every 120 ms after 400 ms; the value stays a text field so typing still works; buttons call the screen's existing setter. Switch and checkbox get an invisible 44 px hit area.
Port to native: no
Native instruction: none; the native app builds its own `src/ui/`.

## Entry 008 · Phase W2 · 2026-10-31
Type: spec as written
What changed: Phone shell. Header (`src/components/Header.tsx`), floating tab bar (`BottomNav.tsx`), add menu (`QuickAddMenu.tsx`), scroll inset in `(app)/layout.tsx`. UI-only hooks in `src/components/mobile/hooks.ts`.
Why: Spec 7.1, 7.2, 4 (scroll insets).
Exact values:
- Header: 56 + top safe area, transparent until the page scrolls past 8 px, then real blur with a 1 px `line` bottom border (150 ms). Avatar 36 in a 44 hit area, initial on `grad-primary`. Wordmark Inter 600, 15 px, tracking 0.35em. AI button 40 × 40, radius 12, `Sparkles` 20 (light: #CBE9FD fill, #1951FC icon; dark: rgba(203,233,253,0.14) fill, `line-strong` border, #CBE9FD icon), label "Ask Focalyst AI", same `openChat` handler.
- Tab bar: glass pill, height 64, inset 16, bottom = safe area + 8, real blur. Five equal columns. Active tab: 44-high `surface-strong` pill that slides between tabs (280 ms spring curve), icon and label in `ink`; inactive in `ink-2`. Icons 22, stroke 1.75; labels `caption`.
- Add: 52 circle, `grad-primary`, white plus 24, raised 6, glow (dark) or soft shadow (light). Same toggle handler. Plus rotates 45° while the menu is open.
- Add menu: glass bar 88 above the bottom safe area, radius 28, three 48 icon tiles (Task, Session, Note) with captions; backdrop rgba(3,9,30,0.40). Same actions.
- Keyboard: while a text field has focus and the visible height drops by more than 150 px, the tab bar slides down and fades (280 ms).
- Scroll inset: page bottom padding = 64 + 8 + 24 = 96 px + bottom safe area.
Port to native: adapt
Native instruction: §7.2: inactive tab icon and label use ink-2, not ink-3; the Add plus rotates 45° while its menu is open; hide the tab bar while the keyboard is up.

## Entry 009 · Phase W3 · 2026-10-31
Type: spec as written
What changed: Plan tab. `plan/page.tsx` (greeting, subhead, segmented control, loading skeleton), `TodoList`, `HabitList`, `HabitRow`, `TaskMenu` (trigger and popover look), `LoadingSkeleton` / `ErrorCard`, new `WeekStrip` primitive. Copy in `en.json`: "To-do", "Habits", "Add task", "Add habit", "Today", "Calendar"; the Pro banner reads "Welcome to Pro" / "Your Pro plan is active."
Why: Spec 10.1, 7.6, 7.8, 7.10, 7.11.
Exact values:
- Greeting `display` serif 40/44, max 2 lines; subhead `subhead` in `ink-2`, 6 below.
- Segmented control 20 below, 28 above the first section.
- Section header: `overline` in `ink-2` with a neutral count chip (22 tall), 12 above the list.
- Task row: glass, radius 16, min height 60, padding 14 / 16 (8 on the handle side), gap 8 between rows; `GripVertical` 16 in `ink-3`; checkbox 24; title `headline`, 2 lines; priority chip 24 tall (high / medium / low = danger / warning / info with ChevronsUp / ChevronUp / ChevronDown); `MoreHorizontal` 20 in a 44 target.
- Habit row: min height 64; tile 40, radius 12, habit colour at 16% fill and 40% border; emoji 22; streak chip 24 tall ("5 days"); habit check 32. Expanded: overline "Performance breakdown", "N of 365 days", heatmap, two mini stats (`stat-m` over a `caption`).
- Add row: dashed 1.5 px `line-strong`, radius 16, height 52, `Plus` 18 + label in `primary-text`, 8 below the list.
- Menus: glass with blur, radius 16, padding 6, rows 44 tall, radius 10; Delete in danger text.
- Skeletons in the final row shapes; the desktop loading spinner is kept for the desktop.
- Week strip: built now, used on Insights (W5).
Port to native: adapt
Native instruction: §7.10: put the habit streak chip under the name and keep the more button after the check; only the add row adds items (no extra "Add" in the section header).

## Entry 010 · Phase W4 · 2026-10-31
Type: spec as written
What changed: Focus tab and timer. `focus/page.tsx` (title, layout, skeleton; desktop spinner kept), `PomodoroSection` (hero card), `BlockerCard`, `CountdownSection`, `focus/timer/page.tsx` (markup only; the timer engine, saving and wake lock are untouched). New `Ring` primitive and `plainCopy` display helper. Copy in `en.json`: "Focus", "Break", "Sets", "Start focus", "Focus mode is off", "Focus time", "Add countdown", "Loading timer"; new keys "days left", "day left", "Passed", "Break time", "Set {{current}} of {{total}}" (other languages fall back to English for the new keys).
Why: Spec 10.2, 10.3, 7.5, 8.3.
Exact values:
- Title `title-1` "Focus", 20 below.
- Hero card: radius 32, padding 24, faint grid; overline "Pomodoro"; `stat-xl` "25:00"; subhead line; preset pills (height 40, glass, selected `grad-primary`, locked ones show a 14 lock) in a horizontal row that bleeds to the card edge; "Customise" ghost toggle (chevron rotates); steppers inside a `surface-strong` panel, radius 16, hairline dividers, rows 60 tall; Primary "Start focus" full width with a filled `Play` 18.
- Blocking card: glass, padding 16, info icon tile 40 with `ShieldX` 20, `headline` title, `footnote` status, switch.
- Countdown card: glass, radius 24, padding 20, 12 apart; name `title-3`, 2 lines max; `stat-l` days with `subhead` unit; date `footnote` `ink-2`; menu as on Plan.
- Toasts on Focus: glass pill 96 above the bottom safe area, `subhead`; the exclamation mark and emoji in the existing strings are removed at display time ("Well done. Great job.", "Coming soon.").
- Timer: background glow radial rgba(25,81,252,0.35), 150vmin, breathing scale 0.9 to 1 over 4 s (alternate), break rgba(203,233,253,0.20); mode pill 32 tall with an 8 dot; ring 280 / stroke 6; controls 56 tall in two equal columns, gap 12.
Port to native: adapt
Native instruction: §10.3: keep the tab bar reachable during a session; when paused, the left control is a Primary "Resume"; show set dots only up to 8 sets.

## Entry 011 · Phase W5 · 2026-10-31
Type: spec as written
What changed: Insights tab. `insights/page.tsx` (order, skeleton), `ClientFocusInsights` (hero card; takes children between the hero and the bars), `FocusActivityCard` (bar chart), `TasksCompletedCard`, `ProductivityScoreCard` (highlight tile), `CurrentStreaksList` (carousel), `InsightsHeader`, `FocusLevelCard`, `LevelDropdownTimeline`, `LevelTimelineItem`, `LevelProgressBar`, `AISummaryCard`, `WeeklyReportView` and `HabitGroupLeaderboardSection` (token pass, orange removed). New: `mobile/insights/lastSeen.ts` (key `insights:lastSeen:v1`), `AnimatedNumber`, `HabitWeek` (week strip card and best streak tile), `mobile/charts/TrendChart` and `format`. Copy: "Focus time", "Tasks completed", "Productivity score", "Focus by day", "No active habits yet. Add one on Plan to start a streak.", "Focalyst AI analysis", "Level timeline".
Why: Spec 10.6, 8.1 to 8.3, 9.4.
Exact values:
- Order: title, hero, this-week strip, tasks tile, productivity + best streak, focus by day, active habits, level card, groups, AI summary (Pro), weekly report, starting report. Sections 28 apart; cards inside the focus group 12 apart.
- Hero: radius 32, top padding 24; overline; `stat-xl` with "h" and "m" at `subhead` in `ink-2`; delta chip "+12% vs last week"; chart 150 tall, margins 14, stroke 3 `grad-line`, area rgba(55,129,252,0.35) to 0, vertical grid only (`--m-chart-grid`), x labels 12 in `ink-2`, head dot 10 white with a 3 #3781FC ring and a 24 glow; glass tooltip. Empty: dashed baseline, `Timer` 20, "No focus yet this week".
- Count-up: 200 ms ease-out on focus time, tasks completed, productivity score and best streak. Plays from 0 the first time a metric is seen, from the last seen value when it changed, never when it is the same or under reduced motion. Values are stored as `metric:period` in memory and in `insights:lastSeen:v1` when the count finishes. The hero chart draws in (450 ms) under the same rule. Screen readers get the final value from the start.
- Tiles: tasks tile glass radius 16, padding 16, min height 104, ring 56 / stroke 6; productivity and best streak min height 132. Locked productivity tile: blurred number, lock, "Pro feature", white "See Pro" pill (same paywall link).
- Bars: 28 wide, top radius 8 on the top segment, 6 tall `surface-strong` stub for empty days; legend dots 8.
- Carousel cards 160 wide, radius 16, padding 16, snap to the 20 gutter.
Port to native: adapt
Native instruction: §10.6: show productivity as "N / 100"; task copy refers to today; drop Week / Month at the top until the app loads monthly data; keep all bars stacked and lead with the selected day.

## Entry 012 · Phase W6 · 2026-10-31
Type: spec as written
What changed: AI chat (`src/components/chat/ChatUI.tsx`, markup only; sending, streaming, retry, quota and voice code untouched). New `.m-sheet`, `.m-grabber`, `.m-backdrop`, `.m-dots` classes and the `useSwipeToClose` hook.
Why: Spec 10.7, 7.12.
Exact values:
- Sheet: full height minus the top safe area and 8, top radius 32, `--surface` at 90% with 24 px blur (solid when transparency is reduced), slides up 450 ms; backdrop rgba(3,9,30,0.55); grabber 36 × 5 `line-strong`; drag past 110 px closes, otherwise it springs back. Above the header and tab bar (z 70).
- Header: 28 tile with `Sparkles` 16 (AI colours), `title-2` "Ask Focalyst AI", success "Pro" chip for paid plans, 44 close button.
- Empty state: 64 tile with glow, `title-3` "What should we look at today?", one `footnote` line, suggestion pills (glass, wrap).
- User bubble: `grad-primary`, white `body`, radius 20 with 6 bottom-right, max 80%. Assistant: no bubble, `body` in `ink`, 24 tile on the first reply of a group, copy button 44 × 36 under it.
- Working row above the composer: three 6 px dots pulsing 1.2 s (staggered 150 ms), "Thinking…" before the first words, "Writing…" while streaming.
- Error: 24 danger tile with `AlertCircle`, `body` text, "Try again" pill.
- Composer: blur pill, min height 56, mic 44, input 16 px, send 40 `grad-primary` circle (40% when empty), `ArrowUp` 20. Quota pill 28 tall above it.
- Limit reached: "You have used today's Focalyst AI messages." / "Pro gives you more each day." / Primary "See Pro" (same paywall route).
Port to native: adapt
Native instruction: §10.7: keep the copy button always visible; drag only from the grabber and header; show "Pro" as a success chip in the header.

## Entry 013 · Phase W7 · 2026-10-31
Type: spec as written
What changed: Notes tab, note editor, voice recorder. `notes/page.tsx` (title, search, filters, actions), `NotesList` (skeleton, empty states, pinned grouping, load more), `NoteRow`, `FolderGroup`, `NoteOptionsMenu` (sheet), `FolderModal`, `NoteEditor` (phone-scoped `mp-` classes only), `VoiceRecordingOverlay`, the loading states of `notes/new` and `notes/edit`. New: `useBodyScrollLock`, phone override classes (`mp-*`) in `mobile.css`. Copy: "Search notes", "New note", "Untitled", "Add to favourites", "Add to folder", "Existing folders", "Or create a new one", "No notes yet" / "Tap New note to capture your first thought.", "Nothing found" / "No notes match your search.", "Loading", recorder lines.
Why: Spec 10.4, 10.5, 7.10, 7.12, 10.11.
Exact values:
- Notes: `title-1`, search pill 44 tall, 16 below; filters 40 tall with 16 above and below; Primary "New note" (lock icon when the free limit is reached) next to a 52 round mic button (`surface-strong`, `line-strong` border).
- Note row: glass radius 16, padding 14 / 16, gap 8; tile 36; title `headline`; preview `footnote` 2 lines; meta `caption` ("10:42 am" today, else "31 Oct"); voice duration chip 24; pin and more buttons 44.
- Empty states per spec 7.14 (64 tile, `title-3`, one `body` line).
- Editor (phones only): top bar and toolbar blur with `line` border; title 26/30 serif; body 17/26 `ink`; icon buttons 44; voice tabs 40 pills, selected `grad-primary`; floating mic and save status sit 88 above the bottom safe area so they clear the tab bar.
- Recorder: canvas + ambient, header pill 32 tall with a pulsing (1 s) danger dot; hero radius 32 with `title-2`, `stat-xl` timer, 24 bars coloured #3781FC to #CBE9FD with glow in dark mode; transcript glass card with a "Live" info chip; controls: Discard 48 danger tint, Stop 72 danger with a red glow, Pause 48 secondary, all labelled.
Port to native: adapt
Native instruction: §10.4: keep the pin button on the note row; §10.11: the note options sheet shows the note title above its rows; §10.5: drop the settings gear if it still does nothing.

## Entry 014 · Phase W8 · 2026-10-31
Type: spec as written
What changed: Forms (`plan/new-task`, `plan/new-habit`, `plan/edit-task`, `plan/edit-habit`, `focus/countdown/new`, `focus/countdown/edit`, `focus/CountdownForm`) via phone-only `mp-` classes; `CalendarView`; Account / Settings (`account/page.tsx`, `DarkModeToggle`, the phone AI connections page); `Paywall`; the shared toast (`desktop/ui/Toast.tsx`, phone-only classes added, desktop look unchanged). Copy: "Profile", "Dark mode", "Edit profile", "Your plan", "Manage plan", "Focalyst version 1", "No name yet", paywall lines ("Pro yearly", "Pro monthly", "Everything in Free, plus the Pro tools.", "Lifetime", "Pay once and keep Pro for good.", "7 days free, then … a month", "Nothing to pay today. Cancel anytime.", "Start free trial", "Buy lifetime", "Choose yearly", "Continue with Free", "Restore purchase").
Why: Spec 10.8 to 10.11, 7.13, 7.16.
Exact values:
- Forms: page transparent over the ambient; top bar blur; title 26/30 serif; labels `footnote` `ink-2` in sentence case styling; inputs 52 tall, radius 12, 16 px text; choice pills 40 tall, selected `grad-primary`; icon tiles 52, radius 12, selected 2 px #3781FC; colour swatches 36, selected ring 2 px `ink` with a 2 px gap; switches `primary` when on; Save 52 pill `grad-primary` with glow, sticky.
- Calendar: selected day `grad-primary` with glow, today `primary-soft`; inputs 16 px; add and save buttons as Primary; reminder dialogs as solid sheets radius 28.
- Account: back button 44; `title-1` "Profile"; avatar 72 (initial on `grad-primary`); name `title-2`, email `subhead` `ink-2`, plan and role chips; plan card `grad-brand`, radius 24, white "Manage plan" / "Upgrade to Pro" button (same handler); groups as glass lists, rows 56 with 36 icon tiles, overline section labels; switches 51 × 31; delete dialog as a sheet with a danger button.
- Paywall: canvas + ambient; `grad-brand` hero radius 32 with `display` headline; Monthly / Yearly segmented control; plan tiles glass, selected 2 px #3781FC + glow; prices `stat-l`; sticky glass footer radius 32 with Primary CTA and two ghost links. Every checkout, restore and skip handler and every condition is unchanged.
Port to native: adapt
Native instruction: §10.9: group Log out and Delete account at the end in danger text; §10.10: paywall headline without "Unlock"; §2.4: confirm the new habit palette before changing the picker.

## Entry 015 · Phase W9 · 2026-10-31
Type: deviation
What changed: QA pass against spec 14, done by reading the code and the built CSS (no dev server or browser, as the brief asks). Fixes made in this pass: small white text on blue fills raised to 90% opacity; Calendar month arrows raised to 44; the last copy with exclamation marks or "..." on phone screens ("Copied", "Profile saved", "Saving", "Writing your weekly report", "Preparing your weekly report", "Nearly there.").
Why: Spec 11 and 14.
Exact values / results:
- Desktop: every changed file was checked. Files that render on desktop either fork before the phone markup (`useIsDesktop`, `lg:hidden`) or only gained `mp-` classes and aria attributes; a script stripped the `mp-` classes from those files and compared them with the pre-facelift commit: identical. The only edit to `globals.css` is the `@import` of `mobile.css`, whose rules are new `--m-` variables, new `m-` classes and media-scoped `mp-` rules below 1024 px. None of the 28 changed copy keys is used by a desktop component.
- Orange as an accent: none left on phone screens. Kept on purpose: user data colours (habit and calendar category colours, stored countdown colours) and the gold ranks in the group leaderboard.
- Type: serif only on titles, greetings, countdown names and sheet titles; numbers tabular.
- Copy: no em dashes or exclamation marks on phone screens. Two strings built inside protected handlers ("Coming soon!", "Well done! Great job. 🎉") are cleaned at display time by `plainCopy`. The copied weekly-report text keeps its separator (it is clipboard content, not UI).
- Contrast: ink-2 on canvas 6.7:1 (light) / 9.0:1 (dark); ink-2 on the light hero tint 6.3:1; on the dark hero 7.5:1; warning text 5.0:1, danger text 6.3:1 on white; white on #1951FC 5.8:1. `ink-3` is only used for placeholders and the drag handle.
- Inputs: every phone input, select and textarea is 16 px or larger.
- Touch targets: 44 or larger everywhere on the phone screens, except the 40 send button and the 40 "Done" pill inside the 56 composer (spec values).
- Charts: 0 data points shows the empty state (dashed baseline, Timer icon, "No focus yet this week"); bars draw 6 px stubs for empty days and the y scale never divides by zero; 1 point draws a single peak with the best-day marker; 7 points draw the full week.
- Count-up: plays on first view and on change only, never under reduced motion; stored in `insights:lastSeen:v1`.
- Handlers: every removed `onClick` / `onChange` line has an unchanged counterpart (same function, or the setter passed straight through to `Stepper` / `SegmentedControl` / `MSwitch`). New handlers are UI only: clear search (calls the existing search handler with ""), Customise toggle, bar selection, sheet drag.
- Checks: `tsc` clean, no new lint errors in any touched file (the repo has 379 lint errors from before; touched files keep their old counts), `next build` passes, protected-code grep shows only: `Array.from` (matches `.from(`), the `useEffect` in the new UI-only files (`mobile/hooks.ts` scroll lock, `AnimatedNumber`), `localStorage` in `mobile/insights/lastSeen.ts`, and the account back button whose `router.back()` line changed only its class.
Port to native: adapt
Native instruction: §11: keep white text on blue fills at 90% opacity or more; §14: add a check that ink-3 is never used for readable text.

### Things found that are outside a visual pass (not changed)
- Insights hero number is the page's existing total, which adds this week and last week together (`ClientFocusInsights` sums both weeks). The chart shows the last 7 days.
- The Pro "Focalyst AI analysis" card on Insights shows fixed sample text, not the user's data.
- The plan card on Account shows a fixed "Renewal Date: Dec 12, 2026" for every paid plan.
- `NotesList` calls `useRef` / `useEffect` after early returns (rules of hooks); it works today but can break when the list switches between loading, empty and filled.
- `SeamlessRadialTimerDial.tsx` and `insights/FocusTimeCard.tsx` are no longer used by any screen.
- The habit colour picker still offers the old palette (spec 2.4); changing it changes the values saved with new habits, so it needs your call.

---

## Sohan refinements

## Entry 016 · Correction round 1 · 2026-10-31
Type: Sohan refinement
What changed: New rule for this round and every later phase: reskin, not relayout. Every phone screen and shared phone component touched since base commit 3332763 gets its original JSX structure, section order, content and show/hide logic back, and only the visual styling is re-applied on top. New tokens and UI primitives stay where they are used purely for styling. Desktop stays as it is.
Why: The earlier phases redesigned screens; the brief was to apply the design language to the existing layouts.
Exact values: base commit 3332763 ("fix(guides): category chips wrap on phones"). Compare with `git diff 3332763 -- <path>` and `git show 3332763:<path>`.
Port to native: yes
Native instruction: All of §10: keep each existing native screen's layout, order and elements; take only the visual treatment from the spec.

## Entry 017 · Correction round 1 · 2026-10-31
Type: bug fix
What changed: Notes crashed with "Minified React error #310" (more hooks than the previous render). `NotesList` called `useRef` and `useEffect` below its loading, error and empty early returns, so the first full render after loading added two hooks. Both now sit above every early return; nothing else changed. The same pattern was found and fixed in two other files changed since the base: `account/page.tsx` (`if (isDesktop) return <DesktopSettingsView />` above eight `useState` calls and two effects) and `focus/timer/page.tsx` (`if (isDesktop === true) return null` above the timer's state, refs and effects); both early returns moved below the last hook, unchanged. Those two crash only in a desktop-width window, where `isDesktop` goes from null to true.
Why: The pattern existed before the facelift; the earlier lint check compared error counts per file, so a pre-existing rules-of-hooks error was not flagged.
Exact values: rules-of-hooks violations in `src`: 3 files before, 0 after. Every push now runs ESLint with `react-hooks/rules-of-hooks` as an error on all files changed since the base, and the count must be 0.
Port to native: yes
Native instruction: Native lesson: keep every hook (useState, useEffect, useFocusEffect, useRef, custom hooks) above all early returns in every screen and component; lint with react-hooks/rules-of-hooks as an error before every build.

## Entry 018 · Correction round 1 · 2026-10-31
Type: bug fix
What changed: Floating tab bar active pill sat up and to the left of the icon and label, and a second outlined ring showed on Insights.
Why: The pill had both Tailwind's `-translate-y-1/2` (the CSS `translate` property) and an inline `transform: translate(x, -50%)`, so it moved up twice. The extra ring was the browser focus outline left on the tapped link.
Exact values: pill `inset-y-0 my-auto`, height 44, left 10 px, width = (bar inner width − 12) / 5 − 8, `translateX(i × (100% + 8px))`, 280 ms spring curve; tab links get `mx-1` so they match the pill; `.m-press:focus { outline: none }`, ring only on `:focus-visible` (2 px canvas gap, 4 px `--ring`).
Port to native: yes
Native instruction: §7.2: centre the active pill on its tab with equal insets (tab width − 8, height 44); never show a focus outline after a tap.

## Entry 019 · Correction round 1 · 2026-10-31
Type: Sohan refinement
What changed: Plan tab reskinned on its original layout (base 3332763). `plan/page.tsx`: greeting, Today/Calendar control, date block with the events link, To-do, Habits, Calendar in a card (the subhead line I had added is gone). `TodoList`: original header, list and add button positions; completed tasks hidden; pending count chip. `HabitList`: original header without a count. `HabitRow`: original order and expanded layout. `TaskMenu`: trigger keeps a 44 target but takes no extra row height (−8 vertical margin). Segmented control restyled (all uses: Plan, Focus by day, paywall).
Why: Reskin, not relayout (entry 016); rows were too tall, habits sat too far down, completed tasks crowded the list, the count showed 100.
Exact values:
- Completed tasks: the base commit listed them (struck through) in the to-do list. They are now hidden by a display-only filter: every row is still rendered with `hidden` when `is_completed`, so the drag and touch reorder (which counts `[data-task-row]` elements by position) keeps matching the loaded `tasks` array. No query changed.
- Count chip: pending tasks (`!is_completed`). The base had no count chip.
- Rows: min height 56, padding 12 / 14 (10 on the handle side), gap 8, checkbox 24, title `callout` 600 one line, priority chip 22 tall (the base had no priority chip; added on request), tags `caption` in `primary-text`.
- Habit row: min height 56, same paddings, streak chip 24 tall.
- Date block: day 42 Inter 600 tabular, month 42 Inter 300 in `ink-2`, weekday `footnote`.
- Segmented control: height 40, track `--m-seg-track` (rgba(3,25,91,0.06) light / rgba(255,255,255,0.06) dark), no border, thumb `grad-primary` edge to edge.
Port to native: adapt
Native instruction: §10.1: keep the existing Plan order and the big date block; hide completed tasks from the to-do list on screen only; rows 56 min height with one-line titles. §7.6: segmented thumb fills the segment edge to edge with a soft glow, no ring.

## Entry 020 · Correction round 1 · 2026-10-31
Type: Sohan refinement
What changed: Insights reskinned on its original arrangement (base 3332763). `insights/page.tsx` order restored with the level card at the top. `ClientFocusInsights`: focus time card (hero) → this-week strip → productivity score → focus activity, as in the base (focus time and productivity used to share a row; the hero now takes the full width and productivity follows it). `TasksCompletedCard`: original title / line / count / ring layout (ring 96). `ProductivityScoreCard`: original content. `CurrentStreaksList`: original 2-column grid of up to 4 cards with "N total days". `HabitGroupLeaderboardSection`: sentence case ("Habit leaderboard", "Invite code", "Create group", "Copy code", "Leave group", "Habit group standings", "Join a habit group", "Join group", "6-character invite code", "Active habit" as display text only; the `'Active Habit'` value the code compares against is unchanged).
Why: Reskin, not relayout (entry 016) and the fixes Sohan listed for the hero, the number and the strip.
Exact values: see the table rows for 5.3, 8.1, 3.3 / 9.4, 7.11, 5.4. Hero padding 20 / 20 / 12; number `stat-xl`; delta chip 8 below.
XP bar finding: the bar width is `progress` from `getLevelFromXP`, unchanged since the base: (total XP − this level's start) / (next level's start − this level's start). At 2558 XP in Level 6 (2500 to 4000) that is 58 / 1500 = 3.9%, so the bar is about 4% full while the text reads "2558 XP of 4000 XP". The base commit behaved the same way (same value, and its text read "2558 XP / 4000 XP base"). XP logic is not changed; the text could say "58 of 1,500 XP into Level 6" if you want the two to agree.
Port to native: adapt
Native instruction: §10.6: keep the existing Insights order with the level card first; §5.3: replace the hero's bottom glow band with a bottom rim light; §7.11: keep the letters on one line, today's pill wraps both slots; §3.3: units tight to the number with one space between "7h" and "7m".

## Entry 021 · Correction round 1 · 2026-10-31
Type: Sohan refinement
What changed: AI chat rebuilt to the mockup on the original ChatUI structure (base 3332763): header, chat area (suggestions + helper line, or messages + typing dots), input area (limit banner, notice, limit-reached block or the form, then the quota line). Removed the sparkle tiles, the empty-state icon and heading, the working row above the composer and the quota pill. Restored the original sheet height (85% of the screen), the error text, "Upgrade to Pro for more" / "Upgrade now", "Transcribing speech", the quota line, and the copy text for the limit banner. Sending, streaming, voice, retry and quota code are untouched.
Why: Reskin, not relayout (entry 016) and the mockup.
Exact values: header 20/26 Inter 600, tracking −0.01em, 1 px `line` divider; cards `--m-chat-card` rgba(255,255,255,0.07) dark / 0.72 light, 16 px blur, padding 12 / 20, text `callout`; composer min height 56, `--m-chat-composer` rgba(10,16,40,0.62) dark / rgba(255,255,255,0.82) light, 1 px `line-strong`, 20 px blur, rim inset 0 −1 px rgba(111,164,255,0.55) plus a soft shadow of the same colour; buttons 40; Pro line `caption` `ink-2`.
Port to native: adapt
Native instruction: §10.7: no sparkle tiles; header in Inter 600 with a hairline; suggestions as stacked full-width glass cards above the composer; glow rising from the bottom, 40% once there are messages; mic and send on the right; "Focalyst Pro Active" under the composer for Pro.

## Entry 022 · Correction round 1 · 2026-10-31
Type: Sohan refinement
What changed: Focus tab and timer reskinned on their original layouts (base 3332763). `focus/page.tsx` (no title, original spacing), `PomodoroSection` (original header, fields and preset grid; the Customise toggle and its UI state are gone), `CountdownSection` (original card order and date line; no chips, no count), `focus/timer/page.tsx` (mode pill and set text back in the top bar).
Why: Reskin, not relayout (entry 016).
Exact values: Pomodoro card radius 32, padding 20; Start `m-btn-sm` 40 tall; fields `m-input` 52 tall, 16 px text, lock 14 inside the right edge for free plans; preset pills 40 tall in a 2-column grid, gap 10; countdown days `stat-l`, unit `subhead` `ink-2`, date line `footnote` with the name in `ink`; timer top bar pill 32 tall (28 in landscape).
Port to native: adapt
Native instruction: §10.2 / §10.3: keep the existing Focus and timer layouts; take only the hero material, pill presets, ring and colours from the spec.

## Entry 023 · Correction round 1 · 2026-10-31
Type: Sohan refinement
What changed: Notes reskinned on its original layout (base 3332763). `notes/page.tsx` (no title), `NotesList` (no pinned grouping, plain search-empty text), `NoteRow` (original content: icon, title + pin mark, folder or voice meta, pin and more buttons), `NoteOptionsMenu` (no title line), `VoiceRecordingOverlay` (original order of timer, waveform, status, transcript).
Why: Reskin, not relayout (entry 016). Grouping pinned notes first was a sort, which counts as logic.
Exact values: note row glass radius 16, padding 12 / 16, icon tile 36 (info tint for voice, `primary-text` icon for text), title `callout` 600 one line, folder `overline` `ink-2`, voice meta `caption`; recorder hero radius 32, padding 24, gap 24 between the four blocks.
Port to native: adapt
Native instruction: §10.4: keep the existing note list order and row content; §10.5: keep the recorder's existing order, only the hero material, waveform colours and controls change.

## Entry 024 · Correction round 1 · 2026-10-31
Type: Sohan refinement
What changed: Account / Settings reskinned on its original layout (base 3332763): plan badge back on the avatar, role line back under the email, the "AI" and "Account" headings I had added are gone, Delete account / version / Log out back in their original order. Header title `title-3` instead of `title-1` so it keeps the original weight in the bar. Paywall, forms and calendar were checked against the base: they keep their original order and elements (only materials, type and copy changed), so they are unchanged in this round.
Why: Reskin, not relayout (entry 016).
Exact values: avatar badge chip 22 tall, 11 px 600, on `--surface`; Delete account `m-btn-danger` full width, 40 above; Log out `m-btn-secondary` full width.
Port to native: adapt
Native instruction: §10.9: keep the existing profile order and the plan badge on the avatar.

## Entry 025 · Correction round 1 · 2026-10-31
Type: bug fix
What changed: While recording a voice note, the Discard / Stop / Pause controls were hidden behind the floating tab bar, and the app header showed over the recorder.
Why: The phone `<main>` used `.page-fade-in` (fill mode `forwards`), which leaves `transform: translateY(0)` on it after the animation. A transformed element becomes the containing block and stacking context for `position: fixed` children, so the recorder's z-index 100 only counted inside `<main>`; the header (z 60) and tab bar (z 40) painted over it, and its bottom edge sat at the end of `<main>` rather than the screen. The base commit had the same cause. The same trap affected every other fixed overlay inside the page (note options sheet, folder and delete dialogs, leaderboard and calendar modals).
Exact values: phone `<main>` now uses `.m-page-in` (same `pageFadeIn` 0.25 s ease-out, fill mode `backwards`; `.page-fade-in` itself is unchanged and is no longer used anywhere). `VoiceRecordingOverlay` renders through `createPortal(…, document.body)`. No recording logic changed.
Port to native: yes
Native instruction: §10.5 / §7.12: present the voice recorder and sheets above the tab bar and header (full-screen modal), never inside the tab's scroll view.
