# Focalyst: finish Phase 5 + urgent fixes

Read this file once, fully. Do the steps in order. Priority order if anything has to be cut short: H0 (save the work), H1 (payments), H2 (New note), H3 (New folder button), then the rest of Phase 5.

Global rules:
- Mobile web below 1024px must look exactly as it does now, except where H1 fixes a broken payment button.
- If this codebase also builds the native iOS and Android app (Capacitor export build), that build must keep working and must never show Polar. Native apps sell Pro through Apple and Google in-app purchase only.
- No database schema changes. No SQL.
- Tokens only for styling, `snow` not `white`. No em dashes or exclamation marks in user-facing copy.
- Never re-open a file range you have already viewed.
- Deploy only with `git push origin main`. Never push a failing build.

---

## H0. Save the unfinished Phase 5 work first

The previous chat edited about 47 files for Phase 5 and stopped ("Failed to fetch") before building, committing or pushing. Nothing is deployed yet. Do not lose that work.

```bash
git status -sb
git log -3 --oneline
git stash list
```

1. If there are uncommitted changes, make sure no secret file is staged (`.env`, `.env.local`, `.env.production`, any `*.pem` or key file must not appear in `git status` as new). Then save a local checkpoint:

```bash
git add -A
git status            # read the list once; unstage any secret file with: git restore --staged <file>
git commit -m "wip: phase 5 checkpoint (not deployed)"
```

Do **not** push this checkpoint.

2. Run `npm run build` and fix every error.
3. Check which Phase 5 items in `PHASE5_CONTENT.md` section A (A0 to A11) are already done by checking whether the files and routes exist (do not re-read whole files). List each item as done or missing in your final message. Finish the missing ones after H1 to H3.

---

## H1. Payment buttons do nothing (highest priority)

**What is happening:** on the website and web app (desktop and phone browsers), the Pro Monthly, Pro Annual and Lifetime buttons are visible but clicking them does nothing. Before the desktop redesign they opened Polar checkout. The Polar checkout links or checkout code are still in this codebase or its git history.

**What must be true after the fix:**
- On the web (any browser, desktop or phone), every Pro button opens the correct Polar checkout for the correct plan and price.
- In the native iOS and Android app, Polar never appears. The existing Apple and Google purchase flow stays exactly as it is.
- Pro users see a working "Manage" button (the existing Polar customer portal or billing flow).

### Step 1. Find the original Polar integration

```bash
grep -rn -i "polar" src/ --include=*.ts --include=*.tsx | grep -v node_modules
grep -rn -i "polar" .env.example .env.local.example 2>/dev/null
git log --oneline -S "polar.sh" --all | head -20
git log --oneline -S "POLAR" --all | head -20
git log --oneline -S "checkout" --all -- src | head -20
```

Identify and write down (no secret values, names only):
- How checkout starts: static checkout links (`https://buy.polar.sh/...` or `https://polar.sh/.../checkout/...`), a server route that creates a checkout (for example `/api/checkout` or `@polar-sh/nextjs`), or product IDs.
- Every environment variable involved (for example `NEXT_PUBLIC_POLAR_MONTHLY_URL`, `POLAR_ACCESS_TOKEN`, `POLAR_PRODUCT_*`).
- How India pricing (₹99, ₹999, ₹2,999) is handled: separate links or products per region, or one product with multiple prices. Keep whatever existed.
- How the user is attached to the checkout (prefilled email, customer external id, metadata) so the webhook can grant Pro. Keep it exactly as it was. Do not invent new parameters.

### Step 2. Compare with the last working version

Find the last commit before the desktop redesign started, then diff the paywall or pricing component and every Upgrade button against it:

```bash
git log --oneline -- <path of Paywall / pricing / upgrade component> | head -15
git show <last-working-commit>:<path> > /tmp/old_paywall.tsx
git diff <last-working-commit> HEAD -- <path>
```

Look for the click handler or `href` that used to open checkout and is now missing, renamed, empty (`onClick={() => {}}`, `href="#"`) or pointing at an undefined variable.

### Step 3. Check these causes in order (several can be true at once)

1. **Lost handler:** the redesigned button has no `href` or `onClick`, or calls a function that no longer exists.
2. **Undefined link:** a `NEXT_PUBLIC_` variable the code reads is missing or was renamed. These are baked in at build time, so a missing one becomes `undefined` in production. List every variable name the payment code reads so Sohan can confirm each one exists in Vercel > Settings > Environment Variables for **Production**.
3. **Something sits on top of the button:** a decorative glass or ambient layer (`::before`/`::after` on `.liquid` or `.glass`, AmbientBackground, a full-size overlay) catches the click. Test in the browser console with the button visible:
   ```js
   const b = [...document.querySelectorAll('button, a')].find(x => /upgrade|monthly|annual|lifetime|get pro/i.test(x.textContent));
   const r = b.getBoundingClientRect();
   document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
   ```
   If the result is not the button or its child, that layer needs `pointer-events: none` (decorative layers) or a lower `z-index`. Apply `pointer-events: none` to every purely decorative pseudo-element and background layer in the glass utilities and AmbientBackground. Check the same for the New note button (H2).
4. **Popup blocked:** `window.open(url)` called after an `await` is blocked by Safari and often Chrome. Checkout must use `window.location.assign(url)` in the same tab.
5. **Wrong native check:** code that hides or blocks Polar "on mobile" must use `Capacitor.isNativePlatform()` (false in every browser), never screen width, user agent or a `useIsMobile()` width hook. A phone browser is web, and must get Polar.
6. **Security policy (CSP) blocking it:** open DevTools console and click the button. If you see "Refused to frame", "Refused to connect" or "Refused to send form data", add the Polar domain to the matching directive: embedded checkout needs `frame-src https://*.polar.sh https://polar.sh` (and `script-src` for its embed script), a browser `fetch` to Polar needs `connect-src`, a form post needs `form-action`. A normal link to Polar needs nothing.
7. **Server route failing:** if checkout is created by a server route, call it while logged in and read the response. Check that `proxy.ts` / `middleware.ts` does not redirect or block it, that it runs on the Node runtime, and that the Polar token and server (production, not sandbox) are correct. Return a clear JSON error instead of a silent failure.
8. **Click swallowed:** a parent `Link` or card handler calling `preventDefault()` / `stopPropagation()`, or the button being `disabled` because a `loading` or `isPro` state never resolves.

### Step 4. One function for every Pro button

Every Pro and Upgrade button in the app goes through one function, so this cannot break in one place again. Keep the original mechanism (static links or server route) inside it.

```ts
// src/lib/billing/checkout.ts
'use client';

export type PlanKey = 'monthly' | 'annual' | 'lifetime';

export function isNativeApp(): boolean {
  try {
    // Capacitor is only defined inside the native app shell
    return Boolean((window as any).Capacitor?.isNativePlatform?.());
  } catch {
    return false;
  }
}

// Fill this from what Step 1 found. Example for static links:
function getCheckoutUrl(plan: PlanKey, region: 'IN' | 'INTL'): string | undefined {
  const links: Record<string, string | undefined> = {
    'monthly:INTL': process.env.NEXT_PUBLIC_POLAR_MONTHLY_URL,
    'annual:INTL': process.env.NEXT_PUBLIC_POLAR_ANNUAL_URL,
    'lifetime:INTL': process.env.NEXT_PUBLIC_POLAR_LIFETIME_URL,
    // add IN variants only if the original code had them
  };
  return links[`${plan}:${region}`] ?? links[`${plan}:INTL`];
}

export async function startCheckout(
  plan: PlanKey,
  opts: { email?: string | null; userId?: string; region?: 'IN' | 'INTL' },
): Promise<{ ok: boolean; error?: string }> {
  if (isNativeApp()) return { ok: false, error: 'native' }; // native uses the existing in-app purchase flow

  let url = getCheckoutUrl(plan, opts.region ?? 'INTL');
  // If the original code used a server route instead, replace the two lines above with:
  // const r = await fetch(`/api/checkout?plan=${plan}`, { credentials: 'include' });
  // url = r.ok ? (await r.json()).url : undefined;

  if (!url) {
    console.error('[checkout] no checkout url for plan', plan);
    return { ok: false, error: 'Checkout is unavailable right now. Please try again, or email contactfocalyst@gmail.com.' };
  }

  // Keep the exact customer prefill the original code used (for example customer_email), nothing new.
  window.location.assign(url);
  return { ok: true };
}
```

Button behaviour:
- On click: set a `pending` state, label becomes "Opening checkout", button disabled so a double click cannot open two checkouts.
- If `startCheckout` returns an error: reset the button and show the error in a toast.
- In the native app the web Pro buttons are replaced by the existing native purchase buttons, as before the redesign.

Route every one of these through `startCheckout`: the Paywall modal, Settings > Pro tab "Upgrade", pricing on the landing page, the sidebar or Today upgrade prompt, the AI quota message, Help "See Pro plans", MCP "See Pro plans", and any other "Get Pro" or "Upgrade" button. Search for them:

```bash
grep -rn -i -E "upgrade|get pro|go pro|paywall|lifetime" src/ --include=*.tsx | grep -v node_modules
```

### Step 5. Test before pushing

Run `npm run dev` and test while logged in as a Free user:

| Where | Monthly | Annual | Lifetime |
|---|---|---|---|
| Desktop Chrome, Paywall | opens Polar | opens Polar | opens Polar |
| Desktop Chrome, Settings > Pro | | | |
| Desktop Safari, Paywall | | | |
| Phone width (375px) in Chrome DevTools, Paywall | | | |
| Landing page pricing | | | |

Each must land on the Polar checkout page showing the right plan and price. Do not complete a payment. Also confirm a Pro account sees "Manage" and it opens the Polar portal. Put this table, filled in, in your final message.

---

## H2. New note button does nothing

**What is happening:** on desktop Notes, the blue "New note" button at the top of the left panel does not open a new note. The notes list already contains blank "Untitled / No content" notes, so the click may be creating a note in the database without opening it.

**What must happen on click:**
1. Create one empty note using the **existing** create-note service that mobile web already uses (same function, same columns). Do not write a new insert.
2. If a folder is open, create it inside that folder.
3. Select the new note, open it in the editor and put the cursor in the title.
4. Call `emitDataChanged('notes')` so the list and counts update.
5. Disable the button while creating, so fast double clicks do not create two notes.
6. On failure show a toast: "Could not create a note. Please try again." and log the real error to the console.

Debug in this order: console errors on click, the `elementFromPoint` test from H1 Step 3.3, the button's `onClick`, then the create call's response (missing column, RLS error, missing `user_id`).

Also make sure these open the same flow: the `N` shortcut, ⌘K "New note", and the Create menu's Note option.

Empty notes: when the user leaves a note that is still completely empty (no title, no content) **and** was created in this session, delete it, so stray "Untitled" notes stop piling up. Never delete any other note.

---

## H3. New folder button looks broken

**What is wrong (from the screenshot):** in Notes > Folders, the toolbar has a tall search field, a short Sort pill and a short blue "New folder" pill whose label wraps onto two lines with a tiny plus. The three controls have different heights and shapes.

**Fix:** one toolbar row, all three controls the same height (40px) and the same corner radius, label on one line.

```tsx
<div className="flex items-center gap-3">
  <label className="relative flex-1 min-w-0">
    <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--ink-3)]" aria-hidden />
    <input
      type="search"
      placeholder="Search folders"
      className="h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)] pl-10 pr-3 text-sm text-[var(--ink)] placeholder:text-[var(--ink-3)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
    />
  </label>

  <button
    type="button"
    className="inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3.5 text-sm font-medium text-[var(--ink)] hover:bg-[var(--surface-3)]"
  >
    <ArrowUpDown className="size-4" aria-hidden />
    Sort
  </button>

  <button
    type="button"
    onClick={openNewFolder}
    aria-label="New folder"
    className="inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-[var(--primary)] px-4 text-sm font-medium text-snow shadow-sm hover:brightness-110 active:scale-[0.98] transition"
  >
    <Plus className="size-4" strokeWidth={2.25} aria-hidden />
    <span className="hidden xl:inline">New folder</span>
  </button>
</div>
```

- Use the existing theme token names in this project if they differ from the ones above.
- Below 1280px the blue button shows only the plus icon (it keeps its `aria-label` and gets the existing tooltip "New folder"), so it never wraps.
- Match the corner radius and blue of the "New note" button in the left panel so the two primary buttons look like a pair.
- Clicking it must open the existing create-folder flow and the new folder appears immediately.
- Check both light and dark.

---

## H4. Finish Phase 5, then ship

1. Finish every Phase 5 item that H0 listed as missing, using `PHASE5_CONTENT.md` exactly as written.
2. `npm run build` passes. If this repo has the Capacitor export build, that passes too.
3. Commit:
   ```bash
   git add -A
   git status   # no secret files
   git commit -m "fix: payments, new note, new folder; finish phase 5"
   git push origin main
   ```
4. Final message, short:
   - Phase 5 items: done or missing.
   - What broke the payment buttons (the actual cause).
   - The names of every environment variable the payment code needs (no values), so Sohan can check them in Vercel.
   - The filled H1 test table.
   - Changed files.
