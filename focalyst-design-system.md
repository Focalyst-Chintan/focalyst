# Focalyst — Design System
**Version 1.0 | March 2026**
**Purpose:** Define the complete visual language of Focalyst. Feed this to AI before every coding session involving UI components.

---

## Core Instruction for AI

> Read this document completely before writing any UI code.
> Always use the exact colors, fonts, sizes, and spacing defined here.
> Never introduce new colors, fonts, or styles not listed in this document.
> All components must feel clean, minimal, and consistent across every screen.
> Mobile-first always — design for 375px width, then scale up for desktop.

---

## 1. Brand Identity

**App Name:** Focalyst
**Tagline:** Own your time.
**Personality:** Clean, focused, trustworthy, empowering
**Visual tone:** Minimal, modern, calm but purposeful
**Inspiration:** Notion (clarity), Apple Reminders (simplicity), Linear (polish)

---

## 2. Color Palette

### 2.1 Core Colors

| Name | Hex | Tailwind Custom | Usage |
|---|---|---|---|
| White | #FFFFFF | white | Page backgrounds, card backgrounds, text on dark |
| Navy Blue | #4A6C8C | navy | Primary buttons, active nav icons, headers, key UI elements |
| Light Blue Text | #95A7B5 | blue-muted | Secondary text, placeholders, timestamps, captions, inactive icons |
| Light Navy Card | #CAD6E4 | card-bg | Card backgrounds, input backgrounds, section containers, preset chips |
| Orange Accent | #FF751F | accent | Call-to-action buttons, primary actions, highlights, badges |

### 2.2 Extended Palette (Derived — Do Not Change)

| Name | Hex | Usage |
|---|---|---|
| Navy Dark | #3A5570 | Hover state for navy buttons, active states |
| Navy Darker | #2C4259 | Pressed state, sidebar background on desktop |
| Orange Dark | #E6601A | Hover state for orange/accent buttons |
| Orange Light | #FFF0E8 | Light background behind orange elements |
| Card Border | #B8C9D9 | Subtle borders on cards and inputs |
| Success Green | #2E7D52 | Habit completed, task done, success messages |
| Success Light | #E8F5EE | Green badge backgrounds |
| Error Red | #C0392B | Destructive actions, error states, delete buttons |
| Error Light | #FDEDEC | Red badge backgrounds |
| Warning Orange | #E67E22 | Warnings, streak about to break |
| Page Background | #F4F7FA | App page background (very light blue-grey, not pure white) |

### 2.3 Tailwind CSS Config

Add these custom colors to tailwind.config.js:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#4A6C8C',
          dark: '#3A5570',
          darker: '#2C4259',
        },
        accent: {
          DEFAULT: '#FF751F',
          dark: '#E6601A',
          light: '#FFF0E8',
        },
        'blue-muted': '#95A7B5',
        'card-bg': '#CAD6E4',
        'card-border': '#B8C9D9',
        'page-bg': '#F4F7FA',
        success: {
          DEFAULT: '#2E7D52',
          light: '#E8F5EE',
        },
        error: {
          DEFAULT: '#C0392B',
          light: '#FDEDEC',
        },
      },
    },
  },
}
```

### 2.4 Color Usage Rules

```
Page background:      #F4F7FA  (page-bg) — never pure white for full pages
Card backgrounds:     #CAD6E4  (card-bg) or #FFFFFF (white)
Primary actions:      #FF751F  (accent) — Start Session, Get Pro, Add New
Secondary actions:    #4A6C8C  (navy) — Continue with Google, preset chips
Destructive actions:  #C0392B  (error) — Delete, Remove
Body text:            #2C4259  (navy-darker) — main readable text
Secondary text:       #95A7B5  (blue-muted) — labels, captions, hints
Disabled text:        #B8C9D9  (card-border) — locked features, placeholders
```

---

## 3. Typography

### 3.1 Font Family

**Primary Font:** Inter (Google Fonts — free)
**Import in Next.js:**

```typescript
// app/layout.tsx
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})
```

**CSS variable:** `font-family: var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif`

No secondary font. Inter covers all needs across all weights.

---

### 3.2 Type Scale — Complete Hierarchy

| Name | Size | Weight | Line Height | Color | Usage |
|---|---|---|---|---|---|
| App Name | 20px | Bold (700) | 24px | White or Navy | Top header "FOCALYST" |
| Hero Title | 28–32px | Bold (700) | 36–40px | Navy | Welcome screen headline |
| Screen Title | 24px | SemiBold (600) | 30px | Navy | "Pomodoro", "Countdown", "Plan" |
| Section Header | 18px | SemiBold (600) | 24px | Navy-Darker | Card headers, group titles |
| Body Large | 16px | Regular (400) | 24px | Navy-Darker | Main task titles, note body |
| Body Default | 14px | Regular (400) | 20px | Navy-Darker | Labels, descriptions, list items |
| Body Small | 13px | Regular (400) | 18px | Blue-Muted | Secondary info, hints |
| Caption | 12px | Regular (400) | 16px | Blue-Muted | Timestamps, dates, counts |
| Button Text | 15px | SemiBold (600) | 20px | White or Navy | All button labels |
| Button Small | 13px | SemiBold (600) | 18px | White or Navy | Small/chip buttons |
| Input Text | 14px | Regular (400) | 20px | Navy-Darker | Text inside input fields |
| Input Label | 13px | Medium (500) | 18px | Blue-Muted | Labels above inputs |
| Badge/Tag | 11px | SemiBold (600) | 14px | White or Navy | Status badges, plan badges |
| Nav Label | 11px | Medium (500) | 14px | Navy or Blue-Muted | Bottom navigation labels |

### 3.3 Tailwind Typography Classes

```
App Name:       text-[20px] font-bold leading-6
Hero Title:     text-[28px] md:text-[32px] font-bold leading-10
Screen Title:   text-2xl font-semibold leading-8         → "Pomodoro"
Section Header: text-lg font-semibold leading-6
Body Large:     text-base font-normal leading-6
Body Default:   text-sm font-normal leading-5
Body Small:     text-[13px] font-normal leading-[18px]
Caption:        text-xs font-normal leading-4
Button Text:    text-[15px] font-semibold leading-5
Input Text:     text-sm font-normal leading-5
Input Label:    text-[13px] font-medium leading-[18px]
Badge:          text-[11px] font-semibold leading-[14px]
Nav Label:      text-[11px] font-medium leading-[14px]
```

### 3.4 Typography Rules
- Never use font weight below 400 (Regular)
- Never use more than 3 type sizes on a single screen
- Screen titles are always Navy (#4A6C8C) or Navy-Darker (#2C4259)
- Captions and secondary info always Blue-Muted (#95A7B5)
- Button text is always White on colored backgrounds
- Maximum line length: 65 characters for body text (readability)

---

## 4. Spacing System

Based on a 4px base unit. Always use multiples of 4.

| Token | Value | Tailwind | Usage |
|---|---|---|---|
| xs | 4px | p-1 / m-1 | Icon padding, tight spacing |
| sm | 8px | p-2 / m-2 | Between related elements |
| md | 12px | p-3 / m-3 | Inside compact components |
| base | 16px | p-4 / m-4 | Standard card padding, section gaps |
| lg | 20px | p-5 / m-5 | Between cards |
| xl | 24px | p-6 / m-6 | Section padding, screen margins |
| 2xl | 32px | p-8 / m-8 | Large section gaps |
| 3xl | 48px | p-12 / m-12 | Top-level screen padding |

**Standard screen padding:** 16px left/right on mobile, 24px on desktop
**Standard card padding:** 16px all sides
**Gap between cards:** 12px
**Gap between list items:** 8px

---

## 5. Border Radius

| Token | Value | Tailwind | Usage |
|---|---|---|---|
| sm | 6px | rounded | Small badges, tiny chips |
| md | 10px | rounded-[10px] | Input fields |
| lg | 12px | rounded-xl | Cards, modals, bottom sheets |
| xl | 16px | rounded-2xl | Large cards, main containers |
| full | 9999px | rounded-full | Pills, tags, circular buttons |

**Rules:**
- Cards: always `rounded-xl` (12px)
- Input fields: always `rounded-[10px]` (10px)
- Primary buttons: always `rounded-xl` (12px)
- Preset chips: always `rounded-xl` (12px)
- Profile photos: always `rounded-full`
- Badges and tags: always `rounded-full`

---

## 6. Shadows

```css
/* Card shadow — standard */
shadow-sm → box-shadow: 0 1px 3px rgba(74, 108, 140, 0.12)

/* Card shadow — elevated (modals, bottom sheets) */
shadow-md → box-shadow: 0 4px 12px rgba(74, 108, 140, 0.16)

/* Floating button shadow */
shadow-lg → box-shadow: 0 8px 24px rgba(255, 117, 31, 0.30)

/* No shadow on flat/background elements */
```

Use navy-tinted shadows (not black) to stay on-brand.

---

## 7. Component Library

---

### 7.1 Buttons

**Primary Button (Orange — Call to Action)**
Used for: Start Session, Add New, Get Pro, Continue with email
```
Background:   #FF751F (accent)
Text:         #FFFFFF white, 15px SemiBold
Height:       48px
Width:        Full width or auto with min 140px
Radius:       rounded-xl (12px)
Padding:      px-6
Hover:        background #E6601A (accent-dark)
Active:       scale-[0.98] transform
Disabled:     opacity-40, cursor-not-allowed
```

```tsx
// Tailwind classes
"w-full h-12 bg-accent hover:bg-accent-dark text-white text-[15px] 
font-semibold rounded-xl px-6 transition-all active:scale-[0.98]
disabled:opacity-40 disabled:cursor-not-allowed"
```

**Secondary Button (Navy)**
Used for: Continue with Google, secondary actions, back buttons
```
Background:   #4A6C8C (navy)
Text:         #FFFFFF white, 15px SemiBold
Height:       48px
Radius:       rounded-xl (12px)
Hover:        background #3A5570 (navy-dark)
```

```tsx
"w-full h-12 bg-navy hover:bg-navy-dark text-white text-[15px] 
font-semibold rounded-xl px-6 transition-all active:scale-[0.98]"
```

**Outline Button**
Used for: Sign in link, secondary less-important actions
```
Background:   transparent
Border:       1.5px solid #4A6C8C
Text:         #4A6C8C, 15px SemiBold
Height:       48px
Radius:       rounded-xl
Hover:        background #F4F7FA
```

**Preset Chip Button (Pomodoro)**
Used for: 25/5×4, 45/10×3 preset options
```
Background:   #4A6C8C (navy) — selected state
Background:   #CAD6E4 (card-bg) — unselected state
Text:         #FFFFFF (selected) or #4A6C8C (unselected), 13px SemiBold
Height:       44px
Radius:       rounded-xl
Width:        ~48% (2 columns)
```

**Destructive Button**
Used for: Delete account, remove habit, clear data
```
Background:   #C0392B (error)
Text:         #FFFFFF white
Height:       48px
Radius:       rounded-xl
```

**Icon Button (Floating Action)**
Used for: + Add new button
```
Background:   #FF751F (accent)
Icon:         White, 24px
Size:         56px × 56px
Radius:       rounded-full
Shadow:       shadow-lg (orange-tinted)
Position:     Fixed, bottom-right on mobile
```

---

### 7.2 Input Fields

**Standard Input**
```
Background:   #FFFFFF white
Border:       1.5px solid #CAD6E4 (card-bg)
Border Focus: 1.5px solid #4A6C8C (navy)
Height:       48px
Radius:       rounded-[10px]
Padding:      px-4
Text:         14px Regular, #2C4259
Placeholder:  14px Regular, #95A7B5 (blue-muted)
Label above:  13px Medium, #95A7B5, mb-1
```

```tsx
"w-full h-12 bg-white border border-card-bg focus:border-navy
rounded-[10px] px-4 text-sm text-navy-darker placeholder:text-blue-muted
outline-none transition-colors"
```

**Input Error State**
```
Border:       1.5px solid #C0392B (error)
Error text:   12px Regular, #C0392B, below input, mt-1
```

**Disabled Input (Free Plan Lock)**
```
Background:   #F4F7FA (page-bg)
Border:       1.5px solid #CAD6E4
Text:         #B8C9D9 (card-border)
Cursor:       not-allowed
Lock icon:    Shown inside input, right side, #95A7B5
```

---

### 7.3 Cards

**Standard Card**
```
Background:   #CAD6E4 (card-bg)
Radius:       rounded-xl (12px)
Padding:      p-4 (16px)
Shadow:       shadow-sm
Border:       none
```

**White Card (elevated content)**
```
Background:   #FFFFFF
Radius:       rounded-xl (12px)
Padding:      p-4
Shadow:       shadow-sm
Border:       1px solid #CAD6E4
```

**Summary Card (Insights tab)**
```
Background:   #4A6C8C (navy)
Text:         #FFFFFF white
Radius:       rounded-xl
Padding:      p-4
```

---

### 7.4 Bottom Navigation Bar

```
Background:   #FFFFFF white
Height:       64px + safe area inset
Border top:   1px solid #CAD6E4
Shadow:       0 -2px 8px rgba(74, 108, 140, 0.08)

Tab item:
  Icon size:      24px
  Label:          11px Medium
  Active color:   #4A6C8C (navy)
  Inactive color: #95A7B5 (blue-muted)
  Active indicator: small navy dot or underline above icon
```

**4 tabs:**
```
[ 📅 Plan ]  [ 🎯 Focus ]  [ 📝 Notes ]  [ 📊 Insights ]
```

---

### 7.5 Top Header Bar

```
Background:   #FFFFFF white or transparent
Height:       56px
Left:         Profile avatar (32px circle)
Center:       "FOCALYST" — 20px Bold, #4A6C8C navy
Right:        AI chat icon button (24px, navy)
Border bottom: 1px solid #CAD6E4 (subtle)
```

---

### 7.6 Bottom Sheet / Modal

Used for: Add task, Add habit, Add countdown, AI chat, Upgrade modal
```
Background:       #FFFFFF
Border radius:    rounded-t-2xl (top corners only, 16px)
Handle bar:       4px × 32px, #CAD6E4, centered, mt-3
Padding:          px-4 pt-6 pb-8
Overlay:          rgba(44, 66, 89, 0.5) — navy-tinted backdrop
Max height:       85vh on mobile
Animation:        slide up from bottom (300ms ease-out)
```

---

### 7.7 Badges and Tags

**Plan Badge**
```
Free:     background #CAD6E4, text #4A6C8C, "FREE"
Pro:      background #4A6C8C, text #FFFFFF, "PRO"
Lifetime: background #FF751F, text #FFFFFF, "LIFETIME"
Size:     rounded-full px-2.5 py-0.5, 11px SemiBold
```

**Priority Badge**
```
High:   background #FDEDEC, text #C0392B, "HIGH"
Medium: background #FFF0E8, text #FF751F, "MEDIUM"
Low:    background #F4F7FA, text #95A7B5, "LOW"
```

**Status Badge**
```
Focus Time:  background #4A6C8C, text white
Break Time:  background #2E7D52, text white
Size:        rounded-full px-3 py-1, 11px SemiBold
```

---

### 7.8 Progress Bar

Used in: Pomodoro timer, habit streak, insights
```
Track:       background #CAD6E4, height 6px, rounded-full
Fill:        background #FF751F (accent) for Pomodoro
Fill:        background #4A6C8C (navy) for habits/general
Animation:   transition-all duration-300 ease-linear
```

---

### 7.9 Checkbox (Task Complete)

```
Unchecked:  border 2px solid #CAD6E4, background white, 20px circle
Checked:    background #4A6C8C (navy), white checkmark icon, 20px circle
Animation:  scale 0.8 to 1.0 on check (satisfying micro-animation)
Completed task text: line-through, color #95A7B5 (blue-muted)
```

---

### 7.10 Habit Completion Circle

```
Incomplete: border 2.5px solid #CAD6E4, background transparent, 32px
Complete:   background #4A6C8C (navy), white checkmark, 32px
Missed:     background #FDEDEC, red border, 32px
Animation:  fill animation on tap (200ms)
```

---

### 7.11 Countdown Card

```
Days number:    32px Bold, #FF751F (accent) — the big number
"Days to":      14px Regular, #4A6C8C navy
Event name:     13px Regular, #95A7B5 blue-muted
Date:           12px Regular, #95A7B5 blue-muted
Card:           White background, rounded-xl, shadow-sm
Three-dot menu: top right, #95A7B5
```

---

### 7.12 Empty State

When a section has no content yet:
```
Icon:       48px, #CAD6E4 (light, not distracting)
Title:      16px SemiBold, #4A6C8C
Subtitle:   14px Regular, #95A7B5
CTA button: Orange accent button if action available
Spacing:    Centered vertically in available space
```

Example:
```
        📋
  No tasks yet
  Tap + to add your first task
  [ + Add Task ]
```

---

### 7.13 Loading States

Never show a blank screen. Always show skeleton loaders.
```
Skeleton color:     #CAD6E4 with shimmer animation
Skeleton radius:    matches the component it replaces
Animation:          shimmer left to right, 1.5s loop
```

```tsx
// Skeleton shimmer class
"animate-pulse bg-card-bg rounded-xl"
```

---

### 7.14 Upgrade Lock State

For locked features on free plan:
```
Lock icon:    16px, #95A7B5, shown inline or overlay
Disabled bg:  #F4F7FA
Disabled text: #B8C9D9
Tooltip:      "Pro feature — tap to upgrade"
Overlay:      Semi-transparent white overlay with lock icon centered
```

---

## 8. Iconography

**Icon library:** Lucide React (free, open source, consistent style)
**Install:** `npm install lucide-react`

**Standard sizes:**
```
Navigation icons:  24px
In-card icons:     20px
Inline/text icons: 16px
Large feature:     32–48px
```

**Key icons to use:**

| Feature | Icon Name (Lucide) |
|---|---|
| Plan / Tasks | CalendarCheck |
| Focus / Pomodoro | Target |
| Notes | FileText |
| Insights / Dashboard | BarChart2 |
| AI Chat | MessageCircle |
| Add / Plus | Plus |
| Settings | Settings |
| User / Profile | UserCircle |
| Habit | Zap |
| Countdown | Timer |
| Flag / Priority | Flag |
| Reminder | Bell |
| Complete / Check | CheckCircle2 |
| Delete | Trash2 |
| Edit | Pencil |
| Lock | Lock |
| Close | X |
| Back | ChevronLeft |
| More options | MoreVertical |
| Streak | Flame |
| Export | Download |
| Logout | LogOut |
| Speech to text | Mic |

---

## 9. Screen Layout Structure

### Mobile (375px — Primary)

```
┌─────────────────────────────┐  ← Status bar (OS)
│  [Avatar]  FOCALYST  [Chat] │  ← Top header (56px)
├─────────────────────────────┤
│                             │
│     Screen Content          │  ← Scrollable content area
│     (16px left/right        │     height = 100vh - 56px - 64px
│      padding)               │
│                             │
├─────────────────────────────┤
│  [Plan] [Focus] [+] [Notes] [Insights] │  ← Bottom nav (64px)
└─────────────────────────────┘
```

### Desktop (1280px+)

```
┌────────┬────────────────────────┬──────────────┐
│        │  [Avatar] FOCALYST [Chat]│              │
│  Side  ├────────────────────────┤   AI Chat    │
│  Nav   │                        │   Panel      │
│        │   Screen Content       │   (380px)    │
│ (240px)│   (max-width 800px)    │   Slide-in   │
│        │   centered             │              │
│ Plan   │                        │              │
│ Focus  │                        │              │
│ Notes  │                        │              │
│Insights│                        │              │
└────────┴────────────────────────┴──────────────┘
```

---

## 10. Motion & Animation

**Principles:** Subtle, purposeful, fast. Never decorative for its own sake.

| Interaction | Animation | Duration | Easing |
|---|---|---|---|
| Bottom sheet open | Slide up | 300ms | ease-out |
| Bottom sheet close | Slide down | 250ms | ease-in |
| Tab switch | Fade + slight slide | 200ms | ease-out |
| Button press | scale(0.98) | 100ms | ease-in-out |
| Task complete | Checkbox fill + strikethrough | 200ms | ease-out |
| Habit complete | Circle fill + bounce | 300ms | spring |
| Page transition | Fade | 200ms | ease |
| Skeleton shimmer | Left to right | 1500ms | linear loop |
| Upgrade modal | Fade in + scale up | 250ms | ease-out |
| Pomodoro progress | Continuous | Real-time | linear |

**Rule:** If an animation takes more than 400ms, it feels slow. Keep everything snappy.

---

## 11. Responsive Breakpoints

```javascript
// tailwind.config.js breakpoints
screens: {
  'sm': '375px',   // Mobile (primary)
  'md': '768px',   // Tablet
  'lg': '1024px',  // Small desktop
  'xl': '1280px',  // Desktop
  '2xl': '1440px', // Large desktop
}
```

**Key responsive changes:**
- Bottom nav → Left sidebar at `lg` (1024px+)
- Single column → Two column cards at `md` (768px+)
- Content max-width: 800px centered at `lg`+
- AI chat: Bottom sheet → Right side panel at `lg`+
- Screen padding: 16px mobile → 24px tablet → 32px desktop

---

## 12. Accessibility

- Minimum tap target size: 44px × 44px on all interactive elements
- Color contrast: All text meets WCAG AA (4.5:1 minimum)
- Focus states: Visible `outline: 2px solid #4A6C8C` on keyboard focus
- Icon buttons: Always include `aria-label`
- Form inputs: Always include `<label>` elements
- Error messages: Linked to inputs via `aria-describedby`

---

## 13. Design System Quick Reference Card

```
COLORS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
White:        #FFFFFF   — backgrounds
Navy:         #4A6C8C   — primary UI, buttons
Blue-Muted:   #95A7B5   — secondary text
Card-BG:      #CAD6E4   — card fills, inputs
Accent:       #FF751F   — CTAs, highlights
Page-BG:      #F4F7FA   — app background

FONT: Inter
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Screen Title: 24px SemiBold  → "Pomodoro"
Section Head: 18px SemiBold  → card headers
Body:         14–16px Regular → content
Caption:      12px Regular    → dates, counts
Button:       15px SemiBold   → all buttons
Nav Label:    11px Medium      → tab labels

RADIUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Cards:        12px (rounded-xl)
Buttons:      12px (rounded-xl)
Inputs:       10px (rounded-[10px])
Pills/Tags:   9999px (rounded-full)
Bottom sheet: 16px top corners

SPACING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Screen edge:  16px mobile / 24px desktop
Card padding: 16px
Card gap:     12px
Item gap:     8px
```

---

## 14. Opening Prompt for Every UI Coding Session

```
Before writing any UI code for Focalyst, confirm you will follow
this design system exactly:

COLORS: White #FFFFFF, Navy #4A6C8C, Blue-Muted #95A7B5,
Card-BG #CAD6E4, Accent (CTA) #FF751F, Page-BG #F4F7FA

FONT: Inter only. Screen titles 24px SemiBold navy.
Body 14px regular navy-darker. Captions 12px blue-muted.
Buttons 15px SemiBold white.

COMPONENTS: Cards rounded-xl with card-bg background.
Inputs rounded-[10px] white background navy focus border.
Primary buttons accent orange rounded-xl full width.
Secondary buttons navy rounded-xl.

LAYOUT: Mobile-first 375px. 16px screen padding.
Bottom nav bar on mobile, left sidebar on desktop 1024px+.

Keep all UI clean, minimal, and consistent.
Never introduce colors or fonts not in this document.
```

---

*Focalyst Design System v1.0 — March 2026*
*This document defines the complete visual language of Focalyst. No deviations.*
