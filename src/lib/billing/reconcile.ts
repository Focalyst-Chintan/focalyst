import 'server-only';
import { type User } from '@supabase/supabase-js';
import { polar, PolarError } from '@/lib/billing/polar';
import { planForProduct, PLAN_VALUE } from '@/lib/billing/plans';
import { createAdminClient } from '@/lib/supabase-admin';
import { applyGrantedPurchase } from '@/lib/billing/sync';
import { rcGrant } from '@/lib/billing/revenuecat';

export interface ReconcileResult {
  changed: boolean;
  plan?: string;
  reason?: string;
}

const PLAN_RANKS: Record<string, number> = {
  free: 0,
  pro_monthly: 1,
  pro_yearly: 2,
  lifetime: 3,
};

export async function reconcileUser(user: User): Promise<ReconcileResult> {
  const supabase = createAdminClient();
  const { data: userRow, error: userErr } = await supabase
    .from('users')
    .select('plan, plan_expires_at, polar_customer_id')
    .eq('id', user.id)
    .maybeSingle();

  if (userErr) {
    console.error('[reconcile] error reading user:', userErr);
    throw userErr;
  }

  const currentPlan = userRow?.plan ?? 'free';
  if (currentPlan === 'lifetime') {
    return { changed: false, plan: 'lifetime' };
  }

  // 1. Find the Polar customer: external ID, users.polar_customer_id, metadata user_id, or email (Google/Apple only)
  let customer: any = null;
  try {
    customer = await polar<any>(`/v1/customers/external/${encodeURIComponent(user.id)}`);
  } catch (err) {
    if (err instanceof PolarError && err.status === 404) {
      customer = null;
    } else {
      throw err;
    }
  }

  if (!customer && userRow?.polar_customer_id) {
    try {
      customer = await polar<any>(`/v1/customers/${encodeURIComponent(userRow.polar_customer_id)}`);
    } catch (err) {
      if (err instanceof PolarError && err.status === 404) {
        customer = null;
      } else {
        throw err;
      }
    }
  }

  if (!customer && user.id) {
    try {
      const list = await polar<{ items: any[] }>(`/v1/customers/`, {
        query: { 'metadata[user_id]': user.id },
      });
      if (list?.items?.length) {
        customer = list.items[0];
      }
    } catch (err) {
      if (err instanceof PolarError && err.status === 404) {
        customer = null;
      } else {
        throw err;
      }
    }
  }

  const isOAuthUser =
    Boolean(user.identities?.some((id: any) => id.provider === 'google' || id.provider === 'apple')) ||
    user.app_metadata?.provider === 'google' ||
    user.app_metadata?.provider === 'apple';

  if (!customer && isOAuthUser && user.email) {
    const list = await polar<{ items: any[] }>(`/v1/customers/`, {
      query: { email: user.email },
    });
    if (list?.items?.length) {
      customer = list.items[0];
    }
  }

  // 2. If no customer is found
  if (!customer) {
    return { changed: false, reason: 'no_customer' };
  }

  const customerId = customer.id;

  // 3. GET /v1/orders/ with customer_id={id} (limit 100)
  const ordersRes = await polar<{ items: any[] }>(`/v1/orders/`, {
    query: { customer_id: customerId, limit: '100' },
  });

  let targetPlan: 'pro_monthly' | 'pro_yearly' | 'lifetime' | null = null;
  let targetExpiresAt: string | null = null;
  let candidateOrder: any = null;
  let candidateSub: any = null;

  const orders = ordersRes?.items ?? [];
  for (const o of orders) {
    const prodId = o.productId ?? o.product_id ?? o.product?.id;
    const plan = planForProduct(prodId);
    const isPaid = o.status === 'paid' || o.paid === true;
    const isRefunded = o.status === 'refunded' || Boolean(o.refunded_at ?? o.refundedAt);
    if (plan === 'lifetime' && isPaid && !isRefunded) {
      targetPlan = 'lifetime';
      targetExpiresAt = null;
      candidateOrder = o;
      break;
    }
  }

  // 4. Otherwise GET /v1/subscriptions/ with customer_id={id} and active=true
  if (!targetPlan) {
    const subsRes = await polar<{ items: any[] }>(`/v1/subscriptions/`, {
      query: { customer_id: customerId, active: 'true' },
    });
    const subs = subsRes?.items ?? [];
    for (const s of subs) {
      const prodId = s.productId ?? s.product_id ?? s.product?.id;
      const plan = planForProduct(prodId);
      const isActive = s.status === 'active' || s.status === 'trialing';
      if ((plan === 'monthly' || plan === 'yearly') && isActive) {
        targetPlan = PLAN_VALUE[plan];
        const rawPeriodEnd = s.currentPeriodEnd ?? s.current_period_end ?? null;
        targetExpiresAt = rawPeriodEnd
          ? (rawPeriodEnd instanceof Date ? rawPeriodEnd.toISOString() : new Date(rawPeriodEnd).toISOString())
          : null;
        candidateSub = s;
        break;
      }
    }
  }

  // 5. Only ever UPGRADE here
  if (!targetPlan) {
    return { changed: false, plan: currentPlan };
  }

  const currentRank = PLAN_RANKS[currentPlan] ?? 0;
  const targetRank = PLAN_RANKS[targetPlan] ?? 0;

  if (targetRank <= currentRank) {
    return { changed: false, plan: currentPlan };
  }

  await applyGrantedPurchase({
    userId: user.id,
    plan: targetPlan,
    expiresAt: targetExpiresAt,
    customerId,
    order: candidateOrder,
    subscription: candidateSub,
  });

  return { changed: true, plan: targetPlan };
}
