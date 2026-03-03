# Focalyst — Tech Stack Document
**Version 1.0 | March 2026**
**Purpose:** Define every tool, library, and service used to build Focalyst. Feed this to AI before every coding session.

---

## Core Instruction for AI

> Read this document completely before writing any code.
> Always use the exact tools, versions, and patterns specified here.
> Never substitute an alternative library unless explicitly instructed.
> When in doubt, ask — do not assume.

---

## 1. Language

| Setting | Value |
|---|---|
| Language | **TypeScript** (not JavaScript) |
| TypeScript version | Latest stable |
| Strict mode | Enabled (`"strict": true` in tsconfig.json) |

**Why TypeScript:** Catches errors at compile time, produces safer and more maintainable code, reduces bugs in production.

---

## 2. Frontend Framework

| Setting | Value |
|---|---|
| Framework | **Next.js 14** |
| Router | **App Router** (not Pages Router) |
| Rendering | Server Components by default, Client Components only when needed |
| CSS Framework | **Tailwind CSS** |
| Component Library | None — custom components only |

**File structure convention:**
```
/app
  /layout.tsx          ← Root layout
  /page.tsx            ← Home / landing page
  /(auth)
    /login/page.tsx    ← Login screen
  /(app)
    /plan/page.tsx     ← Tab 1 — Plan
    /focus/page.tsx    ← Tab 2 — Focus
    /notes/page.tsx    ← Tab 3 — Notes
    /insights/page.tsx ← Tab 4 — Insights
    /account/page.tsx  ← Account & Settings
    /plans/page.tsx    ← Pricing page
  /api
    /ai/route.ts       ← Gemini API endpoint
    /payment/route.ts  ← Razorpay endpoint
/components
  /ui                  ← Reusable UI components
  /plan                ← Plan tab components
  /focus               ← Focus tab components
  /notes               ← Notes tab components
  /insights            ← Insights tab components
  /shared              ← Shared components (nav, header, etc.)
/lib
  /supabase.ts         ← Supabase client
  /gemini.ts           ← Gemini API helper
  /razorpay.ts         ← Razorpay helper
  /utils.ts            ← Utility functions
/types
  /index.ts            ← All TypeScript types and interfaces
/hooks
  /useUser.ts          ← Auth hook
  /useTasks.ts         ← Tasks data hook
  /useHabits.ts        ← Habits data hook
  /useNotes.ts         ← Notes data hook
```

---

## 3. Styling

| Setting | Value |
|---|---|
| CSS Framework | **Tailwind CSS v3** |
| Custom fonts | **Inter** (via Google Fonts or next/font) |
| Icons | **Lucide React** |
| Animations | **Tailwind CSS animate** + CSS transitions |
| Charts | **Recharts** |

**Design tokens (use these exact values in Tailwind classes):**
```
Primary Blue:     #2563EB  → blue-600
Primary Light:    #EFF6FF  → blue-50
Dark Text:        #1E293B  → slate-800
Grey Text:        #64748B  → slate-500
Light Grey BG:    #F1F5F9  → slate-100
Border:           #E2E8F0  → slate-200
Success Green:    #16A34A  → green-600
Warning Orange:   #EA580C  → orange-600
Error Red:        #DC2626  → red-600
```

**Standard component styles:**
```
Cards:            rounded-2xl bg-white shadow-sm border border-slate-200 p-4
Buttons Primary:  bg-blue-600 text-white rounded-xl px-4 py-3 font-semibold
Buttons Secondary:border border-blue-600 text-blue-600 rounded-xl px-4 py-3
Input fields:     border border-slate-200 rounded-xl h-12 px-4 text-slate-800
Bottom sheet:     rounded-t-2xl bg-white shadow-xl
```

---

## 4. Backend & Database

| Setting | Value |
|---|---|
| Backend | **Supabase** (PostgreSQL) |
| Supabase version | Latest |
| ORM | Supabase JS client (no separate ORM) |
| Real-time | Supabase Realtime (for future features) |

**Supabase client setup:**
```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

**Server-side client (for API routes):**
```typescript
import { createServerClient } from '@supabase/ssr'
```

**CRITICAL RULE:** Always use Row Level Security (RLS). Users must never access other users' data.

---

## 5. Authentication

| Setting | Value |
|---|---|
| Auth provider | **Supabase Auth** |
| Login method | **Google OAuth only** |
| Session management | Supabase handles automatically |
| Callback URL | Set in Supabase Auth settings |

**Auth flow:**
1. User clicks "Continue with Google"
2. Supabase redirects to Google consent
3. On success → Supabase creates session
4. Middleware checks session on protected routes
5. New users → onboarding, returning users → /plan

**Protected routes middleware:**
```typescript
// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

export async function middleware(req) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  if (!session && req.nextUrl.pathname.startsWith('/(app)')) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  return res
}
```

---

## 6. AI Integration

| Setting | Value |
|---|---|
| AI provider | **Google Gemini** |
| Model | **gemini-1.5-flash** (free tier) |
| SDK | **@google/generative-ai** |
| API calls | Server-side only (Next.js API route) |

**CRITICAL:** Gemini API key must NEVER be exposed on the client side. All calls go through `/api/ai/route.ts`.

**API route pattern:**
```typescript
// app/api/ai/route.ts
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(req: Request) {
  // Validate user session first
  // Apply rate limiting (max 10 requests/minute/user)
  // Call Gemini
  // Return response
}
```

**Gemini context to always include:**
- User's profile type (student/professional/freelancer/creator/entrepreneur)
- Today's task list (titles and due dates)
- Habit names and today's completion status
- Current week's focus hours total
- Current plan (free/pro/lifetime)

**Rate limiting:**
- Free plan: 5 messages per day per user
- Paid plan: 100 messages per day per user (soft cap)
- Hard rate limit: 10 requests per minute per user regardless of plan

---

## 7. Payments

| Setting | Value |
|---|---|
| Payment provider | **Razorpay** |
| SDK | razorpay (Node.js) + Razorpay JS (frontend) |
| API calls | Server-side only for order creation and verification |
| Webhook | Razorpay webhook → `/api/payment/webhook/route.ts` |

**Payment flow:**
1. User selects plan on /plans page
2. Frontend calls `/api/payment/create-order` (server)
3. Server creates Razorpay order, returns order_id
4. Frontend opens Razorpay checkout with order_id
5. User completes payment
6. Razorpay sends webhook to `/api/payment/webhook`
7. Server verifies signature and updates user plan in Supabase
8. Frontend polls or listens for plan update → shows success

**Plans and IDs:**
```
Pro Monthly:  plan_SLhClj1iWkcjdj  — ₹99/month
Pro Yearly:   plan_SLhIIrXh0RcPtA  — ₹999/year
Lifetime:     One-time payment (not subscription)
```

**CRITICAL:** Always verify Razorpay webhook signature server-side before updating user plan. Never trust client-side payment confirmation alone.

---

## 8. Hosting & Deployment

| Setting | Value |
|---|---|
| Hosting | **Vercel** |
| Deployment trigger | Auto-deploy on push to `main` branch |
| Environment | Production (main branch), Preview (other branches) |
| Domain | Custom domain (already owned) |
| CDN | Vercel Edge Network (automatic) |

**Deployment steps:**
1. Push code to GitHub main branch
2. Vercel auto-detects Next.js and builds
3. Vercel deploys to custom domain automatically
4. Environment variables set in Vercel dashboard (not in code)

---

## 9. Version Control

| Setting | Value |
|---|---|
| Platform | **GitHub** |
| Repository | Private repository named `focalyst` |
| Main branch | `main` (production) |
| Dev branch | `dev` (development and testing) |

**Branch strategy:**
```
main  ← Production (auto-deploys to Vercel)
dev   ← Development (test here first)
feature/tab-plan    ← Feature branches
feature/tab-focus
feature/ai-chat
feature/payments
```

**.gitignore must include:**
```
.env
.env.local
.env.production
node_modules/
.next/
```

---

## 10. Development Environment

| Setting | Value |
|---|---|
| IDE | **Google IDX** (browser-based) |
| Package manager | **npm** |
| Node version | 18+ (LTS) |
| Linting | ESLint (Next.js default config) |
| Formatting | Prettier |
| Code review | **CodeRabbit** (AI code review on pull requests) |

**Initial project setup commands:**
```bash
npx create-next-app@latest focalyst --typescript --tailwind --eslint --app
cd focalyst
npm install @supabase/supabase-js @supabase/ssr @supabase/auth-helpers-nextjs
npm install @google/generative-ai
npm install razorpay
npm install lucide-react
npm install recharts
npm install @types/node @types/react @types/react-dom
```

---

## 11. Environment Variables

**All environment variables required:**
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google OAuth (configured in Supabase dashboard)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Razorpay
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Razorpay Plan IDs
RAZORPAY_PRO_MONTHLY_PLAN_ID=your_pro_monthly_plan_id
RAZORPAY_PRO_YEARLY_PLAN_ID=your_pro_yearly_plan_id

# App
NEXT_PUBLIC_APP_URL=https://your-custom-domain.com
```

**Rules:**
- Variables starting with `NEXT_PUBLIC_` are visible on the client — only use for non-secret values
- All secret keys (Gemini, Razorpay secret, Supabase service role) must NOT have `NEXT_PUBLIC_` prefix
- Never commit `.env` file to GitHub
- Set all variables in Vercel dashboard for production

---

## 12. Key Libraries Summary

| Library | Purpose | Install |
|---|---|---|
| next | Framework | included |
| typescript | Language | included |
| tailwindcss | Styling | included |
| @supabase/supabase-js | Database + Auth | npm install |
| @supabase/ssr | Server-side Supabase | npm install |
| @google/generative-ai | Gemini AI | npm install |
| razorpay | Payments | npm install |
| lucide-react | Icons | npm install |
| recharts | Charts for Insights tab | npm install |
| @supabase/auth-helpers-nextjs | Auth middleware | npm install |

---

## 13. PWA Configuration (Phase 2)

When ready to enable PWA:
```bash
npm install next-pwa
```

Add to `next.config.js`:
```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
})
module.exports = withPWA({ /* next config */ })
```

Add `manifest.json` to `/public` with app name, icons, theme color.

---

## 14. Mobile App (Phase 3)

When ready for native mobile:
```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android @capacitor/ios
npx cap init
npx cap add android
npx cap add ios
```

Capacitor wraps the existing Next.js app into a native Android and iOS app with zero code rewrite.

---

*Focalyst Tech Stack v1.0 — March 2026*
*Always use this document as the definitive reference for all technology decisions.*
