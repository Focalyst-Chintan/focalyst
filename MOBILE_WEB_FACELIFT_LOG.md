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
