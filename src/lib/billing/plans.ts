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

export const PLAN_VALUE = { monthly: 'pro_monthly', yearly: 'pro_yearly', lifetime: 'lifetime' } as const;
export const FREE_VALUE = 'free';
