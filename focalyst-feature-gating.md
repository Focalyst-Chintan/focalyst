# Focalyst — Feature Gating Rules
**Version 1.0 | March 2026**
**Purpose:** Define exactly which features are available on each plan and how to enforce limits in code. Feed this to AI before every coding session.

---

## Core Instruction for AI

> Read this document completely before writing any feature code.
> Every restricted feature must check the user's plan before executing.
> Never hard-block or crash — always show a friendly upgrade prompt.
> Plan checks happen server-side AND client-side (client for UX, server for security).
> Never trust the client to enforce limits alone — always verify on the server.

---

## 1. Plan Overview

| Plan | Price | Billing |
|---|---|---|
| Free | ₹0 | Forever |
| Pro Monthly | ₹99 | Per month |
| Pro Yearly | ₹999 | Per year (save 16%) |
| Lifetime | ₹2,999 | One time, never expires |

**Paid plan check in code:**
```typescript
// Use this helper everywhere a plan check is needed
export const isPaidUser = (plan: string): boolean => {
  return ['pro_monthly', 'pro_yearly', 'lifetime'].includes(plan)
}

export const isLifetimeUser = (plan: string): boolean => {
  return plan === 'lifetime'
}
```

---

## 2. Complete Feature Gate Table

| Feature | Free | Pro Monthly | Pro Yearly | Lifetime |
|---|---|---|---|---|
| To-Do tasks | Unlimited | Unlimited | Unlimited | Unlimited |
| Subtasks per task | Unlimited | Unlimited | Unlimited | Unlimited |
| Task priorities | Yes | Yes | Yes | Yes |
| Task reminders | Yes | Yes | Yes | Yes |
| Habits | 2 max | Unlimited | Unlimited | Unlimited |
| Pomodoro presets | 4 built-in only | Yes + Custom | Yes + Custom | Yes + Custom |
| Custom Pomodoro | No | Yes | Yes | Yes |
| Day countdowns | 1 max (30 days) | Unlimited | Unlimited | Unlimited |
| Notes | 5 max | Unlimited | Unlimited | Unlimited |
| Note length | 50 pages each | Unlimited | Unlimited | Unlimited |
| Speech to text | Yes | Yes | Yes | Yes |
| Weekly insights | Current week only | Any past week | Any past week | Any past week |
| Monthly insights | No | Yes | Yes | Yes |
| AI productivity score | No | Yes | Yes | Yes |
| AI suggestions | No | Yes | Yes | Yes |
| AI chat messages | 5 per day | Unlimited | Unlimited | Unlimited |
| App blocker | No | Yes (mobile) | Yes (mobile) | Yes (mobile) |
| Early access features | No | No | No | Yes |
| Priority support | No | Yes | Yes | Yes |
| Future features | No | No | No | Included free |

---

## 3. Feature Gate Specifications

---

### 3.1 Habits — Maximum 2 (Free)

**Limit:** Free users can have a maximum of 2 active habits at any time.

**Check before insert:**
```typescript
// Server-side check in API route
export async function checkHabitLimit(userId: string, userPlan: string) {
  if (isPaidUser(userPlan)) return { allowed: true }

  const { count } = await supabase
    .from('habits')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_active', true)

  if (count >= 2) {
    return {
      allowed: false,
      reason: 'habit_limit',
      message: 'Free plan allows up to 2 habits. Upgrade to Pro for unlimited habits.'
    }
  }

  return { allowed: true }
}
```

**Client-side UX:**
- Show lock icon on the "Add Habit" button when limit is reached
- Tapping locked button opens upgrade modal (not an error message)
- Display current count: "2/2 habits used" below the habit list on free plan

---

### 3.2 Pomodoro — Presets Only (Free)

**Limit:** Free users can only use the 4 built-in presets. Duration, break, and sets input fields are disabled.

**Available presets (all plans):**
```typescript
export const POMODORO_PRESETS = [
  { label: '25/5×4', focusMinutes: 25, breakMinutes: 5, sets: 4 },
  { label: '45/10×3', focusMinutes: 45, breakMinutes: 10, sets: 3 },
  { label: '60/15×2', focusMinutes: 60, breakMinutes: 15, sets: 2 },
  { label: '90/30×2', focusMinutes: 90, breakMinutes: 30, sets: 2 },
]
```

**Client-side UX:**
- Custom input fields rendered but disabled with grey styling on free plan
- Lock icon displayed inside each disabled input field
- Tooltip on hover/tap: "Custom timer is a Pro feature. Upgrade to unlock."
- Preset chips are fully functional for all users

**Server-side check before starting session:**
```typescript
export function validatePomodoroConfig(
  focusMinutes: number,
  breakMinutes: number,
  sets: number,
  userPlan: string
) {
  if (isPaidUser(userPlan)) return { allowed: true }

  // Check if config matches a preset
  const isPreset = POMODORO_PRESETS.some(
    p => p.focusMinutes === focusMinutes &&
         p.breakMinutes === breakMinutes &&
         p.sets === sets
  )

  if (!isPreset) {
    return {
      allowed: false,
      reason: 'custom_pomodoro',
      message: 'Custom Pomodoro configuration is a Pro feature.'
    }
  }

  return { allowed: true }
}
```

---

### 3.3 Day Countdown — 1 Max, 30 Days Ahead (Free)

**Limits:**
- Free users: maximum 1 active countdown
- Free users: target date must be within 30 days from today

**Check before insert:**
```typescript
export async function checkCountdownLimit(
  userId: string,
  userPlan: string,
  targetDate: string
) {
  if (isPaidUser(userPlan)) return { allowed: true }

  // Check count limit
  const { count } = await supabase
    .from('countdowns')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_active', true)

  if (count >= 1) {
    return {
      allowed: false,
      reason: 'countdown_limit',
      message: 'Free plan allows 1 countdown. Upgrade to Pro for unlimited countdowns.'
    }
  }

  // Check 30-day limit
  const today = new Date()
  const target = new Date(targetDate)
  const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays > 30) {
    return {
      allowed: false,
      reason: 'countdown_date_limit',
      message: 'Free plan supports countdowns up to 30 days ahead. Upgrade for any future date.'
    }
  }

  return { allowed: true }
}
```

**Client-side UX:**
- Date picker restricted to 30 days ahead for free users
- "Add Countdown" button locked after 1 countdown exists
- Show "1/1 countdowns used" on free plan

---

### 3.4 Notes — 5 Max (Free)

**Limit:** Free users can have a maximum of 5 non-deleted notes.

**Check before insert:**
```typescript
export async function checkNoteLimit(userId: string, userPlan: string) {
  if (isPaidUser(userPlan)) return { allowed: true }

  const { count } = await supabase
    .from('notes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_deleted', false)

  if (count >= 5) {
    return {
      allowed: false,
      reason: 'note_limit',
      message: 'Free plan allows up to 5 notes. Upgrade to Pro for unlimited notes.'
    }
  }

  return { allowed: true }
}
```

**Client-side UX:**
- Show "5/5 notes used" counter in notes home header on free plan
- "+" button shows lock icon when limit reached
- Tapping locked button opens upgrade modal

---

### 3.5 Insights — Limited History (Free)

**Limit:** Free users see current week only. No monthly view, no historical week selection.

**Check in insights API:**
```typescript
export function validateInsightsAccess(
  requestedView: 'weekly' | 'monthly',
  weekOffset: number, // 0 = current week, 1 = last week, etc.
  userPlan: string
) {
  if (isPaidUser(userPlan)) return { allowed: true }

  if (requestedView === 'monthly') {
    return {
      allowed: false,
      reason: 'monthly_insights',
      message: 'Monthly reports are a Pro feature. Upgrade to unlock.'
    }
  }

  if (weekOffset > 0) {
    return {
      allowed: false,
      reason: 'historical_insights',
      message: 'Historical weekly data is a Pro feature. Upgrade to view past weeks.'
    }
  }

  return { allowed: true }
}
```

**Client-side UX:**
- Weekly tab: visible to all, but "< Previous Week" arrow disabled with lock icon for free users
- Monthly tab: visible but locked — clicking shows upgrade modal
- AI Score card: visible but blurred with "Upgrade to unlock your score" overlay

---

### 3.6 AI Productivity Score — Paid Only

**Gate:** Score calculation and AI suggestions are only available for paid users.

```typescript
export async function getProductivityScore(userId: string, userPlan: string) {
  if (!isPaidUser(userPlan)) {
    return {
      allowed: false,
      reason: 'ai_score',
      message: 'AI Productivity Score is a Pro feature.'
    }
  }

  // Calculate score and fetch Gemini suggestions
  // ...
}
```

**Client-side UX:**
- Score card always visible on Insights tab
- For free users: score circle is blurred/greyed out
- Overlay text: "Upgrade to Pro to unlock your AI Productivity Score"
- "Upgrade Now" button inside the card

---

### 3.7 AI Chat — 5 Messages Per Day (Free)

**Limit:** Free users get 5 AI chat messages per calendar day. Resets at midnight.

```typescript
export async function checkAIChatLimit(userId: string, userPlan: string) {
  if (isPaidUser(userPlan)) return { allowed: true, remaining: null }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { count } = await supabase
    .from('ai_chat_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('role', 'user')
    .gte('created_at', today.toISOString())

  const FREE_LIMIT = 5
  const remaining = Math.max(0, FREE_LIMIT - count)

  if (count >= FREE_LIMIT) {
    return {
      allowed: false,
      remaining: 0,
      reason: 'ai_chat_limit',
      message: "You've used all 5 free messages today. Upgrade to Pro for unlimited AI chat."
    }
  }

  return { allowed: true, remaining }
}
```

**Client-side UX:**
- Counter shown above input: "3 of 5 daily messages used" (free plan only)
- Counter turns orange at 4/5 and red at 5/5
- When limit hit, input field is disabled
- In-chat message appears: "You've used all 5 free messages today. Upgrade to Pro for unlimited AI chat 🚀" with "Upgrade Now" button
- Resets automatically at midnight — no manual action needed

---

## 4. Upgrade Modal

Every gate triggers the same upgrade modal component. It must be consistent across the entire app.

**Modal content:**
```typescript
interface UpgradeModalProps {
  reason: string        // Which feature triggered it
  title: string         // Headline
  description: string   // What they're missing
  onUpgrade: () => void // Navigate to /plans
  onDismiss: () => void // Close modal
}
```

**Standard modal copy by reason:**

```typescript
export const UPGRADE_MODAL_COPY = {
  habit_limit: {
    title: "You've reached your habit limit",
    description: "Free plan supports up to 2 habits. Upgrade to Pro to track unlimited habits and build stronger routines.",
  },
  custom_pomodoro: {
    title: "Custom timer is a Pro feature",
    description: "Upgrade to Pro to set custom focus durations, break lengths, and session counts.",
  },
  countdown_limit: {
    title: "You've reached your countdown limit",
    description: "Free plan supports 1 countdown. Upgrade to Pro for unlimited countdowns to any future date.",
  },
  countdown_date_limit: {
    title: "Extend your countdown range",
    description: "Free plan supports countdowns up to 30 days ahead. Upgrade to Pro to count down to any future date.",
  },
  note_limit: {
    title: "You've reached your note limit",
    description: "Free plan supports up to 5 notes. Upgrade to Pro for unlimited notes.",
  },
  monthly_insights: {
    title: "Monthly reports are a Pro feature",
    description: "Upgrade to Pro to unlock monthly productivity reports and track your long-term progress.",
  },
  historical_insights: {
    title: "View your productivity history",
    description: "Upgrade to Pro to access any past week's data and see how you've improved over time.",
  },
  ai_score: {
    title: "Unlock your AI Productivity Score",
    description: "Upgrade to Pro to get your personalised score, weekly analysis, and AI-powered improvement suggestions.",
  },
  ai_chat_limit: {
    title: "You've used today's free messages",
    description: "Upgrade to Pro for unlimited AI chat — add tasks, get summaries, and plan your day without limits.",
  },
}
```

**Modal buttons:**
- Primary: "Upgrade to Pro →" — navigates to /plans page
- Secondary: "Maybe Later" — dismisses modal
- Never remove the dismiss option — never force the upgrade

---

## 5. Plan Expiry Handling

For Pro Monthly and Pro Yearly plans, handle expiry gracefully:

```typescript
// Check on app load if plan has expired
export async function checkPlanExpiry(userId: string) {
  const { data: user } = await supabase
    .from('users')
    .select('plan, plan_expires_at')
    .eq('id', userId)
    .single()

  if (!user) return

  const isPro = ['pro_monthly', 'pro_yearly'].includes(user.plan)
  const isExpired = user.plan_expires_at && 
                    new Date(user.plan_expires_at) < new Date()

  if (isPro && isExpired) {
    // Downgrade to free
    await supabase
      .from('users')
      .update({ plan: 'free', plan_expires_at: null })
      .eq('id', userId)

    // Show renewal nudge notification
    return { expired: true }
  }

  return { expired: false }
}
```

**Expiry UX:**
- On next app open after expiry: show a banner "Your Pro plan has expired. Renew to keep your features."
- Do NOT immediately hide Pro features — show them locked with a "Renew" button
- Give a 24-hour grace period before enforcing free limits (good UX practice)

---

## 6. Server-Side Enforcement Pattern

Every restricted API route must follow this exact pattern:

```typescript
// Template for any restricted API route
export async function POST(req: Request) {
  // Step 1 — Verify session
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id

  // Step 2 — Get user plan
  const { data: user } = await supabase
    .from('users')
    .select('plan, plan_expires_at')
    .eq('id', userId)
    .single()

  if (!user) return Response.json({ error: 'User not found' }, { status: 404 })

  // Step 3 — Check feature gate
  const gateResult = await checkHabitLimit(userId, user.plan) // replace with relevant check

  if (!gateResult.allowed) {
    return Response.json(
      { error: gateResult.reason, message: gateResult.message },
      { status: 403 }
    )
  }

  // Step 4 — Proceed with the actual operation
  // ...
}
```

---

## 7. Free Plan Summary Card

Show this card prominently on the Account page for free users:

```
Your Plan: FREE

[ ████░░ ] 2/2 Habits used
[ ████░░ ] 5/5 Notes used
[ ████░░ ] 1/1 Countdowns used
[ ████░░ ] 3/5 AI messages today

Upgrade to Pro — ₹99/month
[  Upgrade Now  ]
```

This creates a constant gentle nudge without being aggressive.

---

## 8. Feature Gate Checklist for Every Feature Build

Before marking any gated feature complete, verify:

```
[ ] Server-side plan check added to API route
[ ] Client-side plan check added for UX (disabled state / lock icon)
[ ] Upgrade modal triggers correctly when limit hit
[ ] Correct UPGRADE_MODAL_COPY used for this feature
[ ] Free plan counter shown where applicable (habits, notes, AI chat)
[ ] Hard limit enforced server-side — not just client-side
[ ] Expiry handling works correctly for monthly/yearly plans
[ ] Lifetime plan never expires — no expiry check needed
[ ] Feature works correctly for all 4 plan types (test each)
```

---

## 9. Opening Prompt for Every Coding Session

```
Before writing any feature code for Focalyst, confirm you will
enforce these feature gates exactly as specified:

FREE PLAN LIMITS:
- Habits: maximum 2 active habits
- Pomodoro: presets only, no custom configuration
- Countdowns: maximum 1, up to 30 days ahead only
- Notes: maximum 5 notes
- Insights: current week only, no monthly view
- AI Productivity Score: locked
- AI Chat: 5 messages per day

RULES:
- Check plan server-side in every restricted API route
- Also check client-side for UX (lock icons, disabled states)
- Never hard-block — always show the upgrade modal
- Never crash or throw uncaught errors on limit reached
- Lifetime plan never expires — skip expiry checks for lifetime
- Use the isPaidUser() helper for all plan checks

Every restricted feature needs both server AND client enforcement.
```

---

*Focalyst Feature Gating Rules v1.0 — March 2026*
*These rules define the business logic of the product. Follow them exactly.*
