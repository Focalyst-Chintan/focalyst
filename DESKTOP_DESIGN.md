# FOCALYST DESKTOP DESIGN SPEC
Source of truth for the desktop version of focalyst.online (Next.js app in `focalyst-main`, hosted on Vercel).
Implement phase by phase (section 10). Do not deviate from this spec without asking the owner.

---

## 0. GROUND RULES
- Desktop = viewport >= 1024px (Tailwind `lg`). Below `lg`, the current mobile UI must render exactly as it does today.
- Shell chrome (sidebar, top bar) is shown with CSS only: `hidden lg:flex`. The mobile bottom nav gets `lg:hidden`. Never choose chrome layout in JS.
- For pages whose desktop layout is completely different (Today, Plan, Focus, Notes, Insights, Groups), use `useIsDesktop()` (section 9). It returns `null` until mounted; while null, render the page's existing loading skeleton.
- Shared components: add `lg:` variants only. Never change the base (mobile) classes.
- Leave legacy Tailwind tokens (navy #4A6C8C, accent #FF751F, card-bg, page-bg) untouched. Desktop uses ONLY the new tokens in section 2.
- The Capacitor build (`output: 'export'` when isMobile) must keep working. The landing page at `/` must redirect to `/login` (or the app home if signed in) when `isCapacitorReady()` is true.
- Reuse existing hooks, Supabase queries and data logic. This is a presentation rebuild plus the listed bug fixes, not a backend rewrite.
- Every screen ships in light AND dark. No hardcoded `bg-white`, `text-navy` or hex values inside components. Tokens only.
- Stack: Next 16 App Router, React 19, Tailwind v4, lucide-react, recharts, @tiptap/react (already installed).
- Allowed new deps: `next-themes`, `cmdk`, `@tiptap/starter-kit`, `@tiptap/extension-task-list`, `@tiptap/extension-task-item`, `@tiptap/extension-placeholder`. Nothing else without asking.
- If the app already has a theme context, extend it. Do not create a second theme system.
- Work efficiently: never re-open a file range you have already viewed in the same task. Read only the files the current phase needs.
- Wherever this spec says "white" (text, buttons, overlays), implement it with the `snow` token, never the `white` utility (see Codebase facts).

### Codebase facts (from the audit, Oct 2026). These override anything below that contradicts them.
- The login page lives at `src/app/(auth)/login/page.tsx`.
- `next-themes` is already installed and wired: `src/components/ThemeProvider.tsx` (attribute="class", defaultTheme="system", enableSystem) wraps `src/app/layout.tsx`, and `src/components/profile/DarkModeToggle.tsx` uses `useTheme()`. Reuse these. Do not add a second provider.
- `@custom-variant dark (&:where(.dark, .dark *));` already exists in globals.css. Do not add it again.
- Inter is already loaded in `src/app/layout.tsx` with `variable: "--font-inter-var"` and applied to body. Do not load Inter again. Only add Instrument Serif.
- globals.css already has an `@theme inline` block with legacy tokens: white, navy, navy-dark, navy-darker, accent, accent-dark, accent-light, blue-muted, card-bg, card-border, page-bg, success, success-light, error, error-light. Leave them untouched. Add the new tokens in a SEPARATE block. Reuse the existing `success` token; do not redefine it.
- CRITICAL: the legacy `--color-white` is remapped to #1E293B in dark mode, so `bg-white` / `text-white` / `border-white` are NOT white in dark mode. Desktop code must never use the `white` colour utilities. Use `snow` (pure #FFFFFF in both themes) instead: `text-snow`, `bg-snow`, `bg-snow/10`, `border-snow/20`.
- `src/lib/utils/date.ts` already exports `localDateStr`, `parseYMDToLocalNoon` and `addDaysYMD`. Reuse them. Do not recreate.
- `src/app/(app)/layout.tsx` sets `paddingBottom: calc(80px + env(safe-area-inset-bottom))` as an inline style on `<main>`. Inline styles cannot be overridden by `lg:` classes, so in Phase 3 convert it to classes: `pb-[calc(80px+env(safe-area-inset-bottom))] lg:pb-0`.
- Existing code to REUSE (wrap or add `lg:` variants; do not rewrite the logic):
  - AI panel: `src/components/chat/ChatUI.tsx`, `src/components/chat/AIChatOverlay.tsx`
  - Timer: `src/components/focus/SeamlessRadialTimerDial.tsx`
  - Groups: `src/components/insights/HabitGroupLeaderboardSection.tsx` + `src/lib/services/habitGroupService.ts`
  - Notes: existing TipTap setup in `src/components/notes/NoteEditor.tsx` + `EditorToolbar.tsx`, `src/hooks/useNotes.ts`
  - Plan: `src/context/PlanContext.tsx`, the recurrence engine in `src/components/plan/CalendarView.tsx`
  - Insights: `src/components/insights/*` cards, `src/lib/utils/insights.ts`, `src/lib/utils/levels.ts`
- Already installed: next-themes, @tiptap/starter-kit, @tiptap/extension-task-list, @tiptap/extension-task-item. Missing (install in their phase): cmdk (Phase 2), @tiptap/extension-placeholder (Phase 4).
- Supabase tables: users, tasks, habits, habit_logs, reminders, daily_focus_activity, pomodoro_sessions, countdowns, notes, folders, habit_groups, habit_group_members, weekly_reports.
- Many existing components hardcode dark hexes (#0B1021, #151B2E, #222A41) and `bg-white`. Do not change their mobile classes. Desktop versions use the new tokens.

### Assets provided by the owner
- `public/landing/hero.png`: landing hero background (no text baked in).
- `public/landing/app-preview.png`: screenshot of /today (added after Phase 4; use a frost placeholder until it exists).
- Kit waitlist form ID: `10065151` (see 7.9). No API key or env vars are needed.

---

## 1. DESIGN DIRECTION
Calm, cinematic, Apple-grade. Three visual layers:
1. AMBIENT: slow-drifting blurred brand-blue blobs plus fine grain, fixed behind everything.
2. CHROME (liquid glass): sidebar, top bar, command palette, AI panel, modals, popovers, toasts.
3. CONTENT (frost): near-opaque cards with hairline borders. No backdrop-filter on content cards.

Max 3 backdrop-filter layers visible at once (sidebar, top bar, one overlay).

### Anti "vibe-coded" rules
- No emoji in UI chrome (user-picked habit icons are fine).
- No gradient text, except the italic accent word in the landing hero if desired.
- Brand palette only. No purple, teal or random accent colours.
- One primary (blue filled) button per view.
- Radii, shadows and spacing come from tokens only. No ad-hoc `shadow-xl` or `rounded-3xl`.
- Real empty states (one serif line + one short sentence + one action). Skeleton loaders, never spinners for page loads.
- Numbers use `tabular-nums`.
- Body text left-aligned. Centered text only in the hero, empty states and the Focus timer.
- Every clickable element has hover, active and focus-visible states.
- Icons: lucide-react, strokeWidth 1.75, 18px in nav, 16px inline.
- Copy: sentence case, short, no exclamation marks, no em dashes.

---

## 2. TOKENS
Brand ramp: #03195B (blue-900), #0B2CB1 (blue-800), #1951FC (blue-600, primary), #3781FC (blue-500), #CBE9FD (blue-100). Plus ink black #05070F and white.

Add to `src/app/globals.css` as a SEPARATE block after the existing tokens. Do not edit the legacy `@theme inline` block, and do not re-add `@custom-variant dark` (it already exists):

```css
:root {
  --canvas: #F4F6FB;
  --surface: #FFFFFF;
  --surface-2: #F1F4FA;
  --surface-3: #E7ECF5;
  --line: rgba(3, 25, 91, 0.08);
  --line-strong: rgba(3, 25, 91, 0.14);
  --ink: #0A1022;
  --ink-2: #4B5675;
  --ink-3: #8A93AB;
  --primary: #1951FC;          /* filled buttons, both themes */
  --primary-hover: #0B2CB1;
  --primary-text: #1951FC;     /* links, active icons, highlighted names */
  --primary-soft: rgba(25, 81, 252, 0.10);
  --ring: #3781FC;
  --warning: #F59E0B;
  --danger: #F04438;
  --glass-bg: rgba(255, 255, 255, 0.62);
  --glass-bg-strong: rgba(255, 255, 255, 0.80);
  --glass-border: rgba(255, 255, 255, 0.75);
  --glass-highlight: rgba(255, 255, 255, 0.90);
  --frost-bg: rgba(255, 255, 255, 0.88);
  --shadow-1: 0 1px 2px rgba(3, 25, 91, 0.06), 0 1px 1px rgba(3, 25, 91, 0.04);
  --shadow-2: 0 10px 30px -12px rgba(3, 25, 91, 0.18);
  --shadow-glass: 0 20px 50px -20px rgba(3, 25, 91, 0.25);
  --blob-1: #CBE9FD;
  --blob-2: #3781FC;
  --blob-3: #1951FC;
  --blob-opacity: 0.30;
  --ease: cubic-bezier(0.22, 1, 0.36, 1);
}

.dark {
  --canvas: #05070F;
  --surface: #0B1020;
  --surface-2: #111830;
  --surface-3: #18213D;
  --line: rgba(255, 255, 255, 0.06);
  --line-strong: rgba(255, 255, 255, 0.12);
  --ink: #F2F5FF;
  --ink-2: #A3ADC8;
  --ink-3: #6B7591;
  --primary: #1951FC;
  --primary-hover: #2F66FF;
  --primary-text: #6FA4FF;
  --primary-soft: rgba(55, 129, 252, 0.14);
  --ring: #5B9BFF;
  --glass-bg: rgba(15, 22, 44, 0.55);
  --glass-bg-strong: rgba(12, 18, 36, 0.74);
  --glass-border: rgba(255, 255, 255, 0.08);
  --glass-highlight: rgba(255, 255, 255, 0.10);
  --frost-bg: rgba(13, 19, 38, 0.86);
  --shadow-1: 0 1px 2px rgba(0, 0, 0, 0.40);
  --shadow-2: 0 10px 30px -12px rgba(0, 0, 0, 0.60);
  --shadow-glass: 0 24px 60px -20px rgba(0, 0, 0, 0.70);
  --blob-1: #03195B;
  --blob-2: #0B2CB1;
  --blob-3: #1951FC;
  --blob-opacity: 0.45;
}

@theme inline {
  --color-canvas: var(--canvas);
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-surface-3: var(--surface-3);
  --color-line: var(--line);
  --color-line-strong: var(--line-strong);
  --color-ink: var(--ink);
  --color-ink-2: var(--ink-2);
  --color-ink-3: var(--ink-3);
  --color-primary: var(--primary);
  --color-primary-hover: var(--primary-hover);
  --color-primary-text: var(--primary-text);
  --color-primary-soft: var(--primary-soft);
  --color-snow: #FFFFFF;
  --color-warning: var(--warning);
  --color-danger: var(--danger);
  --font-ui: var(--font-inter-var), ui-sans-serif, system-ui, sans-serif;
  --font-display: var(--font-instrument), ui-serif, Georgia, serif;
}
```
If any of these utility names already exist in the project, prefix the new ones with `fx-` and use the prefixed names everywhere. Do NOT override `--font-sans` (that would change the mobile font). `success` is intentionally reused from the legacy tokens.

### Typography
Fonts via next/font in the root layout:
```ts
// Inter is ALREADY loaded in src/app/layout.tsx as --font-inter-var. Keep it. Only add:
import { Instrument_Serif } from 'next/font/google';
const instrument = Instrument_Serif({ subsets: ['latin'], weight: ['400'], style: ['normal', 'italic'], variable: '--font-instrument', display: 'swap' });
// add ${instrument.variable} to the existing <html> className next to inter.variable
```
Apply `font-ui` on the desktop shell root, the landing page and the desktop auth layout only.

Scale (size/line-height, weight):
- display-xl: clamp(56px, 6.2vw, 104px)/1.02, font-display 400, tracking -0.02em (landing hero only)
- display: 44/48, font-display 400, tracking -0.015em (page greetings, auth headline, empty states)
- h1: 32/38, font-display 400 (page titles)
- h2: 20/28, font-ui 600, tracking -0.01em (section and card group titles)
- h3: 15/22, font-ui 600 (card titles)
- body: 14/22, font-ui 400
- small: 13/18, font-ui 400/500
- micro: 11/14, font-ui 500, uppercase, tracking 0.08em (sidebar section labels)
- metric: 32/36, font-ui 600, tabular-nums, tracking -0.02em

Serif is for titles, greetings, the hero and empty states. Never in buttons, inputs, tables or numbers.

### Shape, space, motion
- Radii: 10 (small controls, chips), 14 (inputs, buttons), 20 (cards), 28 (panels, modals, auth container), 9999 (pills).
- 4pt grid. Page padding 32. Card padding 20 (24 for hero cards). Grid gap 20.
- Motion: fast 140ms, base 220ms, slow 420ms, easing var(--ease). Hover lifts at most translateY(-1px). Modals: fade + scale 0.98 to 1. Respect prefers-reduced-motion.

---

## 3. GLASS + AMBIENT (add to globals.css)
```css
@utility glass {
  background: var(--glass-bg);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid var(--glass-border);
  box-shadow: inset 0 1px 0 var(--glass-highlight), var(--shadow-glass);
}
@utility glass-strong {
  background: var(--glass-bg-strong);
  -webkit-backdrop-filter: blur(32px) saturate(180%);
  backdrop-filter: blur(32px) saturate(180%);
  border: 1px solid var(--glass-border);
  box-shadow: inset 0 1px 0 var(--glass-highlight), var(--shadow-glass);
}
/* Liquid-glass specular rim */
@utility liquid {
  position: relative;
  &::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1px;
    background: linear-gradient(135deg, rgba(255,255,255,0.55), rgba(255,255,255,0) 38%, rgba(255,255,255,0) 62%, rgba(255,255,255,0.22));
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }
}
.dark .liquid::before { opacity: 0.35; }
@utility frost {
  background: var(--frost-bg);
  border: 1px solid var(--line);
  box-shadow: var(--shadow-1);
  border-radius: 20px;
}
@media (prefers-reduced-transparency: reduce) {
  .glass, .glass-strong { background: var(--surface); backdrop-filter: none; -webkit-backdrop-filter: none; }
}

.ambient-blob {
  position: absolute;
  border-radius: 9999px;
  filter: blur(120px);
  opacity: var(--blob-opacity);
  animation: fx-drift 40s var(--ease) infinite alternate;
  will-change: transform;
}
@keyframes fx-drift {
  0% { transform: translate3d(0, 0, 0) scale(1); }
  50% { transform: translate3d(6vw, 4vh, 0) scale(1.08); }
  100% { transform: translate3d(-4vw, -3vh, 0) scale(0.96); }
}
.ambient-grain {
  position: absolute;
  inset: 0;
  opacity: 0.035;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
}
@media (prefers-reduced-motion: reduce) { .ambient-blob { animation: none; } }
```

`src/components/desktop/AmbientBackground.tsx`:
```tsx
'use client';
export default function AmbientBackground({ strong = false }: { strong?: boolean }) {
  const o = strong ? 1.4 : 1;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-canvas">
      <div className="ambient-blob" style={{ background: 'var(--blob-1)', width: '60vw', height: '60vw', top: '-22vw', left: '-12vw', opacity: `calc(var(--blob-opacity) * ${o})` }} />
      <div className="ambient-blob" style={{ background: 'var(--blob-2)', width: '45vw', height: '45vw', bottom: '-18vw', right: '-8vw', animationDelay: '-12s', opacity: `calc(var(--blob-opacity) * ${o})` }} />
      <div className="ambient-blob" style={{ background: 'var(--blob-3)', width: '30vw', height: '30vw', top: '35%', left: '45%', animationDelay: '-24s', opacity: `calc(var(--blob-opacity) * ${o * 0.6})` }} />
      <div className="ambient-grain" />
    </div>
  );
}
```
Pause the blob animation when `document.hidden` (toggle `animation-play-state`).

---

## 4. THEME
- `next-themes` is already set up via `src/components/ThemeProvider.tsx`. Reuse it and `useTheme()`. You may add `disableTransitionOnChange` to the existing provider.
- Theme switch = 3-segment pill (Sun / Moon / Monitor icons) in the sidebar footer and in Settings > Appearance.
- The landing hero is always dark (it's a photo). Everything else follows the theme.

---

## 5. COMPONENT KIT (`src/components/desktop/ui/`)
- Button: variants primary (bg-primary, text-snow, hover bg-primary-hover), secondary (bg-surface, border line-strong, text ink), ghost (transparent, hover bg-surface-2), glass (glass liquid, used on photos and gradients), danger. Sizes sm 32px, md 40px, lg 48px. Radius 14 (pill variant 9999). Font 14/500. Icon gap 8.
- IconButton: 36px square, radius 10, ghost by default, tooltip required.
- Input / Textarea: height 44, radius 14, bg surface-2, border line, placeholder ink-3. Focus: border transparent + ring. Label above at 13/500 ink-2. Error text 12px danger below.
- Focus ring everywhere: `box-shadow: 0 0 0 2px var(--canvas), 0 0 0 4px var(--ring)` on :focus-visible.
- SegmentedControl: pill track bg surface-2, active thumb bg surface + shadow-1, slides with base motion.
- Chip/Tag: 24px tall, radius 9999, 12px/500, tinted bg (colour at 12%) + colour text.
- Checkbox: 20px circle, border line-strong. Checked = filled primary + snow check. Animate the check stroke.
- Card: `frost` + padding 20. Header row: h3 title left, optional 28px circular ghost IconButton with ArrowUpRight right.
- Modal: centered, width 560 (sm 440, lg 720), `glass-strong liquid`, radius 28, padding 28. Backdrop rgba(5,7,15,0.40) + blur(8px). Header: title left; X and check (confirm) right. Esc closes. Focus trapped.
- Drawer (right): width 420, full height, glass-strong, slides in 220ms.
- Popover / Menu: glass-strong, radius 14, padding 6, items 36px tall, radius 10.
- Tooltip: surface-3 bg, 12px, shows the shortcut as Kbd.
- Kbd: 20px tall, radius 6, border line-strong, 11px font-ui.
- Skeleton: surface-2 with a subtle shimmer.
- EmptyState: display-size serif line, one sentence ink-2, one button.
- Toast: bottom-right, glass-strong, 4s.
- ProgressRing, Heatmap, Avatar (initials fallback, bg primary-soft, text primary-text).

---

## 6. APP ARCHITECTURE

### Routes
- `/` landing (public)
- `/login` auth, mode via `?mode=login|signup` (default login)
- App (existing group `(app)`): `/today` (NEW desktop home), `/plan`, `/focus`, `/notes`, `/insights`, `/groups` (NEW), `/mcp` (NEW), `/settings`
- After login: desktop (matchMedia min-width 1024px) goes to `/today`; mobile keeps its current redirect.
- Mobile bottom nav does not change.

### Desktop shell (`src/components/desktop/DesktopShell.tsx`, used in `(app)/layout.tsx`)
Grid: [Sidebar 256px | Main 1fr | optional ContextPanel 340px]. AmbientBackground behind everything. The shell renders `children` once. Mobile chrome stays `lg:hidden`.

SIDEBAR (floating: inset 12px, radius 28, `glass-strong liquid`, full height minus 24px):
- Top: wordmark "FOCALYST" (font-ui 600, 13px, tracking 0.32em, ink) + collapse IconButton (PanelLeft icon, shortcut Cmd+\). Collapsed = 76px icon rail with tooltips.
- Primary nav (items 40px, radius 12, icon 18 + label 14/500):
  Today (Sun), Plan (CalendarCheck2) with nested Habits / Tasks / Calendar when Plan is active, Focus (Timer), Notes (NotebookPen), Insights (ChartColumn), Groups (Users)
- Section label "LABS" (micro, ink-3): MCP (Plug) + "Soon" chip (primary-soft bg, primary-text)
- Active item: bg surface (light) / surface-2 (dark), shadow-1, icon primary-text, text ink. Inactive: ink-2, hover bg surface-2.
- Bottom stack:
  - Pro card (only if NOT Pro): radius 20, radial gradient #03195B to #1951FC, white text "Focalyst Pro", one line, glass button "Upgrade".
  - Ask Focalyst AI row (Sparkles icon, shortcut Cmd+J)
  - Settings row
  - Theme switch segmented pill
  - User row: avatar, name 13/600, email 12 ink-3, LogOut IconButton

TOP BAR (inside the main column, height 64, sticky, `glass`, radius 20, margin 12px 12px 0):
- Left: breadcrumb (ink-3 > ink) or page title.
- Center: search pill 360px "Search or jump to..." + Cmd+K Kbd, opens the command palette.
- Right: "+ New" button (secondary; menu: Task, Habit, Note, Reminder, Focus session), Ask AI IconButton (Sparkles), Bell IconButton (dot if unread), Avatar menu.

MAIN: scroll container, content max-width 1440, centered, padding 32.

CONTEXT PANEL (right, 340px, frost, collapsible with Cmd+.): used by Plan (selected item details) and Notes (note info).

COMMAND PALETTE (cmdk, Cmd+K): `glass-strong liquid`, 640px wide, top 18vh. Groups: Navigate, Create, Notes (search titles), Actions (toggle theme, start focus, open AI). Arrow keys + Enter, Esc closes.

AI PANEL (Cmd+J or Ask AI): right Drawer 420px. Same content as the mobile sheet:
- Header "Ask Focalyst AI".
- Greeting in font-display 36/42: "Hello {firstName}" (name in primary-text) on line 1, "May I help you?" on line 2.
- Three chips: "Tell me about my habit consistency", "Add a task for tomorrow", "How productive was I this week?" (tap sends the label as a message).
- Input pinned to the bottom with a blue glow behind it: linear-gradient from transparent to #1951FC/#3781FC (dark) or #CBE9FD/#A9C6FF (light) covering the bottom 45% of the drawer, plus a radial-gradient ellipse at bottom center. No divider line above the input.
- Reuse the existing logic in `src/components/chat/ChatUI.tsx` / `AIChatOverlay.tsx` (streaming, send handler). Desktop only changes the container and styling.

KEYBOARD: Cmd+K palette, Cmd+J AI, Cmd+\ sidebar, Cmd+. context panel, N new item (context-aware), G then T/P/F/N/I to navigate, F = Focus desk mode, Esc closes overlays. Use Ctrl on Windows.

---

## 7. SCREENS

### 7.1 Landing `/` (public)
HERO (100vh, always dark):
- Background: next/image `/landing/hero.png`, fill, priority, object-cover, object-position center 60%.
- Overlays: top linear-gradient rgba(3,25,91,0.35) to transparent (0 to 30%); bottom transparent to rgba(5,7,15,0.55) (60% to 100%).
- Nav (absolute top 24px, max-width 1280, centered, px 32): left wordmark FOCALYST white 13px/600, tracking 0.32em. Center links (white 80%, 14px, hover 100%): Features (#features), MCP (#mcp). Right: "Log in" text link + glass pill button "Get Started".
- Content centered horizontally, top 26vh:
  - Headline display-xl, white: "Own your time. Build what *matters*." ("matters" in font-display italic)
  - Subtext 19/30, white 85%, max-width 640, mt 20: "Turn your ambitions into action with AI-powered planning, focused work sessions, and habits that move you forward."
  - CTA mt 36: glass liquid pill, height 52, px 28, white 15/600, "Get Started" links to `/login?mode=signup`. Secondary text link below, white 70%: "I already have an account" links to `/login`.
  - Entrance: fade-up 12px, 600ms, stagger 80ms (headline, sub, CTA).
- Bottom center: small "Scroll" micro label with a 1px animated line.

Below the hero (theme-aware, AmbientBackground):
- #features: font-display h1 centered "Everything you need to focus. Nothing you don't." Then a product peek: `/landing/app-preview.png` inside a glass liquid frame, radius 28, slight perspective tilt (rotateX 8deg) that flattens on scroll. Frost placeholder until the image exists.
- Three pillar cards (frost, 3 columns):
  - Plan (CalendarCheck2): "Habits, tasks and reminders in one calm place."
  - Focus (Timer): "Deep work sessions that actually get saved."
  - Reflect (ChartColumn): "Weekly insights that show what's working."
- #mcp strip: glass liquid panel, micro label "FOCALYST LABS", font-display h1 "Your Focalyst, inside your AI.", KitWaitlist (7.9).
- Footer: wordmark, Privacy, Terms, Contact, "(c) 2026 Focalyst" (render as the copyright symbol). 13px ink-3.

### 7.2 Auth `/login`
Desktop only. Mobile keeps its layout; only the Apple logo fix applies there.
- Page: AmbientBackground. Centered container 1120px x min(720px, 100vh - 64px), radius 28, `glass-strong liquid`, overflow hidden, grid 1.1fr / 1fr.
- LEFT panel: background #03195B with radial gradients of #1951FC (bottom-left, 55%) and #0B2CB1 (top-right, 45%), plus ambient-grain. Top-left: wordmark white. Bottom block, padding 48:
  - font-display 48/52 white: "Own your time."
  - 15px white 70%: "Plan, focus and reflect in one calm place."
  - Row of 3 step cards (radius 20, padding 16, 140px tall): "1 Create your account", "2 Build your first habit", "3 Start a focus session". Number in a 24px circle. In signup mode, card 1 is solid white with ink text and the others are glass (white 10%) with white text. In login mode, all three are glass.
- RIGHT panel: padding 56, vertically centered, form max-width 380.
  - Title font-ui 26/600 ink: "Welcome back" (login) / "Create your account" (signup). Sub 14 ink-2: "Log in to continue to Focalyst." / "Start owning your time in under a minute."
  - Social row, 2 equal buttons, 48px, radius 14: Google (secondary variant, Google G logo) | Apple (light theme: bg-black text-snow; dark theme: bg-snow text-black), using AppleIcon below at 18px.
  - Divider: hairline + "or" 12px ink-3.
  - Signup only: Full name field (the first word is used for greetings).
  - Email, Password (Eye / EyeOff toggle). Login only: "Forgot password?" link right-aligned (wire to the existing reset flow if present; otherwise hide).
  - Primary button lg, full width: "Log in" / "Create account". Loading state = inline spinner + disabled.
  - Switch line 13px: "New to Focalyst? Create an account" / "Already have an account? Log in" (toggles mode without a reload, updates the URL param).
  - Terms microcopy 12px ink-3 with links.
  - Keep all existing Supabase auth logic.

AppleIcon (`src/components/icons/AppleIcon.tsx`), used on BOTH mobile and desktop login:
```tsx
export default function AppleIcon({ className = 'h-[18px] w-[18px]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  );
}
```
Nudge it up 1px (`-translate-y-px`) for optical centering next to the text.

### 7.3 Today `/today`
- Header: font-display 44 "Good morning, {firstName}" (morning / afternoon / evening by local hour; name in primary-text) + 14px ink-3 date "Monday, 19 October". Right: primary button "Start focus" (links to /focus).
- Bento grid: 12 columns, gap 20.
  - Row 1:
    - FOCUS HERO col-span-5, min-h 240: radius 20, bg radial-gradient(120% 120% at 0% 100%, #1951FC 0%, #0B2CB1 40%, #03195B 100%), grain, white text. Label "Focus today", metric 48px tabular ("2h 15m"), thin progress ring vs daily goal (default 3h if no goal exists), glass button "Start session".
    - TODAY'S HABITS col-span-4: header "Habits" + "3 of 5" ink-3. Rows: circle checkbox, habit icon chip, name, current streak (Flame 14px + number). Toggle uses the existing optimistic logic. Thin progress bar at the bottom.
    - UP NEXT col-span-3: clock card (analog face 120px with ticks, or a large digital time) + the next 2 reminders/tasks with times.
  - Row 2: FOCUS THIS WEEK col-span-8 (chart styled per 7.7) | TASKS col-span-4 (Overdue + Today, inline "Add a task, press Enter").
  - Row 3: HABIT CONSISTENCY col-span-8 (heatmap, last 20 weeks, calendar-aligned) | YOUR GROUP col-span-4 (your rank + top 3 mini list, "Open" links to /groups; empty state "Join a group to stay accountable").
- Each card header has an ArrowUpRight IconButton linking to its full page.

### 7.4 Plan `/plan`
Header: font-display h1 "Plan" + SegmentedControl [Habits n | Tasks n | Calendar] (synced with the nested sidebar items and the URL `?view=`). Right: "+ New habit" / "+ New task" / "+ New reminder" depending on the view.

HABITS view: two columns, list (1fr) + ContextPanel (340).
- Habit row (64px, frost, radius 16, gap 8): drag handle (GripVertical, visible on hover; only if an order column exists), icon chip (habit colour at 14% bg), name 14/600, schedule 12 ink-3 ("Mon, Wed, Fri"), last-7-days dots (12px circles, filled in the habit colour if done; today's dot clickable), streak.
- Click opens the ContextPanel: name, icon, schedule, reminder time, stats (current streak, best streak, completion %), full-year heatmap.
- HEATMAP FIX: calendar-aligned. Columns = weeks, rows = Mon to Sun. Start at the Monday on or before Jan 1 of the selected year (year switcher < 2026 >). Days before created_at are rendered empty, not hidden. Month labels on top. 11px squares, 3px gap, radius 3. Colour = habit colour at 15/40/70/100% by completion.
- New/Edit habit on desktop = Modal (lg 720) with the uniform header (title left; X and check right). Same fields as the current page. Mobile keeps the page route.

TASKS view: list + ContextPanel.
- Composer at the top: input "Add a task, press Enter" with an Enter Kbd. While typing, a chip row appears: Date, Priority, Tags.
- Collapsible groups (ChevronDown + count): Overdue, Today, Upcoming, No date, Completed (collapsed by default).
- Row 44px: circle checkbox, title, tag chips, priority dot (high danger, medium warning, low ink-3), due date right (danger if overdue). Completed = strike-through ink-3.
- Click opens the ContextPanel editor (title, dates, priority, tags, reminder toggle, delete).

CALENDAR view: grid (1fr) + ContextPanel (agenda).
- Header: month title font-display 32 (click opens a quick-jump Popover: year list left, 3x4 month grid right) + < > + "Today" button + SegmentedControl Month/Week.
- Month grid: 7 columns, cells min-h 112, hairline borders (line), date number top-left 13px. Today = 26px filled ink circle with canvas text. Selected day = primary-soft bg. Up to 3 event chips per cell coloured by tag, then "+2 more".
- ContextPanel: selected day title, agenda list (time, title, tag chip, star, completion checkbox), "+ New reminder".
- Reminder Modal: title, date, start/end time, repeat [Never, Daily, Weekly, Every 2 weeks, Monthly, Yearly, Custom (every N days/weeks/months/years)], tag [Health, Work, Urgent, Study, Personal] with fixed colours, colour override, star toggle. Use the same Supabase columns the mobile app uses (check the mobile code in the Focalyst folder). Port mobile's `doesReminderOccurOnDate` logic.

### 7.5 Focus `/focus` (+ existing timer route)
Layout: stage (1fr) + right column 360.
- Stage, centered: SegmentedControl [Pomodoro | Countdown]; session label "Focus, 2 of 4" (micro); circular timer 380px.
- TIMER VISUAL: reuse `src/components/focus/SeamlessRadialTimerDial.tsx`. Add optional colour props (defaults unchanged, so mobile stays identical) and pass the brand ramp on desktop: #CBE9FD to #3781FC to #1951FC instead of #2B6BFF / #00D2FF. Track ring in line colour; keep its feathered glow. Digits inside: font-ui 300, 76px, tabular-nums, tracking -0.03em. Below the digits: the linked task name 13 ink-2.
- Controls row: Reset (48px ghost circle), Start/Pause (72px primary circle with shadow 0 10px 30px rgba(25,81,252,0.45)), Skip (48px ghost circle).
- "What are you working on?" select (links a task).
- Right column (frost cards): Today (focus minutes metric, sessions count), Presets (25/5, 50/10, 90/15, Custom), Sessions today list.
- DESK MODE (button Maximize2 or key F): Fullscreen API, hides all chrome, AmbientBackground strong, timer scales to 56vh, small local clock top-right, Esc exits.
- BUG FIXES:
  1. Save partial sessions on Reset, route change and `beforeunload` when elapsed >= 60s (insert into pomodoro_sessions with actual minutes, upsert daily_focus_activity).
  2. Use `localDateStr()` (section 9) instead of `toISOString().split('T')[0]`.

### 7.6 Notes `/notes`
Three panes (Apple Notes / Notion style):
- Pane 1 (220, frost): "New note" primary button, filters (All, Pinned, Favourites, Voice notes) with counts, "Folders" micro label + folder list + "New folder".
- Pane 2 (320, frost): search input, sort menu, Mic IconButton (record a voice note). Pinned section first. Note row: title 14/600, 2-line preview 13 ink-2, meta 12 ink-3 (date, Mic icon if voice). Selected = surface-2 bg + 2px primary left bar.
- Pane 3 (flex, editor): content max-width 720 centered, padding-top 48.
  - Title: font-display 36, editable, placeholder "Untitled".
  - Meta line 12 ink-3: folder, updated, word count, save status ("Saving..." / "Saved").
  - TipTap (extend the existing NoteEditor / EditorToolbar setup; do not start over): StarterKit + TaskList + TaskItem + Placeholder ("Write, or press / for commands"). Bubble menu on selection (Bold, Italic, Strike, H1, H2, Bullet, Checklist, Quote). Slash menu with the same items. Typography: body 16/28 ink, h1 28 font-display, h2 20/600, checkboxes = 18px circle style.
  - Storage: HTML in the existing content column. Legacy plain text loads as paragraphs (split on newlines). Autosave debounce 1200ms.
  - Voice notes: top glass card with audio player if an audio URL exists, AI Summary card, collapsible Transcript.
  - Right ContextPanel (optional, Cmd+.): note info (created, updated, folder, favourite, pinned).
- Restyle VoiceRecordingOverlay as a centered glass Modal with a live waveform (Web Audio AnalyserNode bars) and a timer.
- Desktop editor surfaces use the new tokens only (mobile NoteEditor classes stay as they are). Add pinning (`is_pinned`) if the column exists (mobile uses it).

### 7.7 Insights `/insights`
- Header: font-display h1 "Insights" + week switcher (< This week >) + SegmentedControl Week/Month.
- KPI row, 4 frost cards: Focus time, Sessions, Habit consistency %, Tasks completed. Each: label 13 ink-2, metric 32, delta chip vs the previous period (success up / danger down), 40px sparkline.
- FOCUS ACTIVITY col-span-8 (recharts): bars radius [8,8,0,0], barSize 28; focus fill = linearGradient #3781FC to #1951FC; break fill = #CBE9FD (dark: rgba(203,233,253,0.25)); horizontal grid only, stroke var(--line); axis ticks 12px ink-3, no axis lines; custom tooltip = glass-strong radius 12.
- BEST FOCUS TIME col-span-4: hour-of-day distribution (24 thin bars), peak hour highlighted.
- HABIT CONSISTENCY col-span-6: per-habit horizontal bars with %.
- WEEKLY REPORT col-span-6: latest AI weekly report (from the cron table). font-display title, summary, "Read full report" opens a Modal.
- FIX: replace every `toISOString().split('T')[0]` with `localDateStr()`.

### 7.8 Groups `/groups` (NEW page; the logic already exists on web)
- Reuse the logic in `src/components/insights/HabitGroupLeaderboardSection.tsx` and `src/lib/services/habitGroupService.ts` (same tables, same live subscription to `habit_group_members`). Build the desktop layout around them; keep the mobile Insights section as it is.
- Layout: left column 320 (my groups as frost cards: name, member count, your rank; buttons "Create group" primary, "Join with code" secondary) + right detail.
- Detail: group name font-display 32 + invite code chip (Copy icon, toast "Code copied"). Podium: 3 columns ordered 2nd, 1st, 3rd, heights 120/160/100, avatars 56px, name, completion %. 1st uses the blue gradient; 2nd and 3rd are frost. Full standings table: rank, member, completion %, streak; your row highlighted primary-soft. "Leave group" danger ghost button opens a confirm Modal.
- Create / Join / Leave = Modals.

### 7.9 MCP `/mcp` (in app) + #mcp strip on landing
- Strong AmbientBackground. Centered, max-width 720.
- Micro label "FOCALYST LABS" + "Coming soon" chip.
- font-display 56/60: "Your Focalyst, inside your AI."
- 17/28 ink-2: "Connect your habits, tasks and focus sessions to the AI assistants you already use. Ask about your week, plan from any chat, and keep your data in your control."
- KitWaitlist (below), max-width 520, centered.
- 3 frost feature cards: "Ask about your week", "Plan from any chat", "Your data, your control" (one line each).

WAITLIST IMPLEMENTATION (decided): a custom React form that posts directly to the owner's Kit form endpoint.
- Do NOT use Kit's JS embed script, do NOT paste Kit's HTML embed, do NOT load `ck.5.js`, do NOT copy Kit's CSS.
- No API route and no env vars.
- The form posts `email_address` to `https://app.kit.com/forms/10065151/subscriptions` with `Accept: application/json`.
- If the network request itself fails, it falls back to a native form submit in a new tab so the signup still goes through.
- Kit already has the success message and settings configured on its side.

`src/components/desktop/mcp/KitWaitlist.tsx`:
```tsx
'use client';
import { FormEvent, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';

const KIT_FORM_ACTION = 'https://app.kit.com/forms/10065151/subscriptions';
type Status = 'idle' | 'loading' | 'success' | 'error';

export default function KitWaitlist({
  defaultEmail = '',
  firstName,
}: {
  defaultEmail?: string;
  firstName?: string;
}) {
  const [email, setEmail] = useState(defaultEmail);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const value = email.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError('Enter a valid email.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setError('');

    let res: Response;
    try {
      res = await fetch(KIT_FORM_ACTION, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });
    } catch {
      // Network/CORS failure: fall back to a native submit (opens Kit's confirmation in a new tab)
      form.submit();
      setStatus('success');
      return;
    }

    if (!res.ok) {
      setError('Could not join right now. Try again.');
      setStatus('error');
      return;
    }
    setStatus('success');
  }

  if (status === 'success') {
    return (
      <div className="glass liquid flex h-[60px] items-center justify-center gap-3 rounded-full px-6 text-[15px] font-medium text-ink">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-snow">
          <Check className="h-4 w-4" strokeWidth={2.25} />
        </span>
        You&apos;re on the list. We&apos;ll email you first.
      </div>
    );
  }

  return (
    <div>
      <form
        action={KIT_FORM_ACTION}
        method="post"
        target="_blank"
        noValidate
        onSubmit={onSubmit}
        className="glass liquid flex h-[60px] items-center gap-2 rounded-full p-1.5 pl-6"
      >
        {firstName ? <input type="hidden" name="fields[first_name]" value={firstName} /> : null}
        <input
          type="email"
          name="email_address"
          required
          autoComplete="email"
          aria-label="Email address"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === 'error') setStatus('idle');
          }}
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-ink placeholder:text-ink-3 outline-none"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="flex h-12 shrink-0 items-center gap-2 rounded-full bg-primary px-6 text-[15px] font-semibold text-snow transition-colors duration-150 hover:bg-primary-hover disabled:opacity-70 focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)]"
        >
          {status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Join the waitlist
        </button>
      </form>
      {status === 'error' && error ? (
        <p role="alert" className="mt-2 pl-6 text-[13px] text-danger">{error}</p>
      ) : null}
    </div>
  );
}
```
- On `/mcp`, pass the signed-in user's email and first name as `defaultEmail` / `firstName`.
- On the landing #mcp strip, render it with no props.
- The landing hero sits on a photo; the #mcp strip sits on the theme canvas, so the glass styling works in both themes.

### 7.10 Settings `/settings`
Two columns: left tab list 220 (Profile, Appearance, Notifications, Focalyst Pro, Account) + right panel (frost, max-width 720).
- Profile: avatar, name, email.
- Appearance: 3 large theme cards (Light / Dark / System) with mini previews.
- Notifications: existing toggles.
- Focalyst Pro: status, plan details, manage button.
- Account: Sign out, Delete account (danger, confirm Modal).

---

## 8. STATES, ACCESSIBILITY, PERFORMANCE
- Every list: loading skeleton, empty state, error state with Retry.
- Text contrast >= 4.5:1. Never put body text directly on a blob; text sits on surfaces.
- Everything keyboard reachable; Modals trap focus; Esc closes.
- Ambient animation pauses when `document.hidden`.
- next/image for all images; the hero has `priority`.
- No layout shift: reserve heights for charts and cards.

---

## 9. SHARED UTILITIES
`src/lib/utils/date.ts` ALREADY exists with `localDateStr`, `parseYMDToLocalNoon` and `addDaysYMD`. Reuse it; do not recreate.

`src/hooks/useIsDesktop.ts`:
```ts
'use client';
import { useEffect, useState } from 'react';

export function useIsDesktop(): boolean | null {
  const [v, setV] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const on = () => setV(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return v;
}
```
Desktop-only components live in `src/components/desktop/` (one folder per page: today/, plan/, focus/, notes/, insights/, groups/, mcp/).

---

## 10. PHASES (5 phases, every feature in sections 1 to 9 is included)

DEPLOYMENT: there is no feature branch. Every phase is committed and pushed to `main`, and Vercel deploys it to production at focalyst.online. Because of this:
- Run `npm run build` before pushing. If the build fails, fix it. NEVER push a failing build.
- Mobile (below 1024px) must look and work exactly as before after every phase. Real users are on it.
- Push once, at the end of the phase. Commit message format: `desktop: phase N - <short summary>`.

1. FOUNDATION + LANDING + LOGIN
   Sections 0, 1, 2, 3, 4, 5, 9, 7.1, 7.2, and the KitWaitlist component from 7.9.
   New tokens, Instrument Serif, glass/liquid/frost/ambient CSS, AmbientBackground, the full UI kit (incl. ThemeSwitch, Modal, Drawer, Popover, Toast), useIsDesktop, AppleIcon fix (mobile + desktop), timezone grep fix, landing page at `/` (hero, nav, features, pillars, #mcp strip WITH the working KitWaitlist, footer), desktop split-screen login/signup.

2. DESKTOP SHELL + AI + TODAY
   Sections 0, 5, 6, 7.3.
   Install cmdk. DesktopShell (floating glass sidebar with nested Plan items, collapsible rail, Pro card, theme switch, user row), top bar (breadcrumb, search pill, + New menu, AI, bell, avatar), context panel slot, command palette (Cmd+K), AI drawer (Cmd+J) reusing ChatUI / AIChatOverlay, all keyboard shortcuts, layout.tsx padding fix + lg:hidden on Header and BottomNav, desktop post-login redirect to /today, and the full /today bento dashboard.

3. PLAN + FOCUS
   Sections 0, 5, 7.4, 7.5.
   Plan with Habits / Tasks / Calendar views, context panel editors, calendar-aligned heatmap, habit/task/reminder modals, month quick-jump, Month/Week toggle, full recurrence + tags + colours + stars (mirror mobile). Focus with recoloured SeamlessRadialTimerDial, controls, task link, right column, presets, desk mode (Fullscreen API), partial-session saving.

4. NOTES + INSIGHTS + GROUPS
   Sections 0, 5, 7.6, 7.7, 7.8.
   Install @tiptap/extension-placeholder. Three-pane Notes with the extended TipTap editor (bubble menu, slash menu, checklists, placeholder, 1200ms autosave), voice note cards, glass recording modal with live waveform, pinning. Insights with KPI row + sparklines, restyled focus chart, best focus time, habit consistency, weekly report modal. New /groups page with podium, standings, invite code, create/join/leave modals.

5. MCP + SETTINGS + FINAL POLISH
   Sections 0, 1, 5, 7.9, 7.10, 8.
   /mcp page with KitWaitlist (prefilled for signed-in users), desktop Settings (Profile, Appearance cards, Notifications, Focalyst Pro, Account). Then a QA pass over EVERY desktop page in light and dark at 1280px and 1440px: hardcoded colours, hover/active/focus states, loading/empty/error states, contrast, reduced motion, anti vibe-coded rules. Fix everything found.

---

## 11. PHASE PROMPTS (paste each into a FRESH Antigravity chat, one per phase)

Phase 1:
```
Read DESKTOP_DESIGN.md sections 0, 1, 2, 3, 4, 5, 9, 7.1, 7.2 and the KitWaitlist part of 7.9. Implement Phase 1 exactly as listed in section 10:
1. Add the new tokens (separate block; legacy tokens untouched), Instrument Serif, glass/liquid/frost/ambient CSS, AmbientBackground, the full UI kit in src/components/desktop/ui (including a 3-segment ThemeSwitch using the existing useTheme), and useIsDesktop. Do NOT add a ThemeProvider, do NOT load Inter again, do NOT recreate localDateStr. Never use the `white` colour utility in new code; use `snow`.
2. Replace the Apple logo in src/app/(auth)/login/page.tsx with AppleIcon.
3. Run one grep for `toISOString().split('T')[0]` across src/ and replace each one used as a local date string with localDateStr() from src/lib/utils/date.ts.
4. Build the landing page at / (hero image public/landing/hero.png) with the working KitWaitlist in the #mcp strip, and keep the Capacitor redirect rule.
5. Build the desktop split-screen login/signup. Keep all existing Supabase auth logic.
Rules: mobile below 1024px must look and work identical (except the Apple logo). Don't refactor unrelated code. Never re-open a file range you have already viewed. Run `npm run build`, fix every error, then commit and push to main. Never push a failing build. List changed files.
```

Phase 2:
```
Read DESKTOP_DESIGN.md sections 0, 5, 6, 7.3. Implement Phase 2 exactly as listed in section 10:
1. Install cmdk.
2. Build DesktopShell (sidebar, top bar, context panel slot), the command palette, the AI drawer reusing ChatUI / AIChatOverlay logic, and all keyboard shortcuts from section 6.
3. In src/app/(app)/layout.tsx: convert the inline paddingBottom on <main> to `pb-[calc(80px+env(safe-area-inset-bottom))] lg:pb-0`, add lg:hidden to Header and BottomNav, and render DesktopShell on desktop.
4. Desktop post-login redirect to /today. Build the full /today bento dashboard reusing existing hooks and queries.
Rules: mobile below 1024px must look and work identical. Use the UI kit from Phase 1. Never re-open a file range you have already viewed. Run `npm run build`, fix every error, then commit and push to main. Never push a failing build. List changed files.
```

Phase 3:
```
Read DESKTOP_DESIGN.md sections 0, 5, 7.4, 7.5. Implement Phase 3 exactly as listed in section 10:
1. Desktop Plan: Habits / Tasks / Calendar views, context panel editors, calendar-aligned heatmap, habit/task/reminder modals, quick-jump, Month/Week toggle. Reuse PlanContext and the recurrence engine in CalendarView; for reminder fields mirror the mobile app's columns and doesReminderOccurOnDate logic from the Focalyst folder.
2. Desktop Focus: reuse SeamlessRadialTimerDial (add optional colour props; mobile defaults unchanged), controls, task link, right column, presets, desk mode, and partial-session saving.
Rules: mobile below 1024px must look and work identical. Use the UI kit and shell. Never re-open a file range you have already viewed. Run `npm run build`, fix every error, then commit and push to main. Never push a failing build. List changed files.
```

Phase 4:
```
Read DESKTOP_DESIGN.md sections 0, 5, 7.6, 7.7, 7.8. Implement Phase 4 exactly as listed in section 10:
1. Install @tiptap/extension-placeholder. Three-pane desktop Notes extending the existing NoteEditor / EditorToolbar / useNotes (bubble menu, slash menu, checklists, placeholder, autosave), voice note cards, the glass recording modal with live waveform, and pinning.
2. Desktop Insights reusing the existing insights components and utils.
3. New /groups page built on HabitGroupLeaderboardSection logic and habitGroupService.
Rules: mobile below 1024px must look and work identical. Use the UI kit and shell. Never re-open a file range you have already viewed. Run `npm run build`, fix every error, then commit and push to main. Never push a failing build. List changed files.
```

Phase 5:
```
Read DESKTOP_DESIGN.md sections 0, 1, 5, 7.9, 7.10, 8. Implement Phase 5 exactly as listed in section 10:
1. The /mcp page with KitWaitlist (prefill email and first name for signed-in users).
2. Desktop Settings (Profile, Appearance, Notifications, Focalyst Pro, Account).
3. QA pass on EVERY desktop page in light and dark at 1280px and 1440px wide. Fix hardcoded colours, missing hover/active/focus states, missing loading/empty/error states, contrast problems, and anti vibe-coded rule violations. List what you fixed.
Rules: mobile below 1024px must look and work identical. Never re-open a file range you have already viewed. Run `npm run build`, fix every error, then commit and push to main. Never push a failing build. List changed files.
```
