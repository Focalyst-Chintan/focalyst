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
