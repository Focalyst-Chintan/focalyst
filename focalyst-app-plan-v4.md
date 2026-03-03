# Focalyst — App Plan & AI Developer Guidelines
**Version 4.0 | March 2026**
**Purpose:** Master blueprint for AI-assisted development of Focalyst. Includes exact SVG icons from Figma. Feed this file at the start of every coding session.

---

## CRITICAL ICON RULE FOR AI

> **Never use Lucide React icons or any other icon library.**
> Every icon in this app is a custom SVG provided in Section 2 of this document.
> Copy the exact SVG code provided. Do not substitute, resize freely, or modify paths.
> All SVGs use stroke color `#33363F` by default.
> When an icon is active (selected tab), change stroke and fill to `#4A6C8C` (navy).
> When an icon is inactive, use `#95A7B5` (blue-muted).
> Wrap every SVG in a reusable React component as shown in Section 2.

---

## 1. What is Focalyst?

Focalyst is an AI-powered all-in-one productivity web application. It replaces the need for separate task managers, focus timers, note apps, and habit trackers with one cohesive experience.

**Tagline:** Own your time.
**Value proposition:** Your all-in-one productivity hub.

**Tech Stack:**
- Framework: Next.js 14 (App Router, TypeScript)
- Styling: Tailwind CSS with custom brand tokens
- Database + Auth: Supabase (PostgreSQL + Google OAuth)
- AI: Gemini 1.5 Flash API (server-side only)
- Payments: Razorpay
- Hosting: Vercel (auto-deploy from GitHub)
- Icons: Custom SVGs from Figma ONLY (see Section 2)
- Charts: Recharts
- IDE: Google IDX

---

## 2. Icon Library — Exact SVG Code from Figma

Create each icon as a reusable TypeScript React component in `/components/icons/`.
Pass `size`, `color`, and `className` as optional props.

---

### 2.1 App Logo

**File:** `/components/icons/FocalystLogo.tsx`
**Usage:** Welcome screen, splash screen, top of onboarding

```tsx
export const FocalystLogo = ({ size = 64 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 369 369" fill="none"
    xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink">
    <rect width="369" height="369" fill="url(#pattern0_1_13)"/>
    <defs>
      <pattern id="pattern0_1_13" patternContentUnits="objectBoundingBox" width="1" height="1">
        <use xlinkHref="#image0_1_13" transform="scale(0.0005)"/>
      </pattern>
    </defs>
  </svg>
)
```

> Note: The logo uses a base64 PNG embedded inside the SVG pattern. Use the full SVG string from `Focalysts_assets.md` when implementing. Store it in `/public/logo.svg` and reference with Next.js `<Image>` for best performance.

---

### 2.2 User Account Icon

**File:** `/components/icons/UserAccountIcon.tsx`
**Location:** Top-left corner of every screen header
**Size in app:** 32×32px
**Tap action:** Opens Profile / Account page

```tsx
export const UserAccountIcon = ({
  size = 32,
  color = "#33363F",
  className = "",
}: {
  size?: number
  color?: string
  className?: string
}) => (
  <svg width={size} height={size} viewBox="0 0 32 32"
    fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="16" cy="13.3333" r="4"
      stroke={color} strokeWidth="2.66667" strokeLinecap="round"/>
    <circle cx="16" cy="16" r="12"
      stroke={color} strokeWidth="2.66667"/>
    <path d="M23.7074 25.1019C23.8769 25.0088 23.957 24.8073 23.8854 24.6277C23.3712 23.3393 22.3808 22.2046 21.0419 21.3776C19.5955 20.4843 17.8232 20 16 20C14.1768 20 12.4046 20.4842 10.9581 21.3776C9.61925 22.2046 8.6288 23.3393 8.11464 24.6277C8.04298 24.8073 8.12314 25.0088 8.29264 25.1019C13.0929 27.7373 18.9071 27.7373 23.7074 25.1019Z"
      fill={color}/>
  </svg>
)
```

---

### 2.3 AI Chat Icon

**File:** `/components/icons/AIChatIcon.tsx`
**Location:** Top-right corner of every screen header
**Size in app:** 37×37px
**Tap action:** Opens AI chat panel / bottom sheet

```tsx
export const AIChatIcon = ({
  size = 37,
  color = "#33363F",
  className = "",
}: {
  size?: number
  color?: string
  className?: string
}) => (
  <svg width={size} height={size} viewBox="0 0 37 37"
    fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M18.5 6.16666C25.3115 6.16666 30.8334 11.6885 30.8334 18.5V26.3485C30.8334 27.6537 30.8334 28.3063 30.6389 28.8275C30.3264 29.6654 29.6655 30.3264 28.8275 30.6389C28.3063 30.8333 27.6537 30.8333 26.3485 30.8333H18.5C11.6885 30.8333 6.16669 25.3115 6.16669 18.5"
      stroke={color} strokeWidth="3.08333"/>
    <path d="M13.875 16.9583L23.125 16.9583"
      stroke={color} strokeWidth="3.08333" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7.70831 12.3333L7.70831 3.08334"
      stroke={color} strokeWidth="3.08333" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3.08331 7.70834L12.3333 7.70834"
      stroke={color} strokeWidth="3.08333" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18.5 23.125H23.125"
      stroke={color} strokeWidth="3.08333" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
```

---

### 2.4 Plan Tab Icon

**File:** `/components/icons/PlanTabIcon.tsx`
**Location:** Bottom navigation bar — Tab 1
**Size in app:** 24×24px (scaled down from 48×48 viewBox)
**Active color:** `#4A6C8C` | **Inactive color:** `#95A7B5`

```tsx
export const PlanTabIcon = ({
  size = 24,
  color = "#95A7B5",
  className = "",
}: {
  size?: number
  color?: string
  className?: string
}) => (
  <svg width={size} height={size} viewBox="0 0 48 48"
    fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="5.9624" y="11.9247" width="35.7743" height="29.8119" rx="3.97492"
      stroke={color} strokeWidth="3.97492"/>
    <path d="M5.9624 19.8746C5.9624 16.127 5.9624 14.2532 7.12663 13.089C8.29086 11.9247 10.1647 11.9247 13.9122 11.9247H33.7869C37.5344 11.9247 39.4082 11.9247 40.5725 13.089C41.7367 14.2532 41.7367 16.127 41.7367 19.8746H5.9624Z"
      fill={color}/>
    <path d="M13.9122 5.9624L13.9122 11.9248"
      stroke={color} strokeWidth="3.97492" strokeLinecap="round"/>
    <path d="M33.7869 5.9624L33.7869 11.9248"
      stroke={color} strokeWidth="3.97492" strokeLinecap="round"/>
  </svg>
)
```

---

### 2.5 Focus Tab Icon

**File:** `/components/icons/FocusTabIcon.tsx`
**Location:** Bottom navigation bar — Tab 2
**Size in app:** 24×24px
**Active color:** `#4A6C8C` | **Inactive color:** `#95A7B5`

```tsx
export const FocusTabIcon = ({
  size = 24,
  color = "#95A7B5",
  className = "",
}: {
  size?: number
  color?: string
  className?: string
}) => (
  <svg width={size} height={size} viewBox="0 0 48 48"
    fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="23.8495" cy="23.8495" r="13.9122"
      stroke={color} strokeWidth="3.97492"/>
    <circle cx="23.8496" cy="23.8496" r="3.97492"
      fill={color} stroke={color} strokeWidth="3.97492"/>
    <path d="M23.8495 9.93732V5.9624"
      stroke={color} strokeWidth="3.97492" strokeLinecap="round"/>
    <path d="M37.7618 23.8495L41.7367 23.8495"
      stroke={color} strokeWidth="3.97492" strokeLinecap="round"/>
    <path d="M23.8495 41.7367L23.8495 37.7618"
      stroke={color} strokeWidth="3.97492" strokeLinecap="round"/>
    <path d="M5.96233 23.8495H9.93726"
      stroke={color} strokeWidth="3.97492" strokeLinecap="round"/>
  </svg>
)
```

---

### 2.6 Quick Add (+) Icon

**File:** `/components/icons/QuickAddIcon.tsx`
**Location:** Centre of bottom navigation bar — NOT a tab
**Size in app:** 24×24px inside a 56×56px orange circle button
**Color:** Always white `#FFFFFF` (sits on orange accent background)

```tsx
export const QuickAddIcon = ({
  size = 24,
  color = "#FFFFFF",
  className = "",
}: {
  size?: number
  color?: string
  className?: string
}) => (
  <svg width={size} height={size} viewBox="0 0 48 48"
    fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M23.8495 11.9247L23.8495 35.7743"
      stroke={color} strokeWidth="3.97492" strokeLinecap="square" strokeLinejoin="round"/>
    <path d="M35.7743 23.8495L11.9248 23.8495"
      stroke={color} strokeWidth="3.97492" strokeLinecap="square" strokeLinejoin="round"/>
  </svg>
)
```

**Button wrapper:**
```tsx
// In BottomNav component
<button className="w-14 h-14 rounded-full bg-accent flex items-center justify-center shadow-lg">
  <QuickAddIcon size={24} color="#FFFFFF" />
</button>
```

---

### 2.7 Quick Add — New Task Option Icon

**File:** `/components/icons/NewTaskIcon.tsx`
**Location:** Floating capsule that appears after tapping Quick Add (+)
**Size in app:** 40×40px
**Color:** `#33363F`

```tsx
export const NewTaskIcon = ({
  size = 40,
  color = "#33363F",
  className = "",
}: {
  size?: number
  color?: string
  className?: string
}) => (
  <svg width={size} height={size} viewBox="0 0 40 40"
    fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="5" y="10" width="30" height="25" rx="3.33333"
      stroke={color} strokeWidth="3.33333"/>
    <path d="M6.66663 18.3333H33.3333"
      stroke={color} strokeWidth="3.33333" strokeLinecap="round"/>
    <path d="M16.6666 26.6667H23.3333"
      stroke={color} strokeWidth="3.33333" strokeLinecap="round"/>
    <path d="M20 23.3333L20 30"
      stroke={color} strokeWidth="3.33333" strokeLinecap="round"/>
    <path d="M13.3334 5L13.3334 11.6667"
      stroke={color} strokeWidth="3.33333" strokeLinecap="round"/>
    <path d="M26.6666 5L26.6666 11.6667"
      stroke={color} strokeWidth="3.33333" strokeLinecap="round"/>
  </svg>
)
```

---

### 2.8 Quick Add — New Session Option Icon

**File:** `/components/icons/NewSessionIcon.tsx`
**Location:** Floating capsule that appears after tapping Quick Add (+)
**Size in app:** 40×40px
**Color:** `#33363F`

```tsx
export const NewSessionIcon = ({
  size = 40,
  color = "#33363F",
  className = "",
}: {
  size?: number
  color?: string
  className?: string
}) => (
  <svg width={size} height={size} viewBox="0 0 40 40"
    fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="20.0001" cy="23.3333" r="13.3333"
      stroke={color} strokeWidth="3.33333"/>
    <path d="M20 23.3333L20 18.3333"
      stroke={color} strokeWidth="3.33333" strokeLinecap="round"/>
    <path d="M29.1667 12.5L31.6668 10"
      stroke={color} strokeWidth="3.33333" strokeLinecap="round"/>
    <path d="M16.7802 3.95096C16.9701 3.77377 17.3886 3.61719 17.9707 3.50552C18.5529 3.39384 19.2661 3.33331 19.9999 3.33331C20.7337 3.33331 21.447 3.39384 22.0291 3.50552C22.6113 3.61719 23.0298 3.77377 23.2197 3.95096"
      stroke={color} strokeWidth="3.33333" strokeLinecap="round"/>
  </svg>
)
```

---

### 2.9 Quick Add — New Note Option Icon

**File:** `/components/icons/NewNoteIcon.tsx`
**Location:** Floating capsule that appears after tapping Quick Add (+)
**Size in app:** 40×40px
**Color:** `#33363F`

```tsx
export const NewNoteIcon = ({
  size = 40,
  color = "#33363F",
  className = "",
}: {
  size?: number
  color?: string
  className?: string
}) => (
  <svg width={size} height={size} viewBox="0 0 40 40"
    fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M15 21.6667L25 21.6667"
      stroke={color} strokeWidth="3.33333" strokeLinecap="round"/>
    <path d="M15 15L21.6667 15"
      stroke={color} strokeWidth="3.33333" strokeLinecap="round"/>
    <path d="M15 28.3333L21.6667 28.3333"
      stroke={color} strokeWidth="3.33333" strokeLinecap="round"/>
    <path d="M31.6666 21.6667V25C31.6666 29.714 31.6666 32.0711 30.2021 33.5355C28.7377 35 26.3806 35 21.6666 35H18.3333C13.6192 35 11.2622 35 9.79772 33.5355C8.33325 32.0711 8.33325 29.714 8.33325 25V15C8.33325 10.286 8.33325 7.92893 9.79772 6.46447C11.2622 5 13.6192 5 18.3333 5"
      stroke={color} strokeWidth="3.33333"/>
    <path d="M30 5L30 15"
      stroke={color} strokeWidth="3.33333" strokeLinecap="round"/>
    <path d="M35 10L25 10"
      stroke={color} strokeWidth="3.33333" strokeLinecap="round"/>
  </svg>
)
```

---

### 2.10 Notes Tab Icon

**File:** `/components/icons/NotesTabIcon.tsx`
**Location:** Bottom navigation bar — Tab 3
**Size in app:** 24×24px
**Active color:** `#4A6C8C` | **Inactive color:** `#95A7B5`

```tsx
export const NotesTabIcon = ({
  size = 24,
  color = "#95A7B5",
  className = "",
}: {
  size?: number
  color?: string
  className?: string
}) => (
  <svg width={size} height={size} viewBox="0 0 48 48"
    fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M26.1779 5.9624H17.8871C14.1395 5.9624 12.2657 5.9624 11.1015 7.12663C9.93726 8.29086 9.93726 10.1647 9.93726 13.9122V33.7869C9.93726 37.5344 9.93726 39.4082 11.1015 40.5725C12.2657 41.7367 14.1395 41.7367 17.8871 41.7367H29.8119C33.5595 41.7367 35.4333 41.7367 36.5975 40.5725C37.7617 39.4082 37.7617 37.5344 37.7617 33.7869V17.5462C37.7617 16.7338 37.7617 16.3276 37.6104 15.9624C37.4591 15.5971 37.1719 15.3099 36.5975 14.7355L28.9886 7.12663C28.4142 6.55219 28.127 6.26498 27.7617 6.11369C27.3965 5.9624 26.9903 5.9624 26.1779 5.9624Z"
      stroke={color} strokeWidth="3.97492"/>
    <path d="M17.8871 25.837L29.8118 25.837"
      stroke={color} strokeWidth="3.97492" strokeLinecap="round"/>
    <path d="M17.8871 33.7869L25.8369 33.7869"
      stroke={color} strokeWidth="3.97492" strokeLinecap="round"/>
    <path d="M25.837 5.9624V13.9122C25.837 15.786 25.837 16.7229 26.4191 17.3051C27.0013 17.8872 27.9382 17.8872 29.812 17.8872H37.7618"
      stroke={color} strokeWidth="3.97492"/>
  </svg>
)
```

---

### 2.11 Insights Tab Icon

**File:** `/components/icons/InsightsTabIcon.tsx`
**Location:** Bottom navigation bar — Tab 4
**Size in app:** 24×24px
**Active color:** `#4A6C8C` | **Inactive color:** `#95A7B5`

```tsx
export const InsightsTabIcon = ({
  size = 24,
  color = "#95A7B5",
  className = "",
}: {
  size?: number
  color?: string
  className?: string
}) => (
  <svg width={size} height={size} viewBox="0 0 48 48"
    fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M41.7367 39.7492H5.9624"
      stroke={color} strokeWidth="3.97492" strokeLinecap="round"/>
    <path d="M19.8746 31.7993V19.8746C19.8746 17.6793 18.095 15.8997 15.8997 15.8997C13.7044 15.8997 11.9248 17.6793 11.9248 19.8746V31.7993"
      stroke={color} strokeWidth="3.97492" strokeLinecap="round"/>
    <path d="M35.7743 31.7994V11.9248C35.7743 9.72946 33.9947 7.94983 31.7994 7.94983C29.6041 7.94983 27.8245 9.72946 27.8245 11.9247V31.7994"
      stroke={color} strokeWidth="3.97492" strokeLinecap="round"/>
  </svg>
)
```

---

### 2.12 Icon Index File

Create `/components/icons/index.ts` to export all icons cleanly:

```typescript
export { FocalystLogo } from './FocalystLogo'
export { UserAccountIcon } from './UserAccountIcon'
export { AIChatIcon } from './AIChatIcon'
export { PlanTabIcon } from './PlanTabIcon'
export { FocusTabIcon } from './FocusTabIcon'
export { QuickAddIcon } from './QuickAddIcon'
export { NewTaskIcon } from './NewTaskIcon'
export { NewSessionIcon } from './NewSessionIcon'
export { NewNoteIcon } from './NewNoteIcon'
export { NotesTabIcon } from './NotesTabIcon'
export { InsightsTabIcon } from './InsightsTabIcon'
```

---

## 3. Icon Usage Map — Where Each Icon Appears

| Icon Component | Location | Size | Default Color | Active Color |
|---|---|---|---|---|
| `FocalystLogo` | Welcome screen, splash | 64px | — | — |
| `UserAccountIcon` | Header top-left, every screen | 32px | `#33363F` | `#4A6C8C` |
| `AIChatIcon` | Header top-right, every screen | 37px | `#33363F` | `#4A6C8C` |
| `PlanTabIcon` | Bottom nav Tab 1 | 24px | `#95A7B5` | `#4A6C8C` |
| `FocusTabIcon` | Bottom nav Tab 2 | 24px | `#95A7B5` | `#4A6C8C` |
| `QuickAddIcon` | Bottom nav centre button | 24px | `#FFFFFF` | `#FFFFFF` |
| `NewTaskIcon` | Quick add floating capsule | 40px | `#33363F` | — |
| `NewSessionIcon` | Quick add floating capsule | 40px | `#33363F` | — |
| `NewNoteIcon` | Quick add floating capsule | 40px | `#33363F` | — |
| `NotesTabIcon` | Bottom nav Tab 3 | 24px | `#95A7B5` | `#4A6C8C` |
| `InsightsTabIcon` | Bottom nav Tab 4 | 24px | `#95A7B5` | `#4A6C8C` |

---

## 4. Bottom Navigation Bar — Complete Implementation

```tsx
// components/shared/BottomNav.tsx
'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  PlanTabIcon, FocusTabIcon, QuickAddIcon,
  NotesTabIcon, InsightsTabIcon,
  NewTaskIcon, NewSessionIcon, NewNoteIcon
} from '@/components/icons'

const ACTIVE = '#4A6C8C'
const INACTIVE = '#95A7B5'

export const BottomNav = () => {
  const pathname = usePathname()
  const router = useRouter()
  const [showQuickAdd, setShowQuickAdd] = useState(false)

  const tabs = [
    { path: '/plan',     icon: PlanTabIcon,     label: 'Plan'     },
    { path: '/focus',    icon: FocusTabIcon,    label: 'Focus'    },
    { path: '/notes',    icon: NotesTabIcon,    label: 'Notes'    },
    { path: '/insights', icon: InsightsTabIcon, label: 'Insights' },
  ]

  return (
    <>
      {/* Quick add overlay */}
      {showQuickAdd && (
        <div className="fixed inset-0 z-40" onClick={() => setShowQuickAdd(false)}>
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-white
            rounded-2xl shadow-xl px-6 py-4 flex gap-6 items-center">
            <button onClick={() => { router.push('/plan/new-task'); setShowQuickAdd(false) }}
              className="flex flex-col items-center gap-1">
              <NewTaskIcon size={40} color="#33363F" />
              <span className="text-[11px] font-medium text-navy">Task</span>
            </button>
            <button onClick={() => { router.push('/focus'); setShowQuickAdd(false) }}
              className="flex flex-col items-center gap-1">
              <NewSessionIcon size={40} color="#33363F" />
              <span className="text-[11px] font-medium text-navy">Session</span>
            </button>
            <button onClick={() => { router.push('/notes/new'); setShowQuickAdd(false) }}
              className="flex flex-col items-center gap-1">
              <NewNoteIcon size={40} color="#33363F" />
              <span className="text-[11px] font-medium text-navy">Note</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t
        border-card-bg flex items-center justify-around z-50 px-2"
        style={{ boxShadow: '0 -2px 8px rgba(74,108,140,0.08)' }}>

        {/* Tab 1 — Plan */}
        <button onClick={() => router.push('/plan')}
          className="flex flex-col items-center gap-1">
          <PlanTabIcon size={24} color={pathname.startsWith('/plan') ? ACTIVE : INACTIVE} />
          <span className={`text-[11px] font-medium ${pathname.startsWith('/plan')
            ? 'text-navy' : 'text-blue-muted'}`}>Plan</span>
        </button>

        {/* Tab 2 — Focus */}
        <button onClick={() => router.push('/focus')}
          className="flex flex-col items-center gap-1">
          <FocusTabIcon size={24} color={pathname.startsWith('/focus') ? ACTIVE : INACTIVE} />
          <span className={`text-[11px] font-medium ${pathname.startsWith('/focus')
            ? 'text-navy' : 'text-blue-muted'}`}>Focus</span>
        </button>

        {/* Centre — Quick Add */}
        <button onClick={() => setShowQuickAdd(!showQuickAdd)}
          className="w-14 h-14 rounded-full bg-accent flex items-center
          justify-center -mt-4 shadow-lg">
          <QuickAddIcon size={24} color="#FFFFFF" />
        </button>

        {/* Tab 3 — Notes */}
        <button onClick={() => router.push('/notes')}
          className="flex flex-col items-center gap-1">
          <NotesTabIcon size={24} color={pathname.startsWith('/notes') ? ACTIVE : INACTIVE} />
          <span className={`text-[11px] font-medium ${pathname.startsWith('/notes')
            ? 'text-navy' : 'text-blue-muted'}`}>Notes</span>
        </button>

        {/* Tab 4 — Insights */}
        <button onClick={() => router.push('/insights')}
          className="flex flex-col items-center gap-1">
          <InsightsTabIcon size={24} color={pathname.startsWith('/insights') ? ACTIVE : INACTIVE} />
          <span className={`text-[11px] font-medium ${pathname.startsWith('/insights')
            ? 'text-navy' : 'text-blue-muted'}`}>Insights</span>
        </button>

      </nav>
    </>
  )
}
```

---

## 5. Top Header Bar — Complete Implementation

```tsx
// components/shared/Header.tsx
'use client'
import { useRouter } from 'next/navigation'
import { UserAccountIcon } from '@/components/icons/UserAccountIcon'
import { AIChatIcon } from '@/components/icons/AIChatIcon'

export const Header = ({ onOpenAIChat }: { onOpenAIChat: () => void }) => {
  const router = useRouter()
  return (
    <header className="h-14 bg-white border-b border-card-bg flex items-center
      justify-between px-4 sticky top-0 z-30">
      <button onClick={() => router.push('/account')} className="p-1">
        <UserAccountIcon size={32} color="#33363F" />
      </button>
      <span className="text-[20px] font-bold text-navy tracking-wide">FOCALYST</span>
      <button onClick={onOpenAIChat} className="p-1">
        <AIChatIcon size={37} color="#33363F" />
      </button>
    </header>
  )
}
```

---

## 6. AI Builder Rules

### 6.1 DOs

- **Use ONLY the SVG components defined in Section 2.** No Lucide, no Heroicons, no emoji.
- **Brand colors only.** Five approved values:
  ```
  White:        #FFFFFF   — page/card backgrounds
  Navy:         #4A6C8C   — buttons, active icons, headers
  Blue-Muted:   #95A7B5   — captions, placeholders, inactive icons
  Card-BG:      #CAD6E4   — card fills, input backgrounds
  Accent:       #FF751F   — all CTA buttons, quick-add button
  Page-BG:      #F4F7FA   — app background
  ```
- **Font: Inter only.** No other typeface.
- **Build iteratively.** One screen at a time. Fix bugs before moving to the next.
- **Loading skeletons and error states** on every data-fetching component.
- **RLS on all Supabase tables.** Users access only their own data.
- **TypeScript strict mode.** No `any` types.
- **Paginate all lists.** Max 20 items per query.

### 6.2 DON'Ts

- **Never use Lucide React** or any other icon library.
- **Never substitute icons.** Do not use a similar-looking icon if the exact one is in Section 2.
- **No random emojis** in the UI anywhere.
- **No unapproved colors.** No Tailwind defaults like `text-blue-500`.
- **No secrets on the client.** Gemini, Razorpay secret, and Supabase service role go through server routes only.
- **No raw error messages** shown to users.
- **No skipping input validation.**

---

## 7. App Architecture

### Navigation Structure

**Bottom Navigation Bar (Mobile) — 5 items:**
```
[ PlanTabIcon ]  [ FocusTabIcon ]  [ QuickAddIcon ]  [ NotesTabIcon ]  [ InsightsTabIcon ]
     Plan              Focus              +                Notes             Insights
```

**Header (All Screens):**
- Left: `UserAccountIcon` → Profile page
- Centre: FOCALYST wordmark
- Right: `AIChatIcon` → AI chat

**Distraction-Free Mode** (Active Pomodoro + Note Editor):
- Bottom nav: hidden
- Header icons (UserAccountIcon + AIChatIcon): hidden
- Only the timer or note content is shown

**Desktop 1024px+:** Left sidebar replaces bottom nav. AI chat becomes right panel (380px).

### Responsive Breakpoints
- Mobile < 768px: bottom nav, 16px padding
- Tablet 768–1024px: bottom nav, 2-col layouts, 24px padding
- Desktop > 1024px: left sidebar (240px), max-width 800px, AI panel (380px)

---

## 8. Screen-by-Screen Summary

| # | Screen | Key Icons Used |
|---|---|---|
| 1 | Welcome | `FocalystLogo` |
| 2 | Login | none |
| 3–4 | Plans / Pricing | none |
| 5 | Enter Name | none |
| 6 | Profile Type | none |
| 7 | Plan Home (Today) | `UserAccountIcon`, `AIChatIcon`, `PlanTabIcon` (active), all nav icons |
| 8 | Plan Calendar | same as above |
| 9 | New Task | `NewTaskIcon` (in capsule origin) |
| 10 | New Habit | none |
| 11 | Quick Add Capsule | `NewTaskIcon`, `NewSessionIcon`, `NewNoteIcon` |
| 12 | Focus Home | `FocusTabIcon` (active), `UserAccountIcon`, `AIChatIcon` |
| 13 | Pomodoro Timer | all nav hidden (distraction-free) |
| 14 | Break Timer | all nav hidden |
| 15 | Session Complete | all nav hidden |
| 15b | New Countdown | `FocusTabIcon` (active) |
| 16 | Notes Home | `NotesTabIcon` (active), `UserAccountIcon`, `AIChatIcon` |
| 17 | Note Editor | all nav hidden (distraction-free) |
| 19 | Profile / Account | `UserAccountIcon` (highlighted) |
| 21 | AI Chat | `AIChatIcon` (highlighted) |
| 22 | Insights | `InsightsTabIcon` (active), `UserAccountIcon`, `AIChatIcon` |

---

## 9. Security Rules (Summary)

```
1.  RLS on ALL Supabase tables — no exceptions
2.  Verify session at start of every API route
3.  No secret keys in client code (Gemini, Razorpay secret, Supabase service role)
4.  Validate + sanitize all user inputs before DB writes
5.  Gemini calls: server-side only (/api/ai/route.ts)
6.  Razorpay: verify HMAC SHA256 signature server-side before updating plan
7.  Rate limit: AI chat 10 req/min/user | auth 5 req/min/IP
8.  Generic errors to users — detailed logs server-side only
9.  Subscription writes: only via service role in webhook handler
10. No user can read or write another user's data
```

---

## 10. Feature Gating (Quick Reference)

```typescript
const isPaidUser = (plan: string) =>
  ['pro_monthly', 'pro_yearly', 'lifetime'].includes(plan)

// Free plan limits
HABITS_FREE_LIMIT     = 2
NOTES_FREE_LIMIT      = 5
COUNTDOWNS_FREE_LIMIT = 1
COUNTDOWN_MAX_DAYS    = 30
AI_CHAT_FREE_DAILY    = 5
```

Always check server-side AND show lock UI client-side. Never hard-crash — always show upgrade modal. Lifetime plan never expires.

---

## 11. Build Order

```
Step 1:  Project setup — Next.js 14, TypeScript, Tailwind, custom colors, Inter font
Step 2:  Create ALL icon components from Section 2 (do this first, before any UI)
Step 3:  Supabase — all tables, RLS, indexes, triggers
Step 4:  Auth — Google OAuth, middleware, welcome screen, login
Step 5:  Onboarding — plans screen, name, profile type, redirect
Step 6:  Shared layout — Header, BottomNav with exact SVG icons wired up
Step 7:  Tab 1 Plan — today view, tasks, habits
Step 8:  Tab 1 Plan — calendar view, new task, new habit, quick-add capsule
Step 9:  Tab 2 Focus — Pomodoro setup, timer, break, complete
Step 10: Tab 2 Focus — countdown list, new countdown
Step 11: Tab 3 Notes — notes home, editor, speech-to-text, auto-save
Step 12: Tab 4 Insights — summary cards, charts (Recharts), streak cards
Step 13: Tab 4 Insights — AI productivity score, Gemini summary
Step 14: AI Chat — server route, chat UI, context passing, prompt chips
Step 15: Account page — profile, plan card, preferences, delete, logout
Step 16: Payments — Razorpay, order creation, signature verify, webhook
Step 17: Feature gating — plan checks, upgrade modals, lock states
Step 18: Responsive — desktop sidebar, tablet layouts
Step 19: PWA — manifest, service worker
Step 20: CodeRabbit review → fixes → QA → Vercel deploy
```

---

## 12. Opening Prompt — Paste at Start of Every Coding Session

```
I am building Focalyst, an AI productivity app.
Read the attached focalyst-app-plan-v4.md completely before writing any code.

CRITICAL RULES:
- Use ONLY the custom SVG icon components defined in Section 2 of the app plan.
  Never use Lucide React or any other icon library.
- Brand colors ONLY: #FFFFFF, #4A6C8C, #95A7B5, #CAD6E4, #FF751F, #F4F7FA
- Font: Inter only. No other typeface.
- No emojis in UI anywhere.
- No secret keys on client — all API calls via server routes.
- RLS on all Supabase tables — users access only their own data.
- Loading skeletons + error states on every data-fetching component.
- Paginate all lists — max 20 items per request.
- Validate and sanitize all user inputs before database writes.
- Build one screen at a time — confirm completion before moving on.

Today we are building: [SPECIFY SCREEN NAME AND NUMBER HERE]
Here is the Figma screenshot: [ATTACH SCREENSHOT]
```

---

*Focalyst App Plan v4.0 — March 2026*
*Built by Chintan. Every icon in this document is from Figma — use them exactly.*
