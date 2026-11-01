# iPhone Duo audit — Focalyst iOS

Source: the `iphone-duo-*` skills (readiness, react-native, adaptive-layout, design-review,
vertical-bars, dual-pane-patterns) and their `reference/` sheets. Static audit. Anything that
depends on pose (fold, Split View side, actual inset values) still has to be confirmed in the
iPhone Duo simulator.

## Baseline

| Item | Value | Effect on iPhone Duo |
|---|---|---|
| SDK | Xcode 27.2, `iphoneos27.2` | 27.1+ tier: the app fills the whole display. The status bar and Dynamic Island sit on the **side**, so safe areas are asymmetric (trailing inset, often 0 top). |
| Orientation | `orientation: "default"`, all four in Info.plist, `UIRequiresFullScreen = false` | Already resizable. The inner display ignores supported orientations anyway. **No Info.plist change needed.** |
| Tab bar / header | React Navigation JS tabs (expo-router `Tabs`) | Hand-rolled from iOS's point of view, so it stays horizontal (no vertical bar). Header and tab bar already pad by left/right insets. Screen content does **not**. |
| Sizes to expect | Outer 466 × 678 pt (compact width), inner 951 × 669 pt landscape / 669 × 951 portrait (regular × regular) | A phone layout stretched to 951 pt is the main visual failure. |

## Shared fixes (do first)

| # | File | Problem | Severity | Fix |
|---|---|---|---|---|
| S1 | new `src/layout/adaptive.tsx` | No single source of "space actually available". 3 hooks use `useWindowDimensions`, 7 places read `Dimensions.get` once, 0 places read left/right insets. | breaks | `useAdaptiveLayout()` hook: window size, insets, `isRegular` (both sides ≥ 600 pt, i.e. inner display or iPad, never a regular iPhone), `contentWidth` (usable width capped at 640 pt on regular), left/right gutters. Plus `AdaptiveFrame` (insets + centred column), `useColumnStyle()` (cap for scroll content) and `useSheetFrame()` (bottom sheets). |
| S2 | `app/(tabs)/_layout.tsx` | Tab screens (Plan/Today, Focus, Notes, Insights) have no left/right inset, so content runs under the side status bar / Dynamic Island, and stretches to 951 pt. | breaks | `screenLayout` wraps every tab screen in `AdaptiveFrame`. One change covers all tabs. Backgrounds still bleed (the scene keeps its colour). |
| S3 | `components/blocking/SetupScreen.tsx` | `edges={['top','bottom']}` drops left/right insets for all 8 blocking setup screens. Content stretches. | breaks | Add `left`/`right` edges; centre header, content and footer in the column. |
| S4 | `src/onboarding/ui/Shell.tsx` | Onboarding top bar and `StepLayout` use only top/bottom insets. Stretches to full width. | breaks | Left/right insets + column cap on top bar, scroll content and pinned footer. Ambient background stays full-bleed. |

## Screens

| Screen / file | Problem | Severity | Proposed fix |
|---|---|---|---|
| Widgets page — `src/components/WidgetThemePicker.tsx` | Preview grid is `flexBasis: 40%` + `aspectRatio: 1`: on the inner display each preview becomes a ~460 pt square and one widget fills the screen. | breaks | Column cap (S1) + size-aware columns: 2 normally, 4 when the column is ≥ 560 pt (even count, as the skill asks). Cells stay square. |
| Widgets page — `app/widgets.tsx` | Core `SafeAreaView` (deprecated); content stretches. | looks wrong | `SafeAreaView` from `react-native-safe-area-context`, column cap on header and scroll content. |
| Onboarding widget preview — `src/onboarding/ui/WidgetPreview.tsx` | Sizes small widgets from **window** width: ~440 pt widgets on the inner display, and wider than the capped column. | breaks | Size from `contentWidth`. |
| Onboarding feature pills — `src/onboarding/ui/FeaturePills.tsx` | `maxWidth: width - GUTTER*2` from window width; wider than the column. | looks wrong | Use `contentWidth`. |
| Starting report — `app/starting-report.tsx` | No left/right inset; report (incl. the blurred locked section) stretches. Blur is `absoluteFill` over its card, so it follows the card. | breaks | Insets + column cap on top bar and scroll content. |
| Paywall — `app/paywall.tsx` | No left/right inset; sticky footer (price + CTA) stretches 951 pt and runs under the side status bar. | breaks | Insets on scroll content and footer; on regular, scroll content and footer content are centred in the column so price, button and legal stay together in one block. No visual change on regular iPhones. |
| Focus — `app/(tabs)/focus.tsx` | Form `SafeAreaView edges={['top','bottom']}`; dial uses `useWindowDimensions` (good, live). Dial: landscape `min(height-135, 240)`, portrait `min(width*0.85, 340)`; stays square. | breaks → fixed by S2 | S2 supplies the horizontal insets and the column. No dial change. |
| Plan / Today — `app/(tabs)/plan.tsx` | Full-screen custom-repeat modal stretches; it's an RN `Modal`, so outside S2. | looks wrong | Column cap inside the modal. |
| Habit heatmap — `components/plan/HabitList.tsx` | Measured with `onLayout` (good, re-flows live). Cells are square, but columns are capped at 19, so cells grow to ~30 pt on wide content. | polish | Allow up to 26 week-columns once the grid is > 480 pt wide (never on a regular iPhone in portrait). |
| Habit row menu — `components/plan/HabitList.tsx` | Menu anchored `right: 24` from the **window** edge: under the side status bar and far from the centred row. | looks wrong | Anchor at `gutterRight + 24`. |
| Habit milestone modal — `components/plan/HabitMilestoneModal.tsx` | `Dimensions.get('window')` in render: doesn't re-render on resize. | looks wrong | `useWindowDimensions`. |
| Notes — `app/(tabs)/notes.tsx` | Unused module-level `SCREEN_WIDTH`. Otherwise covered by S2. | polish | Remove constant. |
| Note detail — `app/note/[id].tsx` | Unused `SCREEN_WIDTH`; editor stretches to 951 pt (long lines). | looks wrong | Remove constant; column cap. |
| Ask Focalyst — `components/AskFocalystModal.tsx` | Unused `SCREEN_WIDTH`; 92 % bottom sheet stretches full width, under the side bar. | looks wrong | `useSheetFrame()`. |
| Profile — `app/profile.tsx` | Settings list and its bottom sheet stretch. | looks wrong | Column cap on scroll content; `useSheetFrame()` on the sheet. |
| Insights — `app/(tabs)/insights.tsx` | Charts are flex-based (fine). Its bottom-sheet modal stretches. | looks wrong | `useSheetFrame()`. |
| Group leaderboard — `components/insights/HabitGroupLeaderboardSection.tsx` | Full-screen modal stretches. | looks wrong | Column cap. |
| Blocking overlays — `components/blocking/Overlays.tsx` | Sheet slides in from `Dimensions.get('window').height` read at import: stale after a resize, so the sheet can start partly on screen. Sheet stretches. | looks wrong | Read height via `useWindowDimensions`; `useSheetFrame()`. |
| Allowed apps sheet — `components/blocking/AllowedAppsSheet.tsx` (Android only) | List height = 50 % of the launch-time window height. | polish | `useWindowDimensions`. |
| Auth / forgot password | Forms already centred at 340 pt; context `SafeAreaView` on all edges. | — | No change (sign-in not redesigned). |
| Blocking rules / unlock — `app/blocking/rules.tsx`, `unlock.tsx` | `edges={['top','bottom']}`; stretch. | breaks | Add left/right edges + column. |
| Session complete — `components/blocking/SessionSummaryModal.tsx` | Full-screen modal stretches; footer buttons 951 pt wide. | looks wrong | Column cap. |
| Habit / task forms — `components/plan/HabitForm.tsx`, `TaskForm.tsx` | Full-screen modals stretch. | looks wrong | Column cap. |
| Voice note recorder — `components/VoiceNoteRecorderModal.tsx` | Full-screen modal stretches. Core `SafeAreaView` is deprecated, but inside a full-screen `Modal` it's the one that still reports insets (the context version reports none there). | looks wrong | Column cap; keep core `SafeAreaView`. |
| Widget how-to sheet / weekly report sheet | Bottom sheets stretch. | looks wrong | `useSheetFrame()` / gorhom `style` margins. |
| Auth, forgot password, profile edit, MCP credits | Context `SafeAreaView` (all edges, good). Forms already capped at 340 pt. | polish | Column cap so headers don't sit at the far edges. |
| Splash / sign-in | No fixed sizes found. | — | None (verify in simulator). |
| Keyboard avoidance (9 files) | `KeyboardAvoidingView` + `padding`; recomputes on resize. | — | None. |
| Resize while open | Everything above that uses hooks/`onLayout` re-lays out live. The `Dimensions.get` items are the only stale reads. | — | Fixed by the items above. |

## iOS widgets (`src/widgets/*.tsx`, rendered by `ios/ExpoWidgetsTarget`)

The Swift files only wrap the JS-defined view with `.frame(maxWidth: .infinity, maxHeight: .infinity)` and the theme `containerBackground`. Layout lives in the JSX.

| Widget | Finding | Severity | Action |
|---|---|---|---|
| Heatmap | Flexible slots, square cells, aspect-locked grid. | — | None. |
| Streak | Progress track fixed at 120 pt (fits the smallest 148 pt small widget). Won't stretch on a larger small widget. | polish | Verify at iPhone Duo widget sizes; leave unless it clips. |
| Pomodoro | Button frame 112 × 30. | polish | Verify. |
| Calendar (medium) | Left column fixed at 140 pt. | polish | Verify. |
| Todo / Countdown | Flexible. | — | None. |

iPhone Duo widget point sizes aren't in the skill's references, so widget sizing is **not changed** in this pass. Palettes and `containerBackground` are untouched.

## Not done in this pass (needs your call)

- **Native tab bar** (`expo-router` native tabs / `UITabBarController`). It's the only way to get the system's vertical side bar on the outer display and the sidebar on the inner display. It changes how navigation looks and works, so it's a design change, not a layout fix.
- **Two-pane layouts on the inner display** (Notes list + note, Plan + Focus). The skill's preferred use of the inner display. Also a design change.
- **Reserved regions / fold avoidance.** React Native has no API for these; it needs a native module (skill Tier 2). Scrolling content is exempt, and the app is mostly scroll views.

## Project-wide settings

None needed. The app already allows all orientations and `UIRequiresFullScreen` is `false`.
