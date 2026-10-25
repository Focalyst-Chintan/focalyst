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

export type ReturnPath = '/paywall' | '/pricing' | '/onboarding/plans';

export async function startCheckout(
  plan: PlanKey,
  options?: { returnPath?: ReturnPath }
): Promise<CheckoutResult> {
  if (isNativeApp()) return { ok: false, code: 'native' };
  const r = await post('/api/billing/checkout', {
    plan,
    returnPath: options?.returnPath,
  });
  if (!r) return { ok: false, code: 'network', message: 'Could not reach Focalyst. Check your connection and try again.' };
  if (r.res.status === 401) {
    const nextPath = options?.returnPath ?? '/paywall';
    window.location.assign(`/login?next=${encodeURIComponent(nextPath)}`);
    return { ok: false, code: 'auth' };
  }
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
  if (r.res.status === 401) { window.location.assign(`/login?next=${encodeURIComponent('/account')}`); return { ok: false, code: 'auth' }; }
  if (!r.res.ok || !r.data?.url) return { ok: false, code: r.data?.code ?? 'error', message: r.data?.error ?? FRIENDLY };
  window.location.assign(r.data.url);
  return { ok: true };
}
