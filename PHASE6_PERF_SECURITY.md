# Focalyst Phase 6: speed, smoothness and security

Read this whole file once. It is split into four passes, each run in its own Antigravity chat and shipped as its own commit:

| Pass | What | Ships when |
|---|---|---|
| **6P** | Rebuild web payments on Polar (urgent, payments are down) | After Sohan runs `00_billing.sql` and the checks in B6 pass |
| **6A** | Vercel Analytics + Speed Insights, audit, security hardening, API abuse protection | After Sohan has run the SQL in Supabase |
| **6B** | Speed: images, lazy loading, data caching, queries, indexes, re-renders | After 6A is live |
| **6C** | Smoothness: skeletons, optimistic UI, offline handling, glass rendering cost, Lighthouse | After 6B is live |

Global rules for every pass:
- Mobile web below 1024px must look exactly the same as now. These changes are invisible plumbing unless a section says otherwise.
- The Capacitor export build (`output: 'export'` when isMobile) must still build. Anything that needs a server (route handlers, `headers()`, proxy) must be skipped or guarded in the export build.
- The Supabase database is shared with the mobile app. Never drop or rename a column. Never change what a column means. New columns and new functions only.
- Never run SQL against the database yourself. Write it to a file under `supabase/phase6/` and stop. Sohan will have it checked and run it.
- Tokens only for styling, `snow` not `white`, no em dashes or exclamation marks in any user-facing copy.
- Never re-open a file range you have already viewed.
- **Never run `npm run build`, `npx next build`, `npm run dev` or any long-running command.** When edits are done, write "READY FOR BUILD" with the exact commands for Sohan to run, and stop. Locally, `npm run build` is the phone app export build (it temporarily moves `src/app/api` out); the website build is `npx next build`. Sohan runs both and pastes the result. Commit and push only after he confirms. Short commands (`git`, `grep`, `ls`) are fine.

---

## 0. What the stack already does (do not build these)

These were on the request list but Vercel, Next.js and Supabase already handle them. Do not add code or services for them.

| Request | Status |
|---|---|
| Add a CDN | Vercel serves every static file and page from its global edge network already. |
| Minify JS and CSS | `next build` minifies everything in production automatically. |
| Split code into chunks | The App Router already splits code per route. What is left is lazy loading heavy libraries inside a route (6B, P4). |
| Compress API payloads | Vercel and Supabase already gzip or brotli every response. What is left is sending less data (6B, P6). |
| Add a load balancer | Vercel functions scale automatically and Supabase manages the database side. Not applicable. |
| Database connection pooling | The app reaches Postgres through Supabase's REST API, which pools connections itself. Only relevant if a direct Postgres connection is ever added (then use the pooler on port 6543). |
| Server-side caching | Only for public pages (6B, P10). App pages are personal per user and must never be cached on the server. |

---

# PASS 6P: Rebuild web payments (Polar)

**Ships first and alone.** Web visitors cannot pay right now: every plan shows "Payment system error: Load failed". In Safari, "Load failed" means the browser never got a response from the checkout request (the request went to a different domain, was blocked, or the connection failed). It is not a Polar decline. This pass replaces the web checkout path end to end with a small, clean, same-origin version.

Scope:
- **Web only** (desktop and phone browsers). The native iOS and Android apps use Apple and Google in-app purchase. Do not touch any native purchase code. Polar must never show inside the native app.
- **Keep every existing Pro user's Pro.** No changes to existing rows. Nothing in this pass may downgrade anyone except the webhook rules below.
- **Keep the webhook URL Polar already calls.** Find the current webhook route path in the code and rebuild its insides at the same path. Do not move it.
- Keep the old route `/api/checkout/create` as a thin wrapper that calls the new server code, so any old client still works.
- Env names stay as they are: `POLAR_ACCESS_TOKEN`, `POLAR_PRODUCT_ID_MONTHLY`, `POLAR_PRODUCT_ID_YEARLY`, `POLAR_PRODUCT_ID_LIFETIME`, `POLAR_SUCCESS_URL`, `POLAR_WEBHOOK_SECRET`. Add one optional `POLAR_SERVER` (`production` by default, `sandbox` only for testing).

## B0. First report what the old code did (2 minutes, read only)

In your first message, before editing, answer in 3 lines:
1. What URL `useCheckout` fetched (relative `/api/...` or absolute using `NEXT_PUBLIC_APP_URL` or another base).
2. The host part only of `NEXT_PUBLIC_APP_URL` and `POLAR_SUCCESS_URL` in `.env.local` (for example `https://focalyst.online`). Never print tokens or IDs.
3. The current webhook route path and the plan strings the app stores in `users.plan` (for example `monthly`, `yearly`, `lifetime`, `pro`, `free`, `null`) and how `isPro` is decided.

## B1. Verify the Polar token and products (Sohan runs this)

Create `scripts/check-polar.mjs`. It prints no secrets. Sohan runs it with `node --env-file=.env.local scripts/check-polar.mjs`.

```js
// scripts/check-polar.mjs
const base = process.env.POLAR_SERVER === 'sandbox' ? 'https://sandbox-api.polar.sh' : 'https://api.polar.sh';
const token = process.env.POLAR_ACCESS_TOKEN;
if (!token) { console.log('POLAR_ACCESS_TOKEN is missing'); process.exit(1); }
const ids = {
  monthly: process.env.POLAR_PRODUCT_ID_MONTHLY,
  yearly: process.env.POLAR_PRODUCT_ID_YEARLY,
  lifetime: process.env.POLAR_PRODUCT_ID_LIFETIME,
};
for (const [plan, id] of Object.entries(ids)) {
  if (!id) { console.log(`${plan}: product id MISSING`); continue; }
  const r = await fetch(`${base}/v1/products/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.log(`${plan}: ERROR ${r.status}`, r.status === 401 ? '(token invalid, expired or revoked)' : r.status === 404 ? '(product not in this Polar org/server)' : '', JSON.stringify(j.detail ?? '').slice(0, 200));
    continue;
  }
  const prices = (j.prices ?? []).map((p) => `${p.price_amount != null ? (p.price_amount / 100).toFixed(2) : p.amount_type} ${p.price_currency ?? ''}`.trim());
  console.log(`${plan}: "${j.name}" | archived: ${j.is_archived} | recurring: ${j.recurring_interval ?? 'one-time'} | prices: ${prices.join(', ')}`);
}
```

What the results mean:
- `ERROR 401`: the token is dead. Sohan creates a new Organization Access Token in Polar (see the dashboard table) and updates `.env.local` and Vercel.
- `ERROR 404`: wrong product id, or a sandbox id used against production.
- `archived: true`: the product is archived in Polar and cannot be sold.
- `prices`: shows which currency Polar actually charges. If the paywall shows INR but Polar only has a USD price, Indian visitors see ₹ but pay $. Report this to Sohan; do not change pricing display without his decision.

## B2. Database (file `supabase/phase6/00_billing.sql`, Sohan runs it before this pass is pushed)

Two new nullable columns (safe for the mobile app, which ignores them) and a lookup the webhook needs for older Polar customers.

```sql
alter table public.users add column if not exists billing_provider text;   -- 'polar' | 'apple' | 'google' | null
alter table public.users add column if not exists polar_customer_id text;

create or replace function public.user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;
revoke all on function public.user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.user_id_by_email(text) to service_role;
```

If the audit shows `users` already has a column recording where Pro came from, use that instead of `billing_provider` and drop that line.

## B3. Server files

**`src/lib/server/auth.ts`** (shared; Phase 6A `guard.ts` will import from here instead of duplicating):

```ts
import 'server-only';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function supabaseFor(req: NextRequest): Promise<SupabaseClient> {
  const bearer = req.headers.get('authorization');
  if (bearer?.startsWith('Bearer ')) {
    return createClient(URL_, ANON, {
      global: { headers: { Authorization: bearer } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  const store = await cookies();
  return createServerClient(URL_, ANON, { cookies: { getAll: () => store.getAll(), setAll: () => {} } });
}

export async function requireUser(req: NextRequest): Promise<{ user: User; supabase: SupabaseClient } | null> {
  const supabase = await supabaseFor(req);
  const { data: { user } } = await supabase.auth.getUser(); // verified with Supabase, never getSession() on the server
  return user ? { user, supabase } : null;
}

// Same-site browser requests only. Requests with no Origin header (server to server) are allowed;
// the route still requires a logged-in user.
export function originAllowed(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === req.nextUrl.host || /^(www\.)?focalyst\.online$/.test(new URL(origin).host)
      || (process.env.NODE_ENV !== 'production' && new URL(origin).hostname === 'localhost');
  } catch { return false; }
}
```

**`src/lib/billing/plans.ts`**

```ts
import 'server-only';

export const PLAN_KEYS = ['monthly', 'yearly', 'lifetime'] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

const PRODUCT_ENV: Record<PlanKey, string> = {
  monthly: 'POLAR_PRODUCT_ID_MONTHLY',
  yearly: 'POLAR_PRODUCT_ID_YEARLY',
  lifetime: 'POLAR_PRODUCT_ID_LIFETIME',
};

export function productIdFor(plan: PlanKey): string {
  const id = process.env[PRODUCT_ENV[plan]];
  if (!id) throw new Error(`Missing env ${PRODUCT_ENV[plan]}`);
  return id;
}

export function planForProduct(productId?: string | null): PlanKey | null {
  if (!productId) return null;
  return PLAN_KEYS.find((p) => process.env[PRODUCT_ENV[p]] === productId) ?? null;
}

// Map to the EXACT strings the app already stores in users.plan (from B0 item 3).
export const PLAN_VALUE: Record<PlanKey, string> = { monthly: 'monthly', yearly: 'yearly', lifetime: 'lifetime' };
export const FREE_VALUE: string | null = null; // or 'free', match the existing app
```

**`src/lib/billing/polar.ts`**

```ts
import 'server-only';

const BASE = process.env.POLAR_SERVER === 'sandbox' ? 'https://sandbox-api.polar.sh' : 'https://api.polar.sh';

export class PolarError extends Error {
  constructor(public status: number, public detail: unknown) { super(`polar ${status}`); }
}

export async function polar<T>(path: string, opts: { method?: 'GET' | 'POST'; body?: unknown; query?: Record<string, string> } = {}): Promise<T> {
  const token = process.env.POLAR_ACCESS_TOKEN;
  if (!token) throw new PolarError(500, 'POLAR_ACCESS_TOKEN missing');
  const url = new URL(path, BASE);
  for (const [k, v] of Object.entries(opts.query ?? {})) url.searchParams.set(k, v);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetch(url, {
      method: opts.method ?? 'GET',
      cache: 'no-store',
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const text = await res.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = text; }
    if (!res.ok) {
      console.error('[polar]', opts.method ?? 'GET', path, res.status, JSON.stringify(json?.detail ?? json).slice(0, 800));
      throw new PolarError(res.status, json?.detail ?? json);
    }
    return json as T;
  } finally {
    clearTimeout(timer);
  }
}
```

**`src/app/api/billing/checkout/route.ts`**

```ts
import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireUser, originAllowed } from '@/lib/server/auth';
import { polar, PolarError } from '@/lib/billing/polar';
import { PLAN_KEYS, productIdFor, PLAN_VALUE } from '@/lib/billing/plans';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({ plan: z.enum(PLAN_KEYS) });
const FRIENDLY = 'Could not open checkout. Please try again, or email contactfocalyst@gmail.com.';

export async function POST(req: NextRequest) {
  if (!originAllowed(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const auth = await requireUser(req);
  if (!auth) return NextResponse.json({ error: 'Please sign in again.', code: 'auth' }, { status: 401 });
  const { user, supabase } = auth;

  let plan: (typeof PLAN_KEYS)[number];
  try { plan = Body.parse(await req.json()).plan; }
  catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }

  // Do not sell a second plan to someone who already has Pro.
  // Allowed: a monthly or yearly subscriber buying Lifetime.
  const { data: row } = await supabase.from('users').select('plan, plan_expires_at').eq('id', user.id).maybeSingle();
  const active = !!row?.plan && row.plan !== 'free' && (!row.plan_expires_at || new Date(row.plan_expires_at) > new Date());
  if (active && (row!.plan === PLAN_VALUE.lifetime || plan !== 'lifetime')) {
    return NextResponse.json({ code: 'already_pro' }, { status: 409 });
  }

  const origin = req.nextUrl.origin; // always the domain the visitor is on, so no cross-domain surprises

  // Polar picks USD or INR from the location of the IP that creates the checkout.
  // This route runs on a Vercel server, so we MUST pass the visitor's IP, otherwise
  // every Indian visitor is charged in USD.
  const visitorIp =
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    undefined;

  const body = {
    products: [productIdFor(plan)],
    customer_ip_address: visitorIp,
    success_url: `${origin}/billing/success?checkout_id={CHECKOUT_ID}`,
    return_url: `${origin}/paywall`,
    customer_email: user.email ?? undefined,
    metadata: { user_id: user.id, plan, source: 'web' },
    allow_discount_codes: true,
  };

  try {
    let checkout: { url: string };
    try {
      checkout = await polar('/v1/checkouts/', { method: 'POST', body: { ...body, external_customer_id: user.id } });
    } catch (e) {
      // Some older Polar customers exist with this email but no external id. Retry once without it;
      // metadata.user_id still lets the webhook find the user.
      if (e instanceof PolarError && e.status === 422) {
        checkout = await polar('/v1/checkouts/', { method: 'POST', body });
      } else {
        throw e;
      }
    }
    return NextResponse.json({ url: checkout.url });
  } catch (e) {
    const status = e instanceof PolarError ? e.status : 500;
    const code = status === 401 || status === 403 ? 'polar_auth' : 'polar_error';
    console.error('[billing/checkout]', code, status);
    return NextResponse.json({ error: FRIENDLY, code }, { status: 502 });
  }
}
```

Success page: if `POLAR_SUCCESS_URL` already points to a page in this app, use that page's path instead of `/billing/success` and keep `checkout_id={CHECKOUT_ID}`. Otherwise create `/billing/success` (B5).

**`src/app/api/billing/portal/route.ts`** (the "Manage" button for Pro users)

```ts
import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { requireUser, originAllowed } from '@/lib/server/auth';
import { polar } from '@/lib/billing/polar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!originAllowed(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const auth = await requireUser(req);
  if (!auth) return NextResponse.json({ error: 'Please sign in again.', code: 'auth' }, { status: 401 });
  const { user, supabase } = auth;
  const return_url = `${req.nextUrl.origin}/settings`;

  const attempts: Array<() => Promise<{ customer_portal_url: string }>> = [
    () => polar('/v1/customer-sessions/', { method: 'POST', body: { external_customer_id: user.id, return_url } }),
    async () => {
      const { data } = await supabase.from('users').select('polar_customer_id').eq('id', user.id).maybeSingle();
      if (!data?.polar_customer_id) throw new Error('no polar id');
      return polar('/v1/customer-sessions/', { method: 'POST', body: { customer_id: data.polar_customer_id, return_url } });
    },
    async () => {
      if (!user.email) throw new Error('no email');
      const list = await polar<{ items: { id: string }[] }>('/v1/customers/', { query: { email: user.email } });
      if (!list.items?.[0]) throw new Error('no customer');
      return polar('/v1/customer-sessions/', { method: 'POST', body: { customer_id: list.items[0].id, return_url } });
    },
  ];

  for (const attempt of attempts) {
    try { const s = await attempt(); return NextResponse.json({ url: s.customer_portal_url }); } catch { /* try next */ }
  }
  return NextResponse.json({ error: 'We could not find your billing account. Email contactfocalyst@gmail.com and we will sort it out.', code: 'no_customer' }, { status: 404 });
}
```

If the user's Pro came from Apple or Google (`billing_provider` is `apple` or `google`), the Manage button does not call this route. It shows: "Your plan is managed in the App Store" or "Google Play" with the matching store subscription link.

**Webhook, at the existing path**, using the official adapter (it verifies the signature for us):

```bash
npm i @polar-sh/nextjs@latest
```

```ts
// <existing webhook path>/route.ts
import { Webhooks } from '@polar-sh/nextjs';
import { applyPolarEvent } from '@/lib/billing/sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,
  onOrderPaid: async (p) => applyPolarEvent('order.paid', p.data),
  onOrderRefunded: async (p) => applyPolarEvent('order.refunded', p.data),
  onSubscriptionActive: async (p) => applyPolarEvent('subscription.active', p.data),
  onSubscriptionUpdated: async (p) => applyPolarEvent('subscription.updated', p.data),
  onSubscriptionUncanceled: async (p) => applyPolarEvent('subscription.uncanceled', p.data),
  onSubscriptionCanceled: async (p) => applyPolarEvent('subscription.canceled', p.data),
  onSubscriptionRevoked: async (p) => applyPolarEvent('subscription.revoked', p.data),
});
```

Check the field names below against the installed package's TypeScript types (the docs say the payload uses snake_case, for example `data.customer_id`) and adjust if they differ.

**`src/lib/billing/sync.ts`**

```ts
import 'server-only';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { planForProduct, PLAN_VALUE, FREE_VALUE } from '@/lib/billing/plans';

type Ev =
  | 'order.paid' | 'order.refunded'
  | 'subscription.active' | 'subscription.updated' | 'subscription.uncanceled'
  | 'subscription.canceled' | 'subscription.revoked';

async function resolveUserId(d: any): Promise<string | null> {
  const direct = d?.customer?.external_id ?? d?.metadata?.user_id ?? d?.customer?.metadata?.user_id;
  if (direct) return String(direct);

  const cid = d?.customer_id ?? d?.customer?.id;
  if (cid) {
    const { data } = await supabaseAdmin.from('users').select('id').eq('polar_customer_id', cid).maybeSingle();
    if (data?.id) return data.id;
  }
  const email = d?.customer?.email ?? d?.customer_email;
  if (email) {
    const { data } = await supabaseAdmin.rpc('user_id_by_email', { p_email: email });
    if (data) return data as string;
  }
  return null;
}

export async function applyPolarEvent(type: Ev, d: any) {
  const plan = planForProduct(d?.product_id ?? d?.product?.id ?? d?.items?.[0]?.product_id);
  if (!plan) { console.warn('[polar] ignoring event for unknown product', type); return; }

  const userId = await resolveUserId(d);
  if (!userId) { console.error('[polar] no matching user', type, d?.id); return; } // 200, no retry loop

  const { data: row, error: readErr } = await supabaseAdmin
    .from('users').select('plan, plan_expires_at, billing_provider').eq('id', userId).maybeSingle();
  if (readErr) throw readErr; // 500, Polar retries

  const isLifetime = row?.plan === PLAN_VALUE.lifetime;
  const fromStore = row?.billing_provider === 'apple' || row?.billing_provider === 'google';
  const cid = d?.customer_id ?? d?.customer?.id ?? null;

  let update: Record<string, unknown> | null = null;

  switch (type) {
    case 'order.paid':
      // Subscriptions are handled by subscription events. Only Lifetime is granted here.
      if (plan === 'lifetime') update = { plan: PLAN_VALUE.lifetime, plan_expires_at: null };
      break;

    case 'order.refunded':
      if (plan === 'lifetime' && isLifetime && d?.status === 'refunded') update = { plan: FREE_VALUE, plan_expires_at: null };
      break;

    case 'subscription.active':
    case 'subscription.updated':
    case 'subscription.uncanceled':
    case 'subscription.canceled': // cancel at period end: keep Pro until current_period_end
      if (isLifetime) break;
      if (d?.status === 'active' || d?.status === 'trialing') {
        update = { plan: PLAN_VALUE[plan], plan_expires_at: d?.current_period_end ?? null };
      } else if (!fromStore) {
        update = { plan: FREE_VALUE, plan_expires_at: null };
      }
      break;

    case 'subscription.revoked':
      if (!isLifetime && !fromStore) update = { plan: FREE_VALUE, plan_expires_at: null };
      break;
  }

  if (!update) return;
  const grants = update.plan !== FREE_VALUE;
  const { error } = await supabaseAdmin
    .from('users')
    .update({ ...update, ...(grants ? { billing_provider: 'polar' } : {}), ...(cid ? { polar_customer_id: cid } : {}) })
    .eq('id', userId);
  if (error) throw error;
  console.info('[polar] applied', type, plan, grants ? 'grant' : 'revoke');
}
```

Never log emails, names or tokens. If any existing webhook code also does other things (for example XP, emails, notifications on purchase), keep those side effects by calling them from `applyPolarEvent`.

## B4. Client

Rewrite `src/lib/billing/checkout.ts` (from the hotfix) so the web always calls its own domain:

```ts
'use client';

export type PlanKey = 'monthly' | 'yearly' | 'lifetime';
export type CheckoutResult =
  | { ok: true }
  | { ok: false; code: 'native' | 'auth' | 'already_pro' | 'network' | string; message?: string };

const FRIENDLY = 'Could not open checkout. Please try again, or email contactfocalyst@gmail.com.';

export function isNativeApp(): boolean {
  try { return Boolean((window as any).Capacitor?.isNativePlatform?.()); } catch { return false; }
}

async function post(path: string, body?: unknown): Promise<{ res: Response; data: any } | null> {
  try {
    const res = await fetch(path, {            // RELATIVE path: same domain, no CORS, works on www and non-www
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  } catch (e) {
    console.error('[billing] network error', path, e);
    return null;
  }
}

export async function startCheckout(plan: PlanKey): Promise<CheckoutResult> {
  if (isNativeApp()) return { ok: false, code: 'native' };
  const r = await post('/api/billing/checkout', { plan });
  if (!r) return { ok: false, code: 'network', message: 'Could not reach Focalyst. Check your connection and try again.' };
  if (r.res.status === 401) { window.location.assign(`/login?next=${encodeURIComponent('/paywall')}`); return { ok: false, code: 'auth' }; }
  if (r.res.status === 409) return { ok: false, code: 'already_pro', message: 'You already have Focalyst Pro.' };
  if (!r.res.ok || !r.data?.url) {
    console.error('[billing] checkout failed', r.res.status, r.data?.code);
    return { ok: false, code: r.data?.code ?? 'error', message: r.data?.error ?? FRIENDLY };
  }
  window.location.assign(r.data.url);           // same tab, never window.open
  return { ok: true };
}

export async function openBillingPortal(): Promise<CheckoutResult> {
  if (isNativeApp()) return { ok: false, code: 'native' };
  const r = await post('/api/billing/portal');
  if (!r) return { ok: false, code: 'network', message: 'Could not reach Focalyst. Check your connection and try again.' };
  if (r.res.status === 401) { window.location.assign(`/login?next=${encodeURIComponent('/settings')}`); return { ok: false, code: 'auth' }; }
  if (!r.res.ok || !r.data?.url) return { ok: false, code: r.data?.code ?? 'error', message: r.data?.error ?? FRIENDLY };
  window.location.assign(r.data.url);
  return { ok: true };
}
```

Use the app's real sign-in route in place of `/login` if it differs.

- `useCheckout` becomes a thin wrapper over `startCheckout` so every existing call site keeps working. Remove any use of `NEXT_PUBLIC_APP_URL` or another absolute base for billing calls on the web.
- Every Pro button, on desktop and mobile web: tap sets "Opening checkout" and disables the button; on an error result, re-enable and show the message with the existing Toast; on `already_pro`, show the message with a "Manage plan" action that calls `openBillingPortal`. No `alert()` anywhere.
- The yearly key is `yearly` everywhere (the Paywall CTA fix from the hotfix stays).
- The old `/api/checkout/create` route now validates the same way and calls the same server code as `/api/billing/checkout`.

### Showing the right currency

Every Polar product (Monthly, Yearly, Lifetime) has two prices: USD ($4.99, $39.99, $99.99) and INR (₹99, ₹999, ₹2,999). Polar charges INR when the visitor's IP is in India and USD otherwise. The paywall must show the same currency Polar will charge, so it decides the same way (by IP location), not by browser language or time zone.

```ts
// src/app/api/billing/region/route.ts
import { NextResponse, type NextRequest } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const country = req.headers.get('x-vercel-ip-country') ?? '';
  return NextResponse.json(
    { currency: country === 'IN' ? 'INR' : 'USD' },
    { headers: { 'Cache-Control': 'private, max-age=3600' } },
  );
}
```

- `src/lib/billing/useCurrency.ts`: a client hook that calls `/api/billing/region` once (cache the answer in memory for the session) and returns `'INR' | 'USD'`. While loading, show a price skeleton, never a wrong currency.
- Paywall, Settings > Pro and the landing page pricing all use this hook and the same price table:

```ts
export const PRICES = {
  USD: { monthly: '$4.99', yearly: '$39.99', lifetime: '$99.99' },
  INR: { monthly: '₹99', yearly: '₹999', lifetime: '₹2,999' },
} as const;
```

- Show prices as `₹2,999` (rupee symbol), not "INR 2,999".
- Under the plan buttons, one small line: "Final price and any taxes are shown at checkout."
- In the native app nothing changes (the store shows its own local prices).
- In the phone app export build there is no server, so this route must not be called there (`isNativeApp()` is true there anyway).

## B5. Success page

At `/billing/success` (or the existing success page from B0):
- Shows "Confirming your payment" with the FocusRing spinner.
- Re-reads the user's plan every 2 seconds for up to 40 seconds (the webhook usually arrives within a few seconds).
- When Pro is active: "Welcome to Focalyst Pro" with a button "Start using Pro" to `/today`, and `emitDataChanged('profile')`.
- If 40 seconds pass: "Your payment went through. Pro can take a minute to appear. Refresh this page, or email contactfocalyst@gmail.com if it does not show up within 10 minutes." Never say the payment failed here.
- Works in light and dark, at 375px and desktop.

## B6. Test plan (Sohan runs commands; Antigravity never runs builds or dev servers)

1. Sohan runs `node --env-file=.env.local scripts/check-polar.mjs`. All three plans must show a name and price, not `ERROR`.
2. Sohan runs `npm run dev`, logs in at `http://localhost:3000`, opens `/paywall`, taps Monthly, Yearly and Lifetime one at a time. Each must open a real Polar checkout page with the right product. Do not pay. (On localhost there is no real visitor IP, so the currency check happens on the live site in step 5.)
3. Sohan runs `npx next build` (the website build; locally `npm run build` is the phone app export build) and then `npm run build` (the phone app build). Both pass.
4. Commit "fix: rebuild web payments on polar" and `git push origin main` only after Sohan confirms 1 to 3 and has run `00_billing.sql`.
5. On the live site, on laptop and phone: all three plans open Polar. From India, the paywall shows ₹99, ₹999 and ₹2,999 and Polar checkout shows the same INR amounts. With a VPN set to the US (optional), both show USD. A Pro test account's Manage opens the Polar portal.
6. Full end-to-end test without spending money: in Polar create a 100 percent discount code limited to 1 use, buy Lifetime with it on a test account, and check that the success page turns into "Welcome to Focalyst Pro" and the account shows Pro. Then remove Pro from that test account in Supabase by hand and delete the code.

---

# PASS 6A: Security and API abuse protection

This pass assumes 6P is live. `src/lib/billing/*` and `src/lib/server/auth.ts` are the billing and auth code; build on them, never replace them. `guard.ts` (S4) imports `supabaseFor` from `src/lib/server/auth.ts` instead of defining its own.

## S0. Vercel Web Analytics and Speed Insights

Ships first in this pass, so real-visitor speed data starts collecting before the speed work in 6B.

**Install:**

```bash
npm i @vercel/analytics@latest @vercel/speed-insights@latest
```

**Component** (strips anything personal from addresses before it leaves the browser: note ids, group ids, invite codes, auth tokens, query strings):

```tsx
// src/components/VercelInsights.tsx
'use client';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const KEEP_PARAMS = new Set(['utm_source', 'utm_medium', 'utm_campaign', 'ref']);
const SKIP_PATHS = ['/auth', '/login/callback', '/reset-password', '/api'];

function scrub(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (SKIP_PATHS.some((p) => u.pathname.startsWith(p))) return null; // never send auth or token pages
    u.hash = '';
    for (const k of [...u.searchParams.keys()]) if (!KEEP_PARAMS.has(k)) u.searchParams.delete(k);
    u.pathname = u.pathname
      .replace(UUID, ':id')
      .replace(/\/\d{3,}(?=\/|$)/g, '/:n')
      .replace(/\/(join|invite)\/[^/]+/gi, '/$1/:code');
    return u.toString();
  } catch {
    return null;
  }
}

export function VercelInsights() {
  return (
    <>
      <Analytics
        beforeSend={(event) => {
          const url = scrub(event.url);
          return url ? { ...event, url } : null;
        }}
      />
      <SpeedInsights
        sampleRate={1}
        beforeSend={(event) => {
          const url = scrub(event.url);
          return url ? { ...event, url } : null;
        }}
      />
    </>
  );
}
```

Adjust `SKIP_PATHS` and the invite pattern to the real route names in this app (check the auth callback, password reset and group join routes).

**Mount once** in the root `app/layout.tsx`, inside `<body>`, **web build only**. The native app (Capacitor export) has no Vercel server, so the scripts would 404 there. Use the same flag `next.config.ts` uses for `isMobile`, exposed to the client (for example `NEXT_PUBLIC_BUILD_TARGET`):

```tsx
{process.env.NEXT_PUBLIC_BUILD_TARGET !== 'mobile' && <VercelInsights />}
```

**Rules:**
- No `track()` custom events. They are not part of the free plan and are not needed now.
- Never put a user id, email, name or note title into anything sent to Vercel.
- CSP: the current packages load from this site's own domain, so `'self'` already covers them. If the console shows a CSP block for a `vercel-insights.com` or `/_vercel/` address, add exactly that address to `script-src` / `connect-src`.
- Content blockers (uBlock and similar) may block these scripts. That is expected and must not cause console errors that break anything.

**Privacy Policy update (ships in the same commit).** The policy currently says Focalyst uses no analytics. Change these parts of `/privacy`, word for word:

1. "The short version" card, replace the analytics line with:
   > We never sell your data and we do not use advertising trackers. We use privacy-friendly, cookieless analytics from Vercel to count visits and measure how fast pages load.

2. Section 2.8 Technical information, replace the whole paragraph with:
   > 2.8 Technical information. Like any website, our hosting provider processes basic technical data such as your IP address, browser type and request logs to deliver the Service and keep it secure. On our website and web app we also use Vercel Web Analytics and Vercel Speed Insights. They record anonymous, aggregated information such as the page visited (with personal identifiers removed from the address), the referring website, your country or region, browser, operating system, device type and how quickly the page loaded. They do not use cookies, do not identify you and do not follow you across other websites. Vercel recognises a single visit using a temporary value derived from the request, which is discarded after 24 hours. These tools are not used inside our iOS and Android apps.

3. Service providers table, Vercel row, "What they do" becomes:
   > Hosting, content delivery, security, and anonymous website analytics and performance measurement

   Link stays https://vercel.com/legal/privacy-policy

4. Retention table, add a row:
   > Website analytics and performance data | Anonymous and aggregated. Kept by Vercel under its own retention periods.

5. Section 11 Cookies and local storage, replace the last sentence with:
   > We do not use advertising cookies, and our analytics are cookieless.

6. Update the "Last updated" date at the top to the day this ships.

Also update the internal facts line at the top of `PHASE5_CONTENT.md` from "No analytics or advertising tools are used." to "Vercel Web Analytics and Speed Insights (cookieless) are used on the web only. No advertising tools." so future work stays consistent.

## S1. Audit first (read-only, write `PHASE6_AUDIT.md` in the repo root)

Before changing anything, produce `PHASE6_AUDIT.md` with these tables. Keep it short, one row per item.

1. **Every server entry point**: every `route.ts` under `src/app/api`, every Server Action (`'use server'`), every Supabase Edge Function. Columns: path, what it does, calls which paid service (OpenRouter, Whisper, Polar), checks the user (yes/no, how), rate limited (yes/no), validates input (yes/no).
2. **Every environment variable**: name, where it is read, whether it starts with `NEXT_PUBLIC_`. Flag any secret (OpenRouter key, Supabase service role key, Polar token or webhook secret, Kit secret) that is `NEXT_PUBLIC_` or is imported by a client component.
3. **Every table in the database** the code touches: table, who writes it (web client, mobile client, server, webhook), RLS policies the code assumes. Also list Storage buckets and whether voice audio is uploaded.
4. **Privileged writes from the client**: every place browser code writes `users.plan`, `users.plan_expires_at`, `users.total_xp`, `users.current_level`, `users.current_title`, `xp_logs`, or any AI message counter.
5. **Where the Free limits are enforced**: AI 5 messages a day, habits, notes, voice notes, countdowns (1 Free, 3 Pro), custom timers. Client only or server.
6. **How the mobile app reaches the server**: does the Capacitor build call `https://focalyst.online/api/...`, Supabase Edge Functions, or OpenRouter directly. Which origin header does it send.
7. **Versions**: `next`, `react`, `react-dom`, `@supabase/ssr`, `@supabase/supabase-js`, and `npm audit --omit=dev` summary.
8. **Every `dangerouslySetInnerHTML`** and every place AI output or note HTML is rendered.

If item 2 finds a secret exposed to the browser, or item 6 finds the OpenRouter key inside the mobile bundle, put **CRITICAL** at the top of the audit file. Those keys must be rotated by Sohan after the fix ships.

## S2. Patch the framework

Update to the latest patch release of the line already in use:

```bash
npm install next@^16 react@^19.2 react-dom@^19.2 @supabase/ssr@latest @supabase/supabase-js@latest
npm audit --omit=dev
```

React Server Components had a critical remote code execution bug (CVE-2025-55182) in December 2025 and follow-up denial of service fixes in January 2026 (fixed in React 19.2.4+, Next 16.1.5+). Being on the latest 16.x and 19.2.x covers all of them. Fix every `high` or `critical` from `npm audit` that has a non-breaking fix.

Add `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule: { interval: weekly }
    open-pull-requests-limit: 5
    groups:
      minor-and-patch: { update-types: [minor, patch] }
```

## S3. Keep secrets on the server

- Every file that reads a secret starts with `import 'server-only';` (`npm i server-only`). This makes the build fail if a client component ever imports it.
- Only these may be `NEXT_PUBLIC_`: Supabase URL, Supabase anon (publishable) key, site URL, Kit form ID. Everything else is server only.
- The Supabase service role key is used in exactly two places: the Polar webhook and account deletion. Put it in `src/lib/server/supabaseAdmin.ts` with `server-only`.
- Run a history scan once and report findings in the audit (do not print secret values):

```bash
npx gitleaks@latest detect --source . --redact --no-banner
```

**Known findings from Sohan's `.env.local` (fix these, they are CRITICAL):**
- `NEXT_PUBLIC_OPENROUTER_API_KEY` exists. Anything starting with `NEXT_PUBLIC_` is copied into the JavaScript every visitor downloads, so anyone can take this key and spend Focalyst's OpenRouter credit. The web must call OpenRouter only from the server with `OPENROUTER_API_KEY`. Remove every use of `NEXT_PUBLIC_OPENROUTER_API_KEY` from the code.
- `EXPO_PUBLIC_OPENROUTER_...` exists. `EXPO_PUBLIC_` values are built into the phone app the same way. Find out (code search in this repo, and say so in the audit if the phone app lives elsewhere) whether the native app calls OpenRouter directly. If it does, it must move to calling the server AI route in a future app update. Until then that key gets its own OpenRouter key with a low credit limit, separate from the web key.
- `NEXT_PUBLIC_GEMINI_API_KEY` exists but Gemini is no longer used. Remove it from code and env.
- `RAZORPAY_*` (5 variables) exist but Razorpay is no longer used. Remove every Razorpay code path and these variables from `.env.local`. Sohan removes them from Vercel.
- After the code no longer needs them, Sohan rotates the OpenRouter keys (new keys, old ones deleted) because the old web key has been public.

Note for Sohan in the audit: the Supabase anon key being public is normal and safe. Security comes from Row Level Security, which S8 tightens.

## S4. One guard for every API route

Create `src/lib/server/guard.ts`. Every route handler under `src/app/api` (except the Polar webhook) goes through `withGuard`. It checks origin, the logged-in user, body size, input shape and the per-user rate limit, in that order.

```ts
// src/lib/server/guard.ts
import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { z, type ZodType } from 'zod';

const PROD_ORIGINS = ['https://focalyst.online', 'https://www.focalyst.online', 'capacitor://localhost', 'https://localhost'];
const DEV_ORIGINS = ['http://localhost:3000'];
const ALLOWED = new Set(process.env.NODE_ENV === 'production' ? PROD_ORIGINS : [...PROD_ORIGINS, ...DEV_ORIGINS]);

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function cors(origin: string | null): Record<string, string> {
  if (!origin || !ALLOWED.has(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'authorization,content-type',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
}

async function supabaseFor(req: NextRequest): Promise<SupabaseClient> {
  const bearer = req.headers.get('authorization');
  if (bearer?.startsWith('Bearer ')) {
    // Capacitor / mobile: token in header
    return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: bearer } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => store.getAll(), setAll: () => {} },
  });
}

type Opts<T> = {
  bucket: string;          // e.g. 'ai-chat'
  limit: number;           // requests per window per user
  windowSec: number;
  schema?: ZodType<T>;
  maxBytes?: number;       // default 32 KB
};

export type Ctx<T> = { user: User; supabase: SupabaseClient; body: T; req: NextRequest };

export function withGuard<T>(opts: Opts<T>, handler: (ctx: Ctx<T>) => Promise<Response>) {
  return async (req: NextRequest) => {
    const origin = req.headers.get('origin');
    const headers = cors(origin);
    try {
      if (origin && !ALLOWED.has(origin)) throw new HttpError(403, 'Forbidden');

      const supabase = await supabaseFor(req);
      // getUser() verifies the token with Supabase. Never trust getSession() on the server.
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new HttpError(401, 'Please sign in again.');

      let body = undefined as T;
      if (req.method !== 'GET') {
        const raw = await req.text();
        if (raw.length > (opts.maxBytes ?? 32_768)) throw new HttpError(413, 'That request is too large.');
        if (opts.schema) {
          let json: unknown;
          try { json = raw ? JSON.parse(raw) : {}; } catch { throw new HttpError(400, 'Invalid request.'); }
          const parsed = opts.schema.safeParse(json);
          if (!parsed.success) throw new HttpError(400, 'Invalid request.');
          body = parsed.data;
        }
      }

      const { data: ok, error } = await supabase.rpc('hit_rate_limit', {
        p_bucket: opts.bucket, p_limit: opts.limit, p_window_seconds: opts.windowSec,
      });
      if (error) throw new HttpError(503, 'Please try again in a moment.'); // fail closed
      if (!ok) throw new HttpError(429, 'You are going a little fast. Try again in a minute.');

      const res = await handler({ user, supabase, body, req });
      Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      const message = e instanceof HttpError ? e.message : 'Something went wrong. Please try again.';
      if (!(e instanceof HttpError)) console.error('[api]', req.nextUrl.pathname, e); // never send raw errors to the client
      return NextResponse.json({ error: message }, { status, headers });
    }
  };
}

export function preflight(req: NextRequest) {
  return new Response(null, { status: 204, headers: cors(req.headers.get('origin')) });
}
```

Usage in a route:

```ts
// src/app/api/ai/chat/route.ts
import { z } from 'zod';
import { withGuard, preflight } from '@/lib/server/guard';

const Body = z.object({
  message: z.string().trim().min(1).max(4000),
  conversationId: z.string().uuid().optional(),
});

export const OPTIONS = preflight;
export const POST = withGuard({ bucket: 'ai-chat', limit: 10, windowSec: 60, schema: Body }, async ({ user, supabase, body }) => {
  // see S6
});
```

Per-route limits (per user):

| Route | Limit |
|---|---|
| AI chat | 10 per minute, plus the daily quota in S6 |
| Voice transcription / summary | 5 per minute |
| Group join by code | 10 per hour |
| Group create, invite actions | 20 per hour |
| Account deletion | 3 per hour |
| Anything else that writes | 60 per minute |

Server Actions: wrap the body of each one the same way (call `supabase.auth.getUser()`, validate with zod, call `hit_rate_limit`). Next.js already checks the origin for Server Actions.

## S5. Rate limit storage (SQL, file `supabase/phase6/01_rate_limits.sql`)

No new paid service. A tiny Postgres table counted atomically. The function uses the caller's own `auth.uid()`, so nobody can burn someone else's limit.

```sql
create table if not exists public.rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket text not null,
  window_start timestamptz not null,
  hits int not null default 0,
  primary key (user_id, bucket, window_start)
);
alter table public.rate_limits enable row level security;
-- No policies on purpose: only the function below touches this table.

create or replace function public.hit_rate_limit(p_bucket text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_window timestamptz;
  v_hits int;
begin
  if v_uid is null then return false; end if;
  if p_limit < 1 or p_limit > 1000 or p_window_seconds < 1 or p_window_seconds > 86400 then return false; end if;
  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into public.rate_limits (user_id, bucket, window_start, hits)
  values (v_uid, left(p_bucket, 40), v_window, 1)
  on conflict (user_id, bucket, window_start)
  do update set hits = public.rate_limits.hits + 1
  returning hits into v_hits;
  return v_hits <= p_limit;
end;
$$;

revoke all on function public.hit_rate_limit(text, int, int) from public, anon;
grant execute on function public.hit_rate_limit(text, int, int) to authenticated;

-- Clean old rows nightly. Needs the pg_cron extension (Database > Extensions > pg_cron).
-- Enable pg_cron BEFORE running this file, otherwise this last statement fails.
select cron.schedule('purge-rate-limits', '17 3 * * *',
  $$delete from public.rate_limits where window_start < now() - interval '2 days'$$);
```

## S6. Lock down the AI and voice endpoints (the ones that cost money)

These are the endpoints someone would abuse, because every call costs OpenRouter credits.

**Rules for the AI chat route:**
1. Goes through `withGuard` (S4).
2. Daily quota checked **on the server** with the atomic SQL below. Remove any client-only counter, or keep it only for display.
3. The server picks the model from a fixed allowlist. Never accept a model name, temperature, system prompt or `max_tokens` from the request body.
4. Cap the request: user message 4,000 characters, send at most the last 20 messages of history, `max_tokens: 1024`, 30 second timeout with `AbortController`.
5. The user's context (tasks, habits, notes, focus) is loaded on the server with **the user's own Supabase client** from `withGuard`, never the service role client. RLS then guarantees the AI can only ever see that user's data.
6. Never put secrets or internal instructions you would mind leaking into the system prompt.
7. If OpenRouter fails, call `release_ai_message()` so a failed call does not use up a Free message, and return a friendly error.
8. Render AI output with a markdown renderer that does not allow raw HTML (`react-markdown` without `rehype-raw`). Links get `rel="noopener noreferrer nofollow" target="_blank"`.

```ts
// inside the AI route handler
const { data: q } = await supabase.rpc('consume_ai_message').single<{ allowed: boolean; used: number; daily_limit: number }>();
if (!q?.allowed) {
  return NextResponse.json({ error: 'You have used today\'s Focalyst AI messages. Upgrade to Pro for more.', code: 'quota' }, { status: 429 });
}
const ctrl = new AbortController();
const timer = setTimeout(() => ctrl.abort(), 30_000);
try {
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    signal: ctrl.signal,
    headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: AI_MODEL, max_tokens: 1024, messages }),
  });
  if (!r.ok) throw new Error(`openrouter ${r.status}`);
  // ...stream or return
} catch (e) {
  await supabase.rpc('release_ai_message');
  throw e; // withGuard turns this into a generic 500
} finally {
  clearTimeout(timer);
}
```

**SQL, file `supabase/phase6/02_ai_quota.sql`.** Match `v_pro` to the existing `isPro` logic in the code (plan values and Lifetime handling). Pro has an abuse ceiling, not unlimited.

```sql
create table if not exists public.ai_usage_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  messages int not null default 0,
  primary key (user_id, day)
);
alter table public.ai_usage_daily enable row level security;
create policy "ai usage: read own" on public.ai_usage_daily
  for select using ((select auth.uid()) = user_id);

create or replace function public.consume_ai_message()
returns table (allowed boolean, used int, daily_limit int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_pro boolean := false;
  v_tz text := 'Asia/Kolkata';
  v_limit int;
  v_day date;
  v_used int;
begin
  if v_uid is null then return query select false, 0, 0; return; end if;

  select (u.plan is not null and u.plan <> 'free' and (u.plan_expires_at is null or u.plan_expires_at > now())),
         coalesce(nullif(u.timezone, ''), 'Asia/Kolkata')
    into v_pro, v_tz
    from public.users u where u.id = v_uid;
  v_pro := coalesce(v_pro, false);          -- SELECT INTO sets nulls when no row exists
  v_tz := coalesce(v_tz, 'Asia/Kolkata');

  v_limit := case when v_pro then 100 else 5 end;   -- Pro ceiling: confirm with Sohan
  begin
    v_day := (now() at time zone v_tz)::date;
  exception when others then
    v_day := (now() at time zone 'Asia/Kolkata')::date;
  end;

  insert into public.ai_usage_daily (user_id, day, messages)
  values (v_uid, v_day, 1)
  on conflict (user_id, day)
  do update set messages = public.ai_usage_daily.messages + 1
  where public.ai_usage_daily.messages < v_limit
  returning messages into v_used;

  if v_used is null then
    select messages into v_used from public.ai_usage_daily where user_id = v_uid and day = v_day;
    return query select false, coalesce(v_used, v_limit), v_limit;
    return;
  end if;
  return query select true, v_used, v_limit;
end;
$$;

create or replace function public.release_ai_message()
returns void
language sql
security definer
set search_path = public
as $$
  update public.ai_usage_daily
     set messages = greatest(messages - 1, 0)
   where user_id = auth.uid()
     and day = (select max(day) from public.ai_usage_daily where user_id = auth.uid());
$$;

revoke all on function public.consume_ai_message() from public, anon;
revoke all on function public.release_ai_message() from public, anon;
grant execute on function public.consume_ai_message() to authenticated;
grant execute on function public.release_ai_message() to authenticated;
```

If the existing `plan` value for Free is `null` rather than `'free'`, the expression above already handles it. If Lifetime is stored differently, adjust `v_pro` only.

**Voice route (Whisper Large v3 Turbo):**
- `withGuard` with 5 per minute.
- Accept only `audio/webm`, `audio/mp4`, `audio/m4a`, `audio/mpeg`, `audio/wav`, `audio/ogg`. Check the type on the server, not just the file extension.
- Max file size 25 MB. Max duration 10 minutes (reject longer on the server if duration is known, otherwise rely on size).
- Count voice notes against the Free limit on the server, same pattern as the AI quota, if the audit shows the limit is client only.
- Do not keep the audio after transcription unless the app already stores it on purpose. If it is stored, the bucket must be private with a `user_id/` path policy (S8).

## S7. Stop users from giving themselves Pro or XP (SQL)

This is the most important database fix. If RLS lets a user update their own `users` row, anyone can open the browser console and run `supabase.from('users').update({ plan: 'lifetime' })`. The same goes for `total_xp`, which would let people cheat group standings.

**Step 1, ship now, file `supabase/phase6/03_protect_plan.sql`.** Only if the audit (S1 item 4) shows no client, web or mobile, ever writes `plan` or `plan_expires_at`. If the mobile app does write them, do not include this file and flag it in the audit instead.

```sql
create or replace function public.protect_user_privileged_columns()
returns trigger
language plpgsql
as $$
begin
  -- Trusted server code (webhook via service role, or our own SECURITY DEFINER functions) can pass.
  if coalesce(auth.role(), '') <> 'authenticated'
     or coalesce(current_setting('focalyst.trusted', true), '') = 'on' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.plan := null;
    new.plan_expires_at := null;
    return new;
  end if;

  if new.plan is distinct from old.plan
     or new.plan_expires_at is distinct from old.plan_expires_at then
    raise exception 'This field can only be changed by Focalyst.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_user_privileged_columns on public.users;
create trigger trg_protect_user_privileged_columns
  before insert or update on public.users
  for each row execute function public.protect_user_privileged_columns();
```

If the Free plan is stored as `'free'` instead of `null`, set `new.plan := 'free'` in the insert branch.

**Step 2, write now but do not run yet, file `supabase/phase6/04_xp_lock_LATER.sql`.** Moving XP to the server needs the mobile app to call the same function first, otherwise mobile XP stops working. Write the file and the web code behind a flag `NEXT_PUBLIC_XP_RPC=on`, but keep the flag off.

```sql
alter table public.xp_logs add column if not exists ref_id text;
create unique index if not exists xp_logs_dedupe
  on public.xp_logs (user_id, source, ref_id) where ref_id is not null;

create or replace function public.award_xp(p_source text, p_ref_id text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_amount int;
begin
  if v_uid is null then raise exception 'auth required'; end if;

  -- Copy the exact amounts from the XP module ported from mobile in phase 4.1.
  -- Where XP depends on a row (for example a focus session's minutes), read that row here,
  -- check it belongs to v_uid, and compute the amount from it. Never trust an amount from the client.
  v_amount := case p_source
    when 'REPLACE_WITH_REAL_SOURCES' then 0
    else null
  end;
  if v_amount is null then raise exception 'unknown xp source'; end if;

  insert into public.xp_logs (user_id, amount, source, ref_id)
  values (v_uid, v_amount, p_source, p_ref_id)
  on conflict do nothing;
  if not found then return 0; end if;   -- already awarded for this ref

  perform set_config('focalyst.trusted', 'on', true);
  update public.users
     set total_xp = coalesce(total_xp, 0) + v_amount
   where id = v_uid;
  -- Recompute current_level and current_title here from the same thresholds as the XP module.
  return v_amount;
end;
$$;

revoke all on function public.award_xp(text, text) from public, anon;
grant execute on function public.award_xp(text, text) to authenticated;

-- Then add total_xp, current_level, current_title to the trigger in 03 and
-- drop the client INSERT policy on xp_logs.
```

## S8. Row Level Security everywhere (SQL, file `supabase/phase6/05_rls.sql`)

Write the SQL from what the audit found. Rules:
- RLS enabled on every table in `public`. No table without policies except `rate_limits`.
- Own-data tables: one policy per action, always the fast form `(select auth.uid()) = user_id`, never bare `auth.uid()` (Supabase evaluates the bare form once per row, which is slow on big tables).

```sql
alter table public.tasks enable row level security;
create policy "tasks: own select" on public.tasks for select using ((select auth.uid()) = user_id);
create policy "tasks: own insert" on public.tasks for insert with check ((select auth.uid()) = user_id);
create policy "tasks: own update" on public.tasks for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "tasks: own delete" on public.tasks for delete using ((select auth.uid()) = user_id);
```

Only replace an existing policy if it is wrong or slow. Use `drop policy if exists` with the exact existing name before recreating it.

- **Groups**: members can read only their own groups. Use a helper to avoid recursive policies:

```sql
create or replace function public.is_group_member(p_group uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.group_members where group_id = p_group and user_id = auth.uid());
$$;
```

- **Other users' profiles**: group members need names and avatars of each other, not the whole `users` row (that row has plan, email-like fields, timezone). Never open `select` on `users` to other members. Serve member profiles through a function that returns only safe fields:

```sql
create or replace function public.group_member_profiles(p_group uuid)
returns table (id uuid, full_name text, avatar_url text, current_level int, current_title text)
language sql stable security definer set search_path = public as $$
  select u.id, u.full_name, u.avatar_url, u.current_level, u.current_title
  from public.users u
  join public.group_members m on m.user_id = u.id
  where m.group_id = p_group and public.is_group_member(p_group);
$$;
grant execute on function public.group_member_profiles(uuid) to authenticated;
```

(Drop `avatar_url` if that column does not exist.)

- **Joining a group**: only through an RPC `join_group(p_code text)` that looks the code up server side, so the groups table never has to be readable by non-members. Invite codes at least 8 characters from `ABCDEFGHJKMNPQRSTUVWXYZ23456789`. The route calling it uses the 10 per hour limit.
- **Storage**: any bucket with user files is private, with policies on `(storage.foldername(name))[1] = (select auth.uid())::text`.

After the SQL, Sohan runs Supabase **Advisors > Security Advisor** and **Performance Advisor** and fixes everything marked error.

## S9. Billing routes under the guard

The Polar checkout, portal and webhook were rebuilt in 6P. In this pass only:
- Wrap `/api/billing/checkout` and `/api/billing/portal` in `withGuard` with bucket `billing`, 10 per hour per user. Keep their existing responses (`already_pro`, `auth`, friendly errors) exactly.
- The webhook stays outside `withGuard` (Polar is not a logged-in user). Its signature check is done by the `@polar-sh/nextjs` adapter. Exclude its path from the Vercel firewall rate limit rule.
- The webhook writes with the service role, so the S7 trigger lets it through. No browser code may ever write `plan`, `plan_expires_at`, `billing_provider` or `polar_customer_id`; add the last two to the S7 trigger's protected list.

## S10. Security headers

In `next.config.ts`, only when not building the Capacitor export (export mode ignores `headers()`). Merge with the existing CSP, do not replace it.

```ts
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), payment=(), usb=(), microphone=(self)' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' }, // keeps Google sign-in popups working
];

async headers() {
  if (isMobile) return [];
  return [{ source: '/(.*)', headers: [...securityHeaders, { key: 'Content-Security-Policy', value: csp }] }];
}
```

CSP additions: `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`. Remove `'unsafe-eval'` from `script-src` in production if it is there and the build still works. Keep `wss://*.supabase.co` and `https://app.kit.com`.

## S11. Other holes to close

- **XSS**: anywhere `dangerouslySetInnerHTML` is used (note previews, `generateHTML` from TipTap, blog later), sanitize first with `isomorphic-dompurify`. Names, group names and habit names are always rendered as text, never HTML.
- **Kit waitlist spam**: add a hidden honeypot input (`name="website"`, `tabIndex={-1}`, `autoComplete="off"`, visually hidden) and ignore submits where it is filled or where the form was submitted under 2 seconds after render.
- **Error messages**: no route returns raw Supabase, Postgres or OpenRouter error text. `withGuard` already does this; check Server Actions too.
- **Production source maps**: confirm `productionBrowserSourceMaps` is not enabled.
- **Session refresh**: `proxy.ts` (Next 16 name for middleware) refreshes the Supabase session cookie on navigation using the standard `@supabase/ssr` pattern and protects `(app)` routes. If the project still has `middleware.ts`, rename it to `proxy.ts` and rename the export to `proxy`.
- **Account deletion**: deletes through the service role on the server only after `getUser()` confirms the caller, and only that caller's id.

## S12. Pass 6A finish

1. `npm run build` and the mobile export build both pass.
2. Write the SQL files under `supabase/phase6/` (01, 02, 03 if safe, 04 marked LATER, 05).
3. Update `PHASE6_AUDIT.md` with a "Done in 6A" list and an "Needs Sohan" list.
4. **Commit but do not push.** Stop and tell Sohan: "Run the SQL files 01, 02, 03 and 05 in Supabase, then tell me to push." The code depends on `hit_rate_limit` and `consume_ai_message`, so pushing first would break AI chat.

---

# PASS 6B: Speed

## P1. Measure before and after

Record a baseline in `PHASE6_AUDIT.md` under "Performance":
- Lighthouse (Chrome DevTools, Mobile and Desktop, Incognito) on `/`, `/about`, `/help`, `/privacy`, and while logged in on Today, Plan, Focus, Notes, Insights. Note Performance, LCP, CLS, TBT.
- Bundle sizes: `npx next experimental-analyze` (Next 16.1+). If the command does not exist in this version, use `@next/bundle-analyzer` with `ANALYZE=true next build --webpack`. List the 10 largest client modules.

Also note the Real Experience Score per page from Vercel > Speed Insights (live since S0). That is real visitors on real devices, so it is the number that matters most after this pass. Lighthouse is the lab check you can run any time.

Targets: public pages Performance 90+ on mobile, app pages 85+, LCP under 2.5 s, CLS under 0.1, INP under 200 ms, Accessibility 95+, Best Practices 100, SEO 100 on public pages.

## P2. Images

- Every `<img>` becomes `next/image` with real `width`/`height` (or `fill` + `sizes`). Only the hero image on the landing page gets `priority`.
- The export build uses unoptimized images, so pre-convert large assets once so both builds benefit:

```js
// scripts/optimize-images.mjs  (run: node scripts/optimize-images.mjs)
import sharp from 'sharp';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
const dir = 'public/landing';
for (const f of await readdir(dir)) {
  if (!/\.(png|jpe?g)$/i.test(f)) continue;
  const src = path.join(dir, f);
  const base = src.replace(/\.(png|jpe?g)$/i, '');
  await sharp(src).resize({ width: 2400, withoutEnlargement: true }).avif({ quality: 55 }).toFile(`${base}.avif`);
  await sharp(src).resize({ width: 2400, withoutEnlargement: true }).webp({ quality: 78 }).toFile(`${base}.webp`);
}
```

Point the landing hero and `app-preview` at the `.webp` (keep the PNG for the Open Graph image). Logos stay PNG or SVG.
- Avatars: request small sizes (`sizes="32px"`), never a full-size photo for a 32 px circle.

## P3. Fonts

Inter and Instrument Serif through `next/font` only, `display: 'swap'`, only the weights actually used (check the CSS), `subsets: ['latin']`. Remove any Google Fonts `<link>` tags if they still exist. `next/font` self-hosts them and prevents layout jumps.

## P4. Lazy load heavy libraries inside routes

Use `next/dynamic` in client components for anything big that is not needed for the first paint:

```tsx
'use client';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/Skeleton';

const InsightsCharts = dynamic(() => import('./InsightsCharts'), {
  ssr: false,
  loading: () => <Skeleton className="h-64 rounded-2xl" />,
});
```

Lazy load: recharts (Insights, Today charts), the TipTap editor (open note only, the notes list does not need it), the cmdk command palette (load on first ⌘K press or after idle), create and edit modals, the date picker, KitWaitlist on pages where it sits below the fold, any confetti or celebration effect.

Command palette on demand:

```tsx
const [paletteReady, setPaletteReady] = useState(false);
useEffect(() => {
  const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') setPaletteReady(true); };
  window.addEventListener('keydown', onKey);
  const idle = 'requestIdleCallback' in window ? requestIdleCallback(() => setPaletteReady(true)) : setTimeout(() => setPaletteReady(true), 3000);
  return () => { window.removeEventListener('keydown', onKey); typeof idle === 'number' ? clearTimeout(idle) : cancelIdleCallback(idle); };
}, []);
return paletteReady ? <CommandPalette /> : null;
```

## P5. Cache data on the client (SWR) and make it instant

Right now each screen refetches on mount and after `emitDataChanged`. Add `swr` (small, about 4 KB) and route the shared reads through it so moving between screens shows data instantly and refreshes quietly in the background.

```ts
// src/lib/data/useData.ts
'use client';
import useSWR, { useSWRConfig, type SWRConfiguration } from 'swr';
import { useEffect } from 'react';
import { onDataChanged } from '@/lib/events'; // existing helper, adapt import path

const defaults: SWRConfiguration = {
  keepPreviousData: true,
  revalidateOnFocus: true,
  dedupingInterval: 4000,
  errorRetryCount: 2,
};

// Keys look like 'habits:<userId>' or 'tasks:<userId>:2026-10-20'
export function useData<T>(key: string | null, fetcher: () => Promise<T>, opts?: SWRConfiguration<T>) {
  return useSWR<T>(key, fetcher, { ...defaults, ...opts });
}

// Mount once in (app)/layout. Turns existing emitDataChanged('habits') calls into cache refreshes.
export function DataEventsBridge() {
  const { mutate } = useSWRConfig();
  useEffect(() => onDataChanged((topic: string) => {
    mutate((k) => typeof k === 'string' && k.startsWith(`${topic}:`));
  }), [mutate]);
  return null;
}
```

Optimistic updates for the taps people make most: habit check, task complete, reminder toggle, pin a note. The UI changes immediately and rolls back if the save fails.

```ts
const { mutate } = useSWRConfig();
async function toggleHabit(h: Habit, day: string) {
  const key = `habits:${userId}`;
  await mutate<Habit[]>(
    key,
    async (current = []) => {
      await habitService.toggle(h.id, day);           // existing service call
      return current.map((x) => (x.id === h.id ? applyToggle(x, day) : x));
    },
    {
      optimisticData: (current = []) => current.map((x) => (x.id === h.id ? applyToggle(x, day) : x)),
      rollbackOnError: true,
      revalidate: false,
    },
  );
  emitDataChanged('xp'); // keep existing side effects
}
```

Show a toast with Retry if a rollback happens: "Could not save. Check your connection and try again."

Scope: profile, today's tasks, habits, focus stats (`useFocusStats`), reminders, notes list, folders, countdowns, accountability. Do not cache AI chat streams.

## P6. Fetch less data, fix N+1 queries

- Replace every `select('*')` with the columns the screen actually uses.
- Fix N+1 patterns (one query per item in a loop). Typical places: habits then logs per habit, group members then streak per member, folders then note count per folder. Use one query with an embedded select or `.in()`:

```ts
// before: for (const h of habits) await supabase.from('habit_logs').select().eq('habit_id', h.id)
const ids = habits.map((h) => h.id);
const { data: logs } = await supabase
  .from('habit_logs')
  .select('habit_id, date, completed')
  .in('habit_id', ids)
  .gte('date', fromDay);
```

- Run independent queries in parallel with `Promise.all`, not one after another.
- Insights: do the totals in Postgres instead of downloading every session to the browser. File `supabase/phase6/06_insights_rpc.sql` (adapt column names to the real `pomodoro_sessions` schema):

```sql
create or replace function public.focus_daily_totals(p_from date, p_to date, p_tz text default 'Asia/Kolkata')
returns table (day date, minutes int, sessions int)
language sql stable security invoker set search_path = public as $$
  select (s.started_at at time zone p_tz)::date as day,
         coalesce(sum(s.duration_minutes), 0)::int as minutes,
         count(*)::int as sessions
  from public.pomodoro_sessions s
  where s.user_id = (select auth.uid())
    and s.started_at >= (p_from::timestamp at time zone p_tz)
    and s.started_at <  ((p_to + 1)::timestamp at time zone p_tz)
  group by 1
  order by 1;
$$;
grant execute on function public.focus_daily_totals(date, date, text) to authenticated;
```

`security invoker` keeps RLS in force. Keep reading from `pomodoro_sessions` as the source of truth, as agreed in Phase 3.

## P7. Pagination for long lists

| List | Page size | How |
|---|---|---|
| Notes list and folder contents | 30 | Infinite scroll with `IntersectionObserver` on a sentinel, `.range(from, to)` ordered by `updated_at desc` |
| AI chat history | last 30 messages | Load older when scrolling to the top, keep scroll position |
| XP history | 50 | "Show more" button |
| Group standings | top 50 | Plus the current user's own row always |
| Completed tasks | 50 | "Show more" |

Never load a list without a limit.

## P8. Database indexes (SQL, file `supabase/phase6/07_indexes.sql`)

Write indexes for the real table and column names found in the audit. The pattern is "user + the column you sort or filter by". Template:

```sql
create index if not exists tasks_user_day_idx            on public.tasks (user_id, due_date);
create index if not exists habits_user_idx               on public.habits (user_id);
create index if not exists habit_logs_habit_date_idx     on public.habit_logs (habit_id, date);
create index if not exists pomodoro_user_started_idx     on public.pomodoro_sessions (user_id, started_at desc);
create index if not exists notes_user_updated_idx        on public.notes (user_id, updated_at desc);
create index if not exists notes_folder_idx              on public.notes (folder_id);
create index if not exists xp_logs_user_created_idx      on public.xp_logs (user_id, created_at desc);
create index if not exists reminders_user_day_idx        on public.reminders (user_id, day);
create index if not exists group_members_group_idx       on public.group_members (group_id);
create index if not exists group_members_user_idx        on public.group_members (user_id);
create index if not exists ai_messages_conv_created_idx  on public.ai_messages (conversation_id, created_at);
```

Also add an index for every foreign key column the Performance Advisor reports as unindexed. Skip any index that already exists under another name.

## P9. Fewer re-renders

1. Turn on the React Compiler (stable in Next 16), which memoizes components automatically:

```ts
// next.config.ts
reactCompiler: true,
```
```bash
npm install -D babel-plugin-react-compiler@latest
```

If the build breaks or becomes far slower, or a screen behaves differently, add `'use no memo'` at the top of that one component rather than turning the compiler off.

2. **The focus timer must not re-render the page every second.** Store `endsAt` (a timestamp) in state, and let only the tiny display component tick. This also keeps the timer accurate when the tab is in the background.

```tsx
function useNow(ms = 250) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}
function TimerDisplay({ endsAt }: { endsAt: number }) {
  const now = useNow();
  const left = Math.max(0, endsAt - now);
  const mm = String(Math.floor(left / 60000)).padStart(2, '0');
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');
  useEffect(() => { document.title = `${mm}:${ss} · Focus`; }, [mm, ss]);
  return <span className="tabular-nums">{mm}:{ss}</span>;
}
```

Reset `document.title` when the timer stops or the page unmounts.

3. Split big contexts so a change in one does not re-render everything (user/profile, theme, create, focus timer). Context values are objects created once, not on every render.
4. Lists use stable `key`s (ids, never array index).

## P10. Debounce input handlers

```ts
// src/lib/hooks/useDebouncedCallback.ts
'use client';
import { useCallback, useEffect, useRef } from 'react';

export function useDebouncedCallback<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  const fnRef = useRef(fn);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<A | null>(null);
  useEffect(() => { fnRef.current = fn; }, [fn]);

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (pending.current) { const a = pending.current; pending.current = null; fnRef.current(...a); }
  }, []);

  const run = useCallback((...args: A) => {
    pending.current = args;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, ms);
  }, [ms, flush]);

  useEffect(() => flush, [flush]); // save on unmount
  return { run, flush };
}
```

Apply to: search in Help, Notes, command palette (200 ms); note autosave (800 ms, plus `flush` on blur, on route change and on `pagehide`); window resize and `SegmentedControl` measuring (use `ResizeObserver` instead of resize events where possible).

## P11. Public pages stay static

About, Contact, Help, Privacy, Terms, MCP preview, Blog index and 404 must show as `○ (Static)` in the `next build` output. If one shows as dynamic, find what makes it dynamic (usually `cookies()`, `headers()` or a Supabase server call in a shared layout) and move that into the app layout only. Do not enable `cacheComponents` in this phase; it changes caching defaults and needs its own testing.

## P12. Remove unused code and defer the rest

```bash
npx knip --production
```

Remove unused dependencies, files and exports it reports (check each one is truly unused, including in the mobile build). Look for duplicates doing the same job (two date libraries, two icon sets, lodash when only one function is used) and keep one.

Third-party scripts, if any remain, use `next/script` with `strategy="lazyOnload"`. Supabase realtime channels are opened only on screens that show live data and are filtered by `user_id` or `group_id`, never a whole table.

## P13. Pass 6B finish

Build both targets, re-run the Lighthouse set from P1, write before and after numbers in the audit, then commit "desktop: phase 6b - speed". Do not push yet: the Insights code needs SQL 06. Stop and ask Sohan to run SQL 06 and 07 in Supabase, then `git push origin main` when he confirms.

---

# PASS 6C: Smoothness

## U1. Skeletons that match the real layout

Every `(app)` route segment gets a `loading.tsx` that mirrors the real page shape (same card sizes and positions), using the existing `Skeleton`. With SWR `keepPreviousData`, skeletons only appear on the very first visit to a screen. Nothing may jump when real data arrives: reserve height for charts, avatars, images and the podium.

## U2. Undo instead of confirm

Deleting a task, note, reminder or habit removes it from the list immediately and shows a toast "Deleted. Undo" for 5 seconds. The real delete runs when the toast closes. Keep confirm dialogs only for leaving a group and deleting the account.

## U3. Offline and slow network

- A small glass banner at the top when `navigator.onLine` is false: "You are offline. Changes will not save until you are back online."
- Failed saves roll back (P5) and show Retry.
- Note editor keeps an unsaved draft in `localStorage` (wrapped in try/catch) until the save succeeds, and offers to restore it if the page reloads with an unsaved draft.
- Any request over 8 seconds shows a quiet inline "Still working..." state instead of a frozen button.

## U4. Session expiry

If any request returns 401, send the user to sign in with `?next=<current path>` and return them there afterwards. Flush the note autosave before redirecting.

## U5. Glass without the lag

`backdrop-filter` is the most expensive thing on these screens. Low-end laptops will stutter if too many layers blur at once.

- At most 3 blurred layers visible at the same time (sidebar, top bar, one floating panel or modal). Cards inside lists use translucent `var(--surface)` with no blur.
- Blur radius at most 24 px.
- AmbientBackground animates only `transform` and `opacity`, and pauses when the tab is hidden:

```ts
useEffect(() => {
  const onVis = () => document.documentElement.toggleAttribute('data-hidden', document.hidden);
  document.addEventListener('visibilitychange', onVis);
  return () => document.removeEventListener('visibilitychange', onVis);
}, []);
```
```css
[data-hidden] .ambient * { animation-play-state: paused; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; scroll-behavior: auto !important; }
}
@media (prefers-reduced-transparency: reduce) {
  .glass, .glass-strong, .liquid, .frost { -webkit-backdrop-filter: none; backdrop-filter: none; background: var(--surface); }
}
```

- `will-change` only on elements that are animating right now, never permanently.

## U6. Keyboard and focus

- `?` opens a small shortcuts sheet listing the existing shortcuts (⌘K, F for desk mode, N for new, and any others already in the app).
- Modals trap focus, close on Esc and return focus to the button that opened them.
- Every icon-only button has an `aria-label`. Focus rings are visible in both themes.
- Text on glass meets 4.5:1 contrast in both themes. Fix any that fail in Lighthouse.

## U7. Small touches

- The browser tab shows the running timer (P9).
- Navigation keeps scroll position when going back to a list.
- Sidebar links use `next/link` so Next 16 prefetches them; nothing prefetches on mobile app pages that are not needed.
- Every list has loading, empty and error states. Error states have a Retry button.

## U8. Pass 6C finish

Run Lighthouse on the full P1 set again. Every page must hit the targets in P1, or the audit explains why not. Check light and dark, 375 px and 1440 px. Commit "desktop: phase 6c - smoothness" and `git push origin main`.

---

# Things only Sohan can do (dashboards, no code)

| Where | What |
|---|---|
| **Polar (now, for 6P)** | Settings > Developers: create a new Organization Access Token with scopes `checkouts:write`, `customer_sessions:write`, `customers:read`, `products:read`, `orders:read`, `subscriptions:read` and the longest expiry offered. Put it in `.env.local` and in Vercel, then revoke the old token. Also regenerate the webhook secret on the existing webhook endpoint, and make sure the endpoint is subscribed to order paid and refunded, and subscription active, updated, canceled, uncanceled and revoked. |
| **Vercel > Environment Variables (now)** | The "Needs Attention" badges are on secrets created before Vercel's April 2026 security incident that are not marked Sensitive. For each secret still in use (`POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, and the OpenRouter and Supabase service keys if present): delete it and add it again with the **Sensitive** option on, using the new rotated value, then redeploy. Delete all `RAZORPAY_*` variables and any `NEXT_PUBLIC_GEMINI_*` or `NEXT_PUBLIC_OPENROUTER_*` variables. |
| **Razorpay** | The keys in your env are live keys. Deactivate them in the Razorpay dashboard since Razorpay is no longer used. |
| **Google AI Studio** | Delete the Gemini API key that was in `NEXT_PUBLIC_GEMINI_API_KEY`. |
| **Supabase service role key** | If `SUPABASE_SERVICE_ROLE_KEY` is in Vercel without the Sensitive badge, tell Claude before rotating it. Rotating the wrong Supabase key can log everyone out of the phone app, so it needs a careful plan. |
| **Vercel > Account** | Turn on two-factor authentication and look through the activity log for deployments or setting changes you did not make. |
| **Vercel > Analytics** and **Vercel > Speed Insights** | Click Enable on both tabs before 6A is pushed. Ignore the install steps shown there, Antigravity does those. Free limits: Analytics 50,000 events a month (collection pauses if exceeded, no charge), Speed Insights 10,000 events over a rolling 30 days (pauses for at least 14 days if exceeded). If Speed Insights pauses, ask for `sampleRate={0.5}`. |
| **OpenRouter** | Set a credit limit on the production API key (a monthly cap you are comfortable losing in the worst case). Use a separate key for local development. If the audit said CRITICAL, create a new key, put it in Vercel, delete the old one. |
| **Vercel > Firewall** | 1 rate limit rule: path starts with `/api` and does not start with `/api/webhooks`, 60 requests per 60 seconds per IP, action 429. Start it on Log for a day, then switch to 429. |
| **Vercel > Firewall** | 1 custom rule: deny requests whose path contains `/wp-`, `.php`, `/.env` or `/.git` (bots scanning for holes). |
| **Vercel > Firewall** | Remember Attack Challenge Mode exists. Turn it on only if the site is under attack. |
| **Supabase > Auth** | Turn on CAPTCHA (Cloudflare Turnstile) for sign up, sign in and password reset. This needs a small code change (6A follow-up) and Cloudflare added to the Privacy Policy provider table. |
| **Supabase > Auth** | Check rate limits for sign-ups, OTP and password resets. Keep Redirect URLs to your exact domains only. Turn on leaked password protection if your plan has it. |
| **Supabase > Advisors** | Run Security Advisor and Performance Advisor after the SQL. Fix errors. |
| **Supabase > Database > Backups** | Check whether your plan keeps automatic backups. If it does, the Privacy Policy line "no backups" must say deleted data can stay in encrypted backups for up to the backup retention period. |
| **Polar** | Confirm the webhook secret in Polar matches `POLAR_WEBHOOK_SECRET` in Vercel. |
| **GitHub** | Turn on Dependabot alerts and secret scanning for the repo. |

# Verification tests (Sohan or Antigravity runs after 6A is live)

1. Call the AI route with no login: 401.
2. Free account, send 6 AI messages: the 6th gets the friendly quota message.
3. Send 15 AI messages in one minute: 429 after 10.
4. Logged in, browser console: `await supabase.from('users').update({ plan: 'lifetime' }).eq('id', '<your id>')` returns an error and the plan does not change.
5. Logged in as user A, try to read user B's tasks by id: empty result.
6. `curl -X POST https://focalyst.online/api/webhooks/polar -d '{}'`: 403.
7. Check headers at securityheaders.com: grade A or A+.
8. Join a group with 11 wrong codes in an hour: the 11th is refused.
9. Visit a few pages, wait a minute, then open Vercel > Analytics: visits appear, and no address shows a note id, invite code or `?code=` token.
10. All three Pro buttons still open Polar checkout on desktop and phone browsers, and a Pro account's Manage opens the Polar portal.
11. Search the deployed site's JavaScript for `sk-or-`: in Chrome DevTools, Sources tab, Cmd + Option + F, search `sk-or-`. No results.
