# Focalyst — Security Rules Document
**Version 1.0 | March 2026**
**Purpose:** Define every security requirement for Focalyst. Feed this to AI before every coding session.

---

## Core Instruction for AI

> Read this document completely before writing any code.
> Security is not optional. Every rule here is mandatory.
> If a feature conflicts with a security rule, the security rule wins.
> Never skip, simplify, or work around any rule listed here.
> When in doubt, be more restrictive — not less.

---

## 1. The Golden Rules (Never Break These)

```
1. Users can ONLY access their own data — never another user's data
2. Secret API keys NEVER appear in client-side code
3. ALL user inputs are validated and sanitized before use
4. ALL database writes go through RLS-protected Supabase client
5. Payment verification ALWAYS happens server-side
6. Rate limiting is applied to ALL external API calls
7. HTTPS is enforced on every route — no HTTP
8. Sensitive operations ALWAYS verify the user session first
```

---

## 2. Authentication Security

### 2.1 Session Validation
Every protected API route and server action must verify the user session before doing anything else.

```typescript
// ALWAYS do this first in every API route
import { createServerClient } from '@supabase/ssr'

export async function POST(req: Request) {
  const supabase = createServerClient(/* cookies */)
  
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (!session || error) {
    return Response.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
  
  const userId = session.user.id
  // Now safe to proceed
}
```

### 2.2 Middleware Route Protection
All app routes must be protected by middleware. Unauthenticated users are redirected to /login.

```typescript
// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  
  const { data: { session } } = await supabase.auth.getSession()
  
  const isAppRoute = req.nextUrl.pathname.startsWith('/plan') ||
                     req.nextUrl.pathname.startsWith('/focus') ||
                     req.nextUrl.pathname.startsWith('/notes') ||
                     req.nextUrl.pathname.startsWith('/insights') ||
                     req.nextUrl.pathname.startsWith('/account')

  if (!session && isAppRoute) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (session && req.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/plan', req.url))
  }

  return res
}
```

### 2.3 Auth Rules
- Google OAuth is the only login method — no email/password
- Sessions are managed entirely by Supabase — do not build custom session logic
- Token refresh is handled automatically by Supabase client
- On logout — clear session, clear any local state, redirect to /login
- Never store the user's access token in localStorage

---

## 3. Database Security

### 3.1 Row Level Security (RLS)
RLS must be enabled on every single table. This is the most critical database security rule.

```sql
-- Enable on every table — no exceptions
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pomodoro_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE countdowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_logs ENABLE ROW LEVEL SECURITY;
```

### 3.2 RLS Policy Pattern
Every table policy must use auth.uid() to match the authenticated user:

```sql
-- Standard pattern for all user-owned tables
CREATE POLICY "policy_name"
  ON table_name FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### 3.3 Subscriptions Table — Special Rule
The subscriptions table must NOT allow client-side inserts or updates. Only the server-side service role (via Razorpay webhook) can write to it.

```sql
-- Subscriptions: read only for users, write only via service role
CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- NO insert/update policy for authenticated users
-- Writes happen only via service role in webhook handler
```

### 3.4 Service Role Key
- The Supabase service role key bypasses RLS
- It must ONLY be used in server-side API routes (webhooks)
- It must NEVER be used in client components
- It must NEVER start with NEXT_PUBLIC_
- Store as SUPABASE_SERVICE_ROLE_KEY in environment variables

```typescript
// ONLY in server-side webhook handler — never in client code
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // NOT NEXT_PUBLIC_
)
```

---

## 4. API Key Security

### 4.1 Environment Variable Rules

| Key | Variable Name | Client Safe? |
|---|---|---|
| Supabase URL | NEXT_PUBLIC_SUPABASE_URL | Yes |
| Supabase Anon Key | NEXT_PUBLIC_SUPABASE_ANON_KEY | Yes (RLS protects data) |
| Supabase Service Role | SUPABASE_SERVICE_ROLE_KEY | NEVER |
| Gemini API Key | GEMINI_API_KEY | NEVER |
| Razorpay Key ID | NEXT_PUBLIC_RAZORPAY_KEY_ID | Yes (needed for checkout) |
| Razorpay Key Secret | RAZORPAY_KEY_SECRET | NEVER |
| App URL | NEXT_PUBLIC_APP_URL | Yes |

### 4.2 Gemini API — Server Side Only
All Gemini API calls must go through a Next.js API route. Never call Gemini directly from a React component.

```typescript
// CORRECT — server-side API route only
// app/api/ai/route.ts
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(req: Request) {
  // 1. Verify session
  // 2. Check rate limit
  // 3. Check daily message limit for free users
  // 4. Call Gemini
  // 5. Log to ai_chat_logs
  // 6. Return response
}

// WRONG — never do this in a component file
// const genAI = new GoogleGenerativeAI('AIzaSy...') <- Key exposed!
```

### 4.3 Razorpay — Split Responsibilities
- Key ID (NEXT_PUBLIC_RAZORPAY_KEY_ID) — used in frontend to open Razorpay checkout
- Key Secret (RAZORPAY_KEY_SECRET) — used ONLY on server to create orders and verify signatures
- Never use the secret key anywhere on the client side

---

## 5. Input Validation and Sanitization

### 5.1 Validate Everything
Every piece of data coming from the user must be validated before it touches the database.

```typescript
// Validation rules for each input type

// Task title
if (!title || title.trim().length === 0) throw new Error('Title is required')
if (title.length > 500) throw new Error('Title too long')
title = title.trim()

// Note content
if (content && content.length > 500000) throw new Error('Note too large')

// Due date
if (dueDate && isNaN(Date.parse(dueDate))) throw new Error('Invalid date')

// Priority
const validPriorities = ['high', 'medium', 'low']
if (!validPriorities.includes(priority)) throw new Error('Invalid priority')

// Plan type
const validPlans = ['free', 'pro_monthly', 'pro_yearly', 'lifetime']
if (!validPlans.includes(plan)) throw new Error('Invalid plan')

// UUID format check
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
if (!UUID_REGEX.test(id)) throw new Error('Invalid ID format')
```

### 5.2 Sanitize Rich Text
Notes use rich text (HTML). Always sanitize before storing and before rendering.

```typescript
// Install: npm install isomorphic-dompurify
import DOMPurify from 'isomorphic-dompurify'

const cleanContent = DOMPurify.sanitize(rawHtmlContent, {
  ALLOWED_TAGS: ['p', 'b', 'i', 'u', 'h1', 'h2', 'ul', 'ol', 'li', 'br', 'strong', 'em'],
  ALLOWED_ATTR: []
})
```

### 5.3 AI Chat Input Rules
- Maximum message length: 2000 characters
- Strip any HTML tags from user message before sending to Gemini
- Never include other users' data in the Gemini context
- Never allow the AI prompt to be directly controlled by raw user input

```typescript
// Sanitize AI input
const sanitizedMessage = message
  .trim()
  .replace(/<[^>]*>/g, '') // Strip HTML tags
  .slice(0, 2000)           // Enforce length limit

if (sanitizedMessage.length === 0) {
  throw new Error('Message cannot be empty')
}
```

---

## 6. Rate Limiting

### 6.1 AI Chat — Daily Limit

```typescript
// Check daily message count for free users
const today = new Date()
today.setHours(0, 0, 0, 0)

const { count } = await supabase
  .from('ai_chat_logs')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', userId)
  .eq('role', 'user')
  .gte('created_at', today.toISOString())

const FREE_DAILY_LIMIT = 5
const isPaidUser = ['pro_monthly', 'pro_yearly', 'lifetime'].includes(user.plan)

if (!isPaidUser && count >= FREE_DAILY_LIMIT) {
  return Response.json(
    { 
      error: 'daily_limit_reached', 
      message: 'Upgrade to Pro for unlimited AI chat' 
    },
    { status: 429 }
  )
}
```

### 6.2 Per-Minute Rate Limit (All Users)

```typescript
// Maximum 10 AI requests per minute per user
const oneMinuteAgo = new Date(Date.now() - 60 * 1000)

const { count: recentCount } = await supabase
  .from('ai_chat_logs')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', userId)
  .eq('role', 'user')
  .gte('created_at', oneMinuteAgo.toISOString())

if (recentCount >= 10) {
  return Response.json(
    { error: 'rate_limit', message: 'Too many requests. Please wait a moment.' },
    { status: 429 }
  )
}
```

### 6.3 Auth Rate Limiting
Supabase handles auth rate limiting automatically. Do not override or disable Supabase's default auth limits.

---

## 7. Payment Security

### 7.1 Never Trust Client-Side Payment Confirmation
The Razorpay checkout fires a callback on success. This callback must NOT directly update the user's plan. Always verify server-side first.

```typescript
// CORRECT payment flow — 4 steps

// Step 1 — Frontend: create order via server
const { orderId } = await fetch('/api/payment/create-order', {
  method: 'POST',
  body: JSON.stringify({ plan: 'pro_monthly' })
}).then(r => r.json())

// Step 2 — Frontend: open Razorpay checkout with orderId
// On success, Razorpay returns: razorpay_payment_id, razorpay_order_id, razorpay_signature

// Step 3 — Frontend: send all three to server for verification
const result = await fetch('/api/payment/verify', {
  method: 'POST',
  body: JSON.stringify({ razorpay_payment_id, razorpay_order_id, razorpay_signature })
})

// Step 4 — Server: verify signature with HMAC SHA256
// ONLY after successful verification -> update user plan in Supabase
```

### 7.2 Signature Verification (Server Side)

```typescript
// app/api/payment/verify/route.ts
import crypto from 'crypto'

const verifyRazorpaySignature = (
  orderId: string,
  paymentId: string,
  signature: string
): boolean => {
  const body = orderId + '|' + paymentId
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest('hex')
  
  return expectedSignature === signature
}

// In the route handler:
const isValid = verifyRazorpaySignature(
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature
)

if (!isValid) {
  return Response.json({ error: 'Invalid payment signature' }, { status: 400 })
}

// Only now — safe to update user plan
```

### 7.3 Webhook Security

```typescript
// app/api/payment/webhook/route.ts
const webhookSignature = req.headers.get('x-razorpay-signature')
const body = await req.text()

const expectedSignature = crypto
  .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
  .update(body)
  .digest('hex')

if (webhookSignature !== expectedSignature) {
  return Response.json({ error: 'Invalid webhook signature' }, { status: 400 })
}
```

---

## 8. Data Privacy

### 8.1 Data Minimization
- Only collect data that is necessary for app functionality
- Do not log or store sensitive user data unnecessarily
- AI chat logs are stored for usage tracking only
- Do not store raw Razorpay payment card details — Razorpay handles this entirely

### 8.2 Account Deletion
When a user deletes their account, delete everything:

```typescript
// Account deletion — uses service role to delete auth user
// CASCADE on foreign keys handles all other tables automatically
export async function deleteAccount(userId: string) {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (error) throw error
}
```

Always show a confirmation modal before proceeding:
- Warning text: "This will permanently delete all your data and cannot be undone."
- Require the user to type "DELETE" to confirm
- Two-step confirmation prevents accidental deletion

### 8.3 Data Export
Users can download all their data as JSON:

```typescript
export async function exportUserData(userId: string) {
  const [tasks, habits, habitLogs, sessions, notes, countdowns] = await Promise.all([
    supabase.from('tasks').select('*').eq('user_id', userId),
    supabase.from('habits').select('*').eq('user_id', userId),
    supabase.from('habit_logs').select('*').eq('user_id', userId),
    supabase.from('pomodoro_sessions').select('*').eq('user_id', userId),
    supabase.from('notes').select('*').eq('user_id', userId),
    supabase.from('countdowns').select('*').eq('user_id', userId),
  ])

  return {
    exported_at: new Date().toISOString(),
    tasks: tasks.data,
    habits: habits.data,
    habit_logs: habitLogs.data,
    pomodoro_sessions: sessions.data,
    notes: notes.data,
    countdowns: countdowns.data,
  }
}
```

---

## 9. Error Handling Security

### 9.1 Never Expose Internal Errors to the Client
Raw database errors, stack traces, or internal messages must never reach the user.

```typescript
// CORRECT
try {
  const result = await supabase.from('tasks').insert(task)
  if (result.error) throw result.error
} catch (error) {
  console.error('Task insert failed:', error) // Log internally only
  return Response.json(
    { error: 'Failed to create task. Please try again.' }, // Generic to client
    { status: 500 }
  )
}

// WRONG — exposes internal database error details to client
return Response.json({ error: error.message }, { status: 500 })
```

### 9.2 HTTP Status Codes — Use Correctly

```
200 — Success
201 — Created successfully
400 — Bad request (validation error)
401 — Unauthorized (no session)
403 — Forbidden (trying to access another user's data)
404 — Not found
429 — Rate limit exceeded
500 — Internal server error
```

---

## 10. Security Headers

Add these to next.config.js:

```javascript
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://checkout.razorpay.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com https://api.razorpay.com",
      "frame-src https://api.razorpay.com",
    ].join('; ')
  },
]

module.exports = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
}
```

---

## 11. Dependency Security

```bash
# Run regularly to check for vulnerabilities
npm audit

# Fix automatically where possible
npm audit fix

# Check for outdated packages
npm outdated
```

Only install packages that are necessary. Prefer well-maintained packages with large communities. Never install packages from unknown or unverified sources.

---

## 12. Security Checklist for Every Feature

Before marking any feature complete, verify every item:

```
[ ] User session verified at start of every API route
[ ] RLS enabled on any new database table
[ ] No secret keys in client-side code
[ ] All user inputs validated (length, type, format)
[ ] Rich text sanitized with DOMPurify
[ ] Error messages are generic (no internal details exposed)
[ ] Correct HTTP status codes returned
[ ] Rate limiting applied to any external API call
[ ] Payment verification done server-side with signature check
[ ] New environment variables added to .env and Vercel dashboard
[ ] No console.log statements left with sensitive data
[ ] Data access restricted to the authenticated user only
```

---

## 13. Opening Security Prompt — Paste at Start of Every Coding Session

```
Before writing any code for Focalyst, confirm you will follow
these security rules in every component and API route:

1. Verify user session at the start of every API route
2. Never expose secret keys (Gemini, Razorpay secret,
   Supabase service role) in client-side code
3. Enable RLS on all Supabase tables
4. Validate and sanitize all user inputs before database writes
5. Route all Gemini API calls through server-side API routes only
6. Verify Razorpay payment signatures server-side before
   updating user plan — never trust client-side confirmation
7. Apply rate limiting to AI chat (5/day free, 10/min all users)
8. Return generic error messages to client — log details server-side
9. Use correct HTTP status codes (401, 403, 429, 500)
10. Never return another user's data under any circumstance

Security is as important as functionality. Do not skip any rule.
```

---

*Focalyst Security Rules v1.0 — March 2026*
*Every rule in this document is mandatory. No exceptions.*
