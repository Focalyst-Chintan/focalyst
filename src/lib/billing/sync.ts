import 'server-only';
import { createAdminClient } from '@/lib/supabase-admin';
import { planForProduct, PLAN_VALUE, FREE_VALUE, PlanKey } from '@/lib/billing/plans';
import { rcGrant, rcRevoke } from '@/lib/billing/revenuecat';

export type Ev =
  | 'order.created' | 'order.updated' | 'order.paid' | 'order.refunded'
  | 'subscription.active' | 'subscription.updated' | 'subscription.uncanceled'
  | 'subscription.canceled' | 'subscription.revoked';

export async function resolveUserId(d: any): Promise<string | null> {
  const supabase = createAdminClient();

  // 1. metadata user_id
  const userIdFromMeta =
    d?.metadata?.user_id ??
    d?.metadata?.userId ??
    d?.customer?.metadata?.user_id ??
    d?.customer?.metadata?.userId;
  if (userIdFromMeta) return String(userIdFromMeta);

  // 2. externalId
  const externalId =
    d?.customer?.externalId ??
    d?.customer?.external_id ??
    d?.externalCustomerId ??
    d?.external_customer_id;
  if (externalId) return String(externalId);

  // 3. users.polar_customer_id
  const cid = d?.customerId ?? d?.customer_id ?? d?.customer?.id;
  if (cid) {
    const { data } = await supabase
      .from('users')
      .select('id')
      .eq('polar_customer_id', cid)
      .maybeSingle();
    if (data?.id) return data.id;
  }

  // 4. user_id_by_email
  const email =
    d?.customer?.email ??
    d?.customer_email ??
    d?.customerEmail ??
    d?.email;
  if (email && typeof email === 'string' && email.trim()) {
    const { data } = await supabase.rpc('user_id_by_email', {
      p_email: email.trim().toLowerCase(),
    });
    if (data) return String(data);
  }

  return null;
}

export async function applyGrantedPurchase({
  userId,
  plan,
  expiresAt,
  customerId,
  order,
  subscription,
}: {
  userId: string;
  plan: 'pro_monthly' | 'pro_yearly' | 'lifetime';
  expiresAt: string | null;
  customerId: string | null;
  order?: any;
  subscription?: any;
}) {
  const supabase = createAdminClient();

  // 1. Update users table
  const { error: userErr } = await supabase
    .from('users')
    .update({
      plan,
      plan_expires_at: expiresAt,
      billing_provider: 'polar',
      ...(customerId ? { polar_customer_id: customerId } : {}),
    })
    .eq('id', userId);

  if (userErr) {
    console.error('[polar] error updating users table:', userErr);
    throw userErr;
  }

  // Unlock promotional entitlement in RevenueCat if configured
  await rcGrant(userId, plan, expiresAt);

  // 2. Maintain subscriptions table (idempotent)
  try {
    if (plan === 'lifetime' && order) {
      const orderId = order.id ?? null;
      if (orderId) {
        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('polar_order_id', orderId)
          .maybeSingle();

        if (!existingSub) {
          const rawCreatedAt = order.createdAt ?? order.created_at;
          const startedAt = rawCreatedAt instanceof Date
            ? rawCreatedAt.toISOString()
            : (rawCreatedAt ?? new Date().toISOString());

          await supabase.from('subscriptions').insert({
            user_id: userId,
            plan: 'lifetime',
            status: 'active',
            provider: 'polar',
            polar_order_id: orderId,
            amount_paise: order.amount ?? 0,
            currency: (order.currency ?? 'INR').toUpperCase(),
            started_at: startedAt,
            expires_at: null,
          });
        }
      }
    } else if (subscription) {
      const subId = subscription.id ?? null;
      if (subId) {
        const rawStartedAt = subscription.startedAt ?? subscription.started_at ?? subscription.createdAt ?? subscription.created_at;
        const startedAt = rawStartedAt instanceof Date
          ? rawStartedAt.toISOString()
          : (rawStartedAt ?? new Date().toISOString());

        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('polar_subscription_id', subId)
          .maybeSingle();

        if (existingSub) {
          await supabase.from('subscriptions').update({
            plan,
            status: 'active',
            expires_at: expiresAt,
          }).eq('id', existingSub.id);
        } else {
          await supabase.from('subscriptions').insert({
            user_id: userId,
            plan,
            status: 'active',
            provider: 'polar',
            polar_subscription_id: subId,
            amount_paise: subscription.amount ?? 0,
            currency: (subscription.currency ?? 'INR').toUpperCase(),
            started_at: startedAt,
            expires_at: expiresAt,
          });
        }
      }
    }
  } catch (subErr) {
    console.error('[polar] error updating subscriptions table:', subErr);
  }
}

export async function applyPolarEvent(type: Ev, d: any) {
  const productId =
    d?.productId ??
    d?.product_id ??
    d?.product?.id ??
    d?.items?.[0]?.productId ??
    d?.items?.[0]?.product_id ??
    d?.items?.[0]?.product?.id;
  const customerId = d?.customerId ?? d?.customer_id ?? d?.customer?.id ?? null;
  const status = d?.status;
  const isPaid = status === 'paid' || d?.paid === true;
  const rawPeriodEnd = d?.currentPeriodEnd ?? d?.current_period_end ?? null;
  const periodEnd = rawPeriodEnd
    ? (rawPeriodEnd instanceof Date ? rawPeriodEnd.toISOString() : new Date(rawPeriodEnd).toISOString())
    : null;

  const plan = planForProduct(productId);

  console.info('[polar] event', type, 'order/sub', String(d?.id ?? '').slice(0, 8));
  console.info('[polar] product', plan ?? 'unknown');

  if (!plan) return;

  const userId = await resolveUserId(d);
  console.info('[polar] user', userId ? userId.slice(0, 8) : 'NOT FOUND');

  if (!userId) return; // 200, no retry loop

  const supabase = createAdminClient();
  const { data: row, error: readErr } = await supabase
    .from('users')
    .select('plan, plan_expires_at, billing_provider')
    .eq('id', userId)
    .maybeSingle();
  if (readErr) {
    console.error('[polar] Supabase read error:', readErr);
    throw readErr; // 500, Polar retries
  }

  const isLifetime = row?.plan === PLAN_VALUE.lifetime;

  // Never downgrade store buyers (Apple or Google)
  const { data: storeSub } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .in('provider', ['apple', 'google'])
    .in('status', ['active'])
    .maybeSingle();

  const fromStore = row?.billing_provider === 'apple' || row?.billing_provider === 'google' || Boolean(storeSub?.id);

  let update: Record<string, unknown> | null = null;

  switch (type) {
    case 'order.paid':
      if (plan === 'lifetime') update = { plan: PLAN_VALUE.lifetime, plan_expires_at: null };
      break;

    case 'order.created':
    case 'order.updated':
      if (isPaid && plan === 'lifetime') update = { plan: PLAN_VALUE.lifetime, plan_expires_at: null };
      break;

    case 'order.refunded':
      if (plan === 'lifetime' && isLifetime && !fromStore && (status === 'refunded' || d?.status === 'refunded')) {
        update = { plan: FREE_VALUE, plan_expires_at: null };
      }
      break;

    case 'subscription.active':
    case 'subscription.updated':
    case 'subscription.uncanceled':
    case 'subscription.canceled': // cancel at period end: keep Pro until current_period_end
      if (isLifetime) break;
      if (status === 'active' || status === 'trialing') {
        update = { plan: PLAN_VALUE[plan], plan_expires_at: periodEnd };
      } else if (!fromStore) {
        update = { plan: FREE_VALUE, plan_expires_at: null };
      }
      break;

    case 'subscription.revoked':
      if (!isLifetime && !fromStore) update = { plan: FREE_VALUE, plan_expires_at: null };
      break;
  }

  console.info('[polar] applied', type, update ? 'yes' : 'no change');

  if (update) {
    const grants = update.plan !== FREE_VALUE;
    if (grants) {
      await applyGrantedPurchase({
        userId,
        plan: update.plan as 'pro_monthly' | 'pro_yearly' | 'lifetime',
        expiresAt: (update.plan_expires_at as string) ?? null,
        customerId,
        order: (type === 'order.paid' || type === 'order.created' || type === 'order.updated') ? d : undefined,
        subscription: (type.startsWith('subscription.')) ? d : undefined,
      });
    } else {
      const { error: revokeErr } = await supabase
        .from('users')
        .update({
          ...update,
          ...(customerId ? { polar_customer_id: customerId } : {}),
        })
        .eq('id', userId);

      if (revokeErr) {
        console.error('[polar] error revoking users table:', revokeErr);
        throw revokeErr;
      }

      // Revoke promotional entitlement in RevenueCat if configured
      await rcRevoke(userId);

      try {
        if (type === 'order.refunded' && plan === 'lifetime') {
          const orderId = d?.id ?? null;
          if (orderId) {
            await supabase.from('subscriptions').update({
              status: 'cancelled',
              cancelled_at: new Date().toISOString(),
            }).eq('user_id', userId).eq('polar_order_id', orderId);
          }
        } else if (type === 'subscription.revoked' || type === 'subscription.canceled') {
          const subId = d?.id ?? null;
          if (subId) {
            await supabase.from('subscriptions').update({
              status: 'cancelled',
              cancelled_at: new Date().toISOString(),
            }).eq('user_id', userId).eq('polar_subscription_id', subId);
          }
        }
      } catch (subErr) {
        console.error('[polar] error updating subscriptions table for revoke/refund:', subErr);
      }
    }
  }
}
