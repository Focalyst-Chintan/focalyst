'use client';
const KEY = 'fx_checkout_intent';
export type IntentPlan = 'monthly' | 'yearly' | 'lifetime';
export function saveCheckoutIntent(plan: IntentPlan) {
  try { sessionStorage.setItem(KEY, JSON.stringify({ plan, at: Date.now() })); } catch {}
}
export function peekCheckoutIntent(): IntentPlan | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const { plan, at } = JSON.parse(raw);
    if (Date.now() - at > 30 * 60 * 1000) { sessionStorage.removeItem(KEY); return null; }
    return ['monthly', 'yearly', 'lifetime'].includes(plan) ? plan : null;
  } catch { return null; }
}
export function clearCheckoutIntent() { try { sessionStorage.removeItem(KEY); } catch {} }
