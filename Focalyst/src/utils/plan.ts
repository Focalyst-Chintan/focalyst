/** Plan values that never grant Pro, whatever their expiry says. */
const FREE_PLANS = new Set(['', 'free', 'none', 'expired', 'cancelled', 'canceled', 'inactive']);
/** Plans (or statuses) that grant Pro forever, so a leftover expiry date is ignored. */
const PERMANENT_PLANS = new Set(['lifetime']);

/**
 * Single source of truth for "is this account Pro". Case-insensitive, so 'Lifetime', 'PRO' and
 * 'pro' agree. Paid plans (pro, active, monthly, yearly, ...) count until `plan_expires_at`;
 * lifetime counts forever.
 */
export function isProPlan(plan: string | null | undefined, expiresAt?: string | null, now = Date.now()): boolean {
  const p = (plan ?? '').trim().toLowerCase();
  if (FREE_PLANS.has(p)) return false;
  if (PERMANENT_PLANS.has(p)) return true;
  if (!expiresAt) return true;
  const end = new Date(expiresAt).getTime();
  return Number.isNaN(end) || end >= now;
}

/** True for the plan string that should read "LIFETIME" in the profile's plan card. */
export const isLifetimePlan = (plan: string | null | undefined) => (plan ?? '').trim().toLowerCase() === 'lifetime';
