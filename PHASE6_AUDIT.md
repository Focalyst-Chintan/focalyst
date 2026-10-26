# PHASE 6 AUDIT REPORT

**CRITICAL FINDINGS DETECTED**
- **CRITICAL**: `NEXT_PUBLIC_OPENROUTER_API_KEY` exposed in client-facing configuration/env.
- **CRITICAL**: `EXPO_PUBLIC_OPENROUTER_API_KEY` and `EXPO_PUBLIC_GEMINI_API_KEY` bundled directly into mobile client application (`Focalyst/src/services/openRouterService.ts`), allowing client to query paid AI services directly.
- **CRITICAL**: Git history check matched `polar_oat_` (commits e611032, e34e9e6) and `service_role` (commits 5b8b496, 9e44c73, a1cc0e9, 368c006, 6a315ff).

---

## S3 Known Findings from `.env.local`

1. **`NEXT_PUBLIC_OPENROUTER_API_KEY` exists**: Any variable starting with `NEXT_PUBLIC_` is included in public browser JS bundles. This exposes OpenRouter credits to arbitrary web visitors.
2. **`EXPO_PUBLIC_OPENROUTER_API_KEY` exists**: Built directly into the mobile application (`Focalyst/src/services/openRouterService.ts`), which queries OpenRouter directly from the device.
3. **`NEXT_PUBLIC_GEMINI_API_KEY` & `EXPO_PUBLIC_GEMINI_API_KEY` exist**: Legacy Gemini keys remain in `.env.local` and mobile codebase even though primary provider is OpenRouter.
4. **`RAZORPAY_*` (5 variables) exist**: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_PLAN_ID_MONTHLY`, `RAZORPAY_PLAN_ID_YEARLY`, `RAZORPAY_WEBHOOK_SECRET` are legacy payment variables that are no longer used since the Polar migration.
5. **Key rotation needed**: Once removed from public code and client envs, Sohan must rotate the OpenRouter keys in the OpenRouter dashboard.
6. **Supabase anon key**: Note that `NEXT_PUBLIC_SUPABASE_ANON_KEY` being public is normal and expected for Supabase clients; authorization is enforced via Supabase Row Level Security (RLS).

---

## Secret History Check

| Query | Matches | Commit IDs | Finding / Status |
|---|---|---|---|
| `git log --all --oneline -- .env .env.local .env.production` | 0 | None | Clean: No `.env` files tracked in git history |
| `git log --all --oneline -S "sk-or-v1-"` | 0 | None | Clean: No raw OpenRouter secret keys found in commit diffs |
| `git log --all --oneline -S "rzp_live_"` | 0 | None | Clean: No live Razorpay keys found in commit diffs |
| `git log --all --oneline -S "polar_oat_"` | 2 | `e611032`, `e34e9e6` | **CRITICAL**: Matched commits (contains comment mentioning token prefix). Marked CRITICAL per spec. |
| `git log --all --oneline -S "service_role"` | 5 | `5b8b496`, `9e44c73`, `a1cc0e9`, `368c006`, `6a315ff` | **CRITICAL**: Matched commits (SQL migration grants to role `service_role`). Marked CRITICAL per spec. |

---

## Table 1: Every Server Entry Point

| Path | What it does | Calls paid service | Checks user (yes/no, how) | Rate limited (yes/no) | Validates input (yes/no) |
|---|---|---|---|---|---|
| `src/app/api/chat/route.ts` | Legacy chat completion endpoint | None (stub/legacy) | No | No | No |
| `src/app/api/checkout/polar/route.ts` | Polar checkout session creation | Polar | No | No | No |
| `src/app/api/checkout/create/route.ts` | Legacy checkout wrapper endpoint | None | No | No | No |
| `src/app/api/generate-weekly-report/route.ts` | Report trigger endpoint | None | No | No | No |
| `src/app/api/notes/generate-pdf/route.ts` | HTML to PDF rendering via Puppeteer | None | Yes (`supabase.auth.getUser()`) | No | Yes (`noteId`, `title`, `content`) |
| `src/app/api/ai/voice-summary/route.ts` | Voice transcription & note creation | Whisper (Groq) | Yes (`requireUser()`) | No | Yes (multipart file validation) |
| `src/app/api/ai/weekly-report/route.ts` | Catalyst weekly AI insights report | None | Yes (`requireUser()`) | No | Yes (`dateRange` validation) |
| `src/app/api/ai/chat/route.ts` | Streaming AI coaching chat endpoint | None (calls provider) | Yes (`requireUser()`) | No (daily quota only) | Yes (`zod` schema) |
| `src/app/api/ai/route.ts` | General AI action execution & tool dispatch | Gemini | Yes (`supabase.auth.getUser()`) | Yes (`rateLimit` in-memory) | Yes (action & params check) |
| `src/app/api/ai/transcribe/route.ts` | Audio transcription endpoint | OpenRouter, Whisper, Gemini | Yes (`requireUser()`) | No | Yes (file format & size check) |
| `src/app/api/ai/summarize-voice/route.ts` | Voice note summary generation | None | No | No | No |
| `src/app/api/account/delete/route.ts` | Account and personal data wipe | None | Yes (`supabase.auth.getUser()`) | No | Yes (`confirmation` text check) |
| `src/app/api/webhooks/polar/route.ts` | Polar subscription & order webhook handler | Polar | No (validates webhook secret) | No | No |
| `src/app/api/webhooks/razorpay/route.ts` | Legacy Razorpay webhook handler | Razorpay | No (validates HMAC signature) | No | Yes (payload parsing) |
| `src/app/api/billing/portal/route.ts` | Polar customer billing portal session | Polar | Yes (`requireUser()`) | No | Yes |
| `src/app/api/billing/checkout/route.ts` | Polar checkout session generation | Polar | Yes (`requireUser()`) | No | Yes (`zod` plan enum) |
| `src/app/api/billing/region/route.ts` | Country code detection from headers | None | No | No | No |
| `src/app/api/billing/sync-me/route.ts` | Re-syncs user profile billing plan | None | Yes (`requireUser()`) | No | Yes |
| `src/app/api/cron/generate-weekly-report/route.ts` | Scheduled automated weekly report cron | OpenRouter, Gemini | Yes (`Bearer CRON_SECRET`) | No | Yes |
| `src/actions/waitlist.ts` (Server Action) | Submits email to product waitlist | None | Yes (`supabase.auth.getUser()`) | No | No |
| `supabase/functions/check-unfinished-tasks` (Edge Fn) | Push notification for stale tasks | None | Internal cron secret | No | Yes |
| `supabase/functions/daily-habit-reminder` (Edge Fn) | Evening habit reminder notification | None | Internal cron secret | No | Yes |
| `supabase/functions/gemini-chat` (Edge Fn) | Edge-hosted Gemini chat endpoint | Gemini | Bearer JWT / Anon key | No | Yes |

---

## Table 2: Every Environment Variable

| Name | Where read | Starts with `NEXT_PUBLIC_` | Flag / Secret Status |
|---|---|---|---|
| `CRON_SECRET` | `src/app/api/cron/generate-weekly-report/route.ts` | No | Server Secret (Safe) |
| `EXPORT_MOBILE` | `next.config.ts` | No | Build Flag (Safe) |
| `EXPO_PUBLIC_GEMINI_API_KEY` | `Focalyst/src/services/openRouterService.ts` | Yes (`EXPO_PUBLIC_`) | **CRITICAL: Secret bundled into mobile app** |
| `EXPO_PUBLIC_OPENROUTER_API_KEY` | `Focalyst/src/services/openRouterService.ts` | Yes (`EXPO_PUBLIC_`) | **CRITICAL: Secret bundled into mobile app** |
| `EXPO_PUBLIC_STATUS_GIST_URL` | `Focalyst/src/services/outageResilienceService.ts` | Yes (`EXPO_PUBLIC_`) | Public URL (Safe) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `Focalyst/src/utils/supabase.ts` | Yes (`EXPO_PUBLIC_`) | Public Publishable Key (Normal) |
| `EXPO_PUBLIC_SUPABASE_URL` | `Focalyst/src/utils/supabase.ts` | Yes (`EXPO_PUBLIC_`) | Public URL (Normal) |
| `GEMINI_API_KEY` | `src/app/api/ai/route.ts`, `src/lib/ai/providers.ts` | No | Server Secret (Safe on server) |
| `GEMINI_MODEL` | `src/app/api/ai/transcribe/route.ts` | No | Server Config (Safe) |
| `NEXT_PUBLIC_APP_URL` | `next.config.ts` | Yes | Public URL (Safe) |
| `NEXT_PUBLIC_BUILD_TARGET` | `src/app/layout.tsx` | Yes | Public Build Flag (Safe) |
| `NEXT_PUBLIC_GEMINI_API_KEY` | `.env.local` | Yes | **CRITICAL: Secret prefixed with NEXT_PUBLIC_** |
| `NEXT_PUBLIC_OPENROUTER_API_KEY` | `scripts/check-speech.mjs`, `.env.local` | Yes | **CRITICAL: Secret prefixed with NEXT_PUBLIC_** |
| `NEXT_PUBLIC_REVENUECAT_IOS_API_KEY` | `src/hooks/useCheckout.ts` | Yes | Client Public SDK Key (Normal) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `src/lib/supabase.ts`, `src/lib/server/auth.ts`, `src/middleware.ts` | Yes | Public Publishable Key (Normal) |
| `NEXT_PUBLIC_SUPABASE_URL` | `src/lib/supabase.ts`, `src/lib/server/auth.ts`, `src/middleware.ts` | Yes | Public URL (Normal) |
| `NODE_ENV` | Next.js runtime, `src/lib/server/auth.ts` | No | Standard Node Environment |
| `OPENROUTER_API_KEY` | `src/lib/ai/providers.ts`, `src/app/api/ai/transcribe/route.ts` | No | Server Secret (Safe on server) |
| `POLAR_ACCESS_TOKEN` | `src/lib/billing/polar.ts`, `scripts/check-polar.mjs` | No | Server Secret (Safe) |
| `POLAR_PRODUCT_ID_LIFETIME` | `src/lib/billing/plans.ts`, `scripts/check-polar.mjs` | No | Server Config (Safe) |
| `POLAR_PRODUCT_ID_MONTHLY` | `src/lib/billing/plans.ts`, `scripts/check-polar.mjs` | No | Server Config (Safe) |
| `POLAR_PRODUCT_ID_YEARLY` | `src/lib/billing/plans.ts`, `scripts/check-polar.mjs` | No | Server Config (Safe) |
| `POLAR_SERVER` | `src/lib/billing/polar.ts`, `scripts/check-polar.mjs` | No | Server Config (Safe) |
| `POLAR_SUCCESS_URL` | `src/app/api/checkout/polar/route.ts` | No | Server Config (Safe) |
| `POLAR_WEBHOOK_SECRET` | `src/app/api/webhooks/polar/route.ts` | No | Server Secret (Safe) |
| `RAZORPAY_KEY_ID` | `.env.local` | No | Legacy Secret (To be removed) |
| `RAZORPAY_KEY_SECRET` | `.env.local` | No | Legacy Secret (To be removed) |
| `RAZORPAY_PLAN_ID_MONTHLY` | `src/app/api/webhooks/razorpay/route.ts` | No | Legacy Secret (To be removed) |
| `RAZORPAY_PLAN_ID_YEARLY` | `src/app/api/webhooks/razorpay/route.ts` | No | Legacy Secret (To be removed) |
| `RAZORPAY_WEBHOOK_SECRET` | `src/app/api/webhooks/razorpay/route.ts` | No | Legacy Secret (To be removed) |
| `SPEECH_MODEL` | `src/app/api/ai/transcribe/route.ts` | No | Server Config (Safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | `src/lib/supabase-admin.ts`, `scripts/backfill-revenuecat.mjs` | No | Server Secret (Must stay strictly server-only) |
| `VERCEL_OIDC_TOKEN` | Vercel runtime | No | Vercel System Token |

---

## Table 3: Database Tables & Storage Buckets Touched

| Table | Who writes it | RLS policies assumed in code |
|---|---|---|
| `users` | Web client, Mobile client, Server, Webhooks | Assumed `auth.uid() = id` (Vulnerability: client can update `plan` & `total_xp`) |
| `profiles` | Web client, Mobile client, Server | Assumed `auth.uid() = id` |
| `tasks` | Web client, Mobile client | `auth.uid() = user_id` for SELECT, INSERT, UPDATE, DELETE |
| `habits` | Web client, Mobile client | `auth.uid() = user_id` for SELECT, INSERT, UPDATE, DELETE |
| `habit_logs` | Web client, Mobile client | `auth.uid() = user_id` for SELECT, INSERT, UPDATE, DELETE |
| `habit_groups` | Web client, Mobile client | Group creator or member policy |
| `habit_group_members` | Web client, Mobile client | Member matching user policy |
| `pomodoro_sessions` | Web client, Mobile client | `auth.uid() = user_id` for SELECT, INSERT, UPDATE |
| `notes` | Web client, Mobile client, Server | `auth.uid() = user_id` for SELECT, INSERT, UPDATE, DELETE |
| `countdowns` | Web client, Mobile client | `auth.uid() = user_id` for SELECT, INSERT, UPDATE, DELETE |
| `reminders` | Web client, Mobile client | `auth.uid() = user_id` for SELECT, INSERT, UPDATE, DELETE |
| `reports` | Server | User read-only or server role |
| `weekly_reports` | Server, Web client | `auth.uid() = user_id` |
| `ai_chat_logs` | Web client, Mobile client, Server | `auth.uid() = user_id` for SELECT, INSERT |
| `xp_logs` | Web client, Mobile client | `auth.uid() = user_id` for INSERT |
| `subscriptions` | Webhooks, Server | User view own subscription |
| `daily_focus_activity` | Web client, Mobile client | `auth.uid() = user_id` |
| `waitlist` | Web client (Server Action) | Insert allowed for anonymous/authenticated |

### Storage Buckets & Voice Audio
- **Supabase Storage Buckets**: None configured or used in active code.
- **Voice Audio**: Voice audio is **never** uploaded or saved to any persistent storage bucket. Audio recordings are transmitted as in-memory buffers/FormData directly to Whisper/Groq API routes and immediately discarded upon transcription.

---

## Table 4: Privileged Writes from the Client

| Target Field / Table | File & Location | Issue / Risk |
|---|---|---|
| `users.plan` | `Focalyst/app/paywall.tsx:160` | Mobile client directly updates `users.plan` in database on store purchase completion |
| `users.plan` | `src/components/Paywall.tsx:79` | Web client directly updates `users.plan = 'free'` upon onboarding skip |
| `users.plan_expires_at` | `Focalyst/app/paywall.tsx:160` | Mobile client computes and directly writes expiry timestamp |
| `users.total_xp` | `Focalyst/src/utils/xpService.ts:60` | Mobile client recalculates and updates `total_xp` directly |
| `users.current_level` | `Focalyst/src/utils/xpService.ts:60` | Mobile client directly updates user level |
| `users.current_title` | `Focalyst/src/utils/xpService.ts:60` | Mobile client directly updates user title |
| `xp_logs` | `Focalyst/src/utils/xpService.ts:45`, `src/lib/xp/award.ts:25` | Client directly inserts `xp_logs` rows without server validation |
| `ai_chat_logs` (AI counter) | `Focalyst/components/AskFocalystModal.tsx:276` | Mobile client writes message logs directly to `ai_chat_logs` |

---

## Table 5: Where Free Limits are Enforced

| Feature Limit | Enforcement Point | Client Only or Server |
|---|---|---|
| **AI 5 messages / day** | `src/app/api/ai/chat/route.ts` & `src/app/api/ai/route.ts` | **Both**: Web server queries `ai_chat_logs` and blocks >5 messages; client UI disables send button. On mobile, `AskFocalystModal.tsx` checks locally before calling OpenRouter. |
| **Habits (Free: 2)** | `src/context/PlanContext.tsx:404` & `src/app/api/ai/route.ts:292` | **Client Only** (except when created via `/api/ai` tool call; direct Supabase INSERT has no DB check). |
| **Notes (Free: 5)** | `src/app/(app)/notes/new/page.tsx:71`, `src/hooks/useNotes.ts:128`, `src/app/api/ai/voice-summary/route.ts:98` | **Client & Server**: Client gates creation; voice-summary route validates on server. Direct Supabase INSERT has no DB check. |
| **Voice Notes** | `src/app/api/ai/voice-summary/route.ts:98` | **Server**: Checks note limit on server during voice processing. |
| **Countdowns (Free: 1, Pro: 3)** | `src/components/focus/CountdownForm.tsx:84`, `src/components/focus/CountdownSection.tsx:144` | **Client Only**: Direct Supabase INSERT has no DB check. |
| **Custom Timers / Presets** | `src/components/focus/PomodoroSection.tsx:149` | **Client Only**: Web UI restricts presets > 4 and custom timer duration to Pro users. |

---

## Table 6: How the Mobile App Reaches the Server

| Destination | Mechanism | Origin Header Sent |
|---|---|---|
| `https://focalyst.online/api/...` | Mobile app calls `https://focalyst.online/api/billing/sync-me` via `fetch()` | Sends `Authorization: Bearer <jwt>`, no browser Origin header (or `capacitor://localhost` in Capacitor webview). |
| Supabase Database & Auth | Mobile uses `@supabase/supabase-js` client connecting to `https://<id>.supabase.co` | Standard Supabase headers (`apikey`, `Authorization`). |
| Supabase Edge Functions | Mobile calls `check-unfinished-tasks`, `daily-habit-reminder`, `gemini-chat` | Functions handle CORS with `*`. |
| OpenRouter / AI Providers | **Direct from mobile**: `Focalyst/src/services/openRouterService.ts` calls `https://openrouter.ai/api/v1/chat/completions` directly using `EXPO_PUBLIC_OPENROUTER_API_KEY` | Custom header `'HTTP-Referer': 'https://focalyst.online'`. **No backend proxy**. |

---

## Table 7: Dependency Versions & Vulnerability Audit

| Package | Pre-patch Version | S2 Installed Version | Target in S2 |
|---|---|---|---|
| `next` | `16.1.6` | `^16.4.3` | `^16` |
| `react` | `19.2.3` | `^19.3.1` | `^19.2` |
| `react-dom` | `19.2.3` | `^19.3.1` | `^19.2` |
| `@supabase/ssr` | `^0.9.0` | `^0.12.7` | `@latest` |
| `@supabase/supabase-js` | `^2.98.0` | `^2.118.0` | `@latest` |

### `npm audit --omit=dev` Initial State
- **Total Vulnerabilities**: 62 (4 Critical, 22 High, 31 Moderate, 5 Low)

### Post-S2 Patch & `npm audit fix` Results
- **Remaining Vulnerabilities**: 38 (0 Critical, 10 High, 28 Moderate, 0 Low)
- **All Critical Vulnerabilities Eliminated** (Next.js RCE/SSRF, node-tar, undici fixed).
- **Remaining High Vulnerabilities**:
  - `@tiptap/core` (<=3.30.4): ReDoS & prototype pollution in DOM attributes. Unfixable via safe `npm audit fix` due to peer dependency conflict with `@tiptap/pm@3.32.0` / `@tiptap/extension-floating-menu`.
  - Transitive dependencies in `puppeteer-core` (`basic-ftp`, `extract-zip`, and `zod` in `chromium-bidi`): Require major breaking upgrade to `puppeteer-core@25.16.0` (which requires `--force`).

---

## Table 8: `dangerouslySetInnerHTML` & Content Rendering

| File | Line | Usage | Risk / Sanitization |
|---|---|---|---|
| `src/components/notes/NoteEditor.tsx` | 420 | `<div dangerouslySetInnerHTML={{ __html: content \|\| '' }} />` | **HIGH RISK**: Direct rendering of note HTML without DOMPurify sanitization. Potential stored XSS. |
| `src/app/help/page.tsx` | 60 | `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />` | Low: Static structured FAQ schema. |
| `Focalyst/app/+html.tsx` | 23 | `<style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />` | Low: Static CSS style string in mobile layout. |
| `src/components/chat/AIChatOverlay.tsx` | 10 | `<ReactMarkdown>` | Safe: Parsed via ReactMarkdown AST. |
| `src/components/chat/ChatUI.tsx` | 9 | `<ReactMarkdown>` | Safe: Parsed via ReactMarkdown AST. |
| `src/components/desktop/AIDrawer.tsx` | 5 | `<ReactMarkdown>` | Safe: Parsed via ReactMarkdown AST. |
| `src/app/(app)/account/page.tsx` | 8 | `<ReactMarkdown>` | Safe: Parsed via ReactMarkdown AST. |

---

## Needs Sohan List

1. **Rotate OpenRouter API Keys**:
   - The key in `NEXT_PUBLIC_OPENROUTER_API_KEY` was exposed to client browsers.
   - The key in `EXPO_PUBLIC_OPENROUTER_API_KEY` was shipped inside the mobile build.
   - Once server routing is implemented, generate new OpenRouter keys and revoke old keys.
2. **Remove Unused Razorpay Environment Variables in Vercel**:
   - Remove `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_PLAN_ID_MONTHLY`, `RAZORPAY_PLAN_ID_YEARLY`, and `RAZORPAY_WEBHOOK_SECRET` from Vercel Project Settings.
3. **Remove Unused Gemini Environment Variables**:
   - Remove `NEXT_PUBLIC_GEMINI_API_KEY` and `EXPO_PUBLIC_GEMINI_API_KEY` from Vercel and local `.env` files.
4. **Polar Token Audit**:
   - Check Polar Dashboard to ensure the active Organization Access Token has not been compromised (git commits referenced `polar_oat_` naming convention).
5. **Database RLS Hardening (Pass 6A S8)**:
   - Prepare and execute migration in Supabase SQL editor to revoke direct client updates to `users.plan`, `users.plan_expires_at`, and `users.total_xp`.
